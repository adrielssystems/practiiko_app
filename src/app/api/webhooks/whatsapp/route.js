import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processWhatsappMessage } from "@/lib/ai/whatsappAgent";

export const dynamic = "force-dynamic";

const whatsappDebounceMap = new Map();

const getPhoneId = () => process.env.WHATSAPP_PHONE_ID; // Ej. 584248948664
const getApiKey = () => process.env.YCLOUD_API_KEY;

async function sendWhatsAppMessage(to, text) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  
  if (!phoneId || !token) {
    console.error("[WHATSAPP YCLOUD ERROR]: Falta WHATSAPP_PHONE_ID o YCLOUD_API_KEY.");
    return;
  }
  
  try {
    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': token
      },
      body: JSON.stringify({
        from: phoneId,
        to: to,
        type: "text",
        text: {
          body: text
        }
      })
    });
    const data = await response.json();
    if (data.errorCode) {
      console.error("[WHATSAPP SEND ERROR]:", data);
    }
    return data;
  } catch (error) {
    console.error("[WHATSAPP SEND EXCEPTION]:", error);
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  
  if (!phoneId || !token) {
    console.error("[WHATSAPP YCLOUD ERROR]: Falta WHATSAPP_PHONE_ID o YCLOUD_API_KEY.");
    return;
  }

  try {
    let mediaPayload = imageUrl;
    
    if (imageUrl.includes("/api/media/")) {
      const parts = imageUrl.split('/');
      const originalFilename = parts[parts.length - 1];
      const filenameJpg = originalFilename.replace(/\.webp$/i, '.jpeg');
      mediaPayload = `https://auto.practiiko.com/api/media/${filenameJpg}`;
    }

    const payloadBody = {
      from: phoneId,
      to: to,
      type: "image",
      image: {
        link: mediaPayload
      }
    };

    console.log(`[WHATSAPP] Enviando imagen via URL pública dinámica a ${to}: ${mediaPayload}`);

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': token
      },
      body: JSON.stringify(payloadBody)
    });
    
    const data = await response.json();
    if (data.errorCode) {
      console.error(`[WHATSAPP IMAGE SEND ERROR]`, data);
      await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló envío de imagen. API rechazó el enlace.`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[WHATSAPP IMAGE SEND EXCEPTION]:", error);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    console.log("=========================================");
    console.log("[WEBHOOK WA INTRANTE - YCLOUD] Payload recibido:");
    console.log(JSON.stringify(body, null, 2));
    console.log("=========================================");

    // Loguear el webhook
    await query("INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)", ['whatsapp_ycloud', JSON.stringify(body)]);

    // Procesar evento de mensaje entrante (cliente -> negocio)
    if (body.type === "whatsapp.inbound_message.received") {
      const wim = body.whatsappInboundMessage;
      if (!wim) return NextResponse.json({ status: "success" });

      const senderNumber = wim.from; // Número del cliente
      const messageData = wim.data; // Metadata oficial del Graph API que viene embebida en Ycloud

      // 1. Extraer texto o imagen
      let userMessage = "";
      let isImage = false;
      
      if (messageData.type === "text") {
        userMessage = messageData.text?.body || "";
      } else if (messageData.type === "image") {
        isImage = true;
        userMessage = messageData.image?.caption || "[Imagen]";
      } else if (messageData.type === "interactive") {
        if (messageData.interactive?.type === "button_reply") {
          userMessage = messageData.interactive.button_reply.title || messageData.interactive.button_reply.id;
        } else if (messageData.interactive?.type === "list_reply") {
          userMessage = messageData.interactive.list_reply.title || messageData.interactive.list_reply.id;
        }
      } else if (messageData.type === "video") {
        isImage = true;
        userMessage = messageData.video?.caption || "[Video]";
      } else {
        userMessage = `[Multimedia/Otro formato: ${messageData.type}]`;
      }

      if (isImage) {
        const mNorm = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const triggersHumanOrBuy = 
          mNorm.includes("asesor") || mNorm.includes("humano") || mNorm.includes("persona") || mNorm.includes("atenderme") || mNorm.includes("hablar con alguien") ||
          mNorm.includes("comprar") || mNorm.includes("pagar") || mNorm.includes("transferencia") || mNorm.includes("pago") || mNorm.includes("deposito") || mNorm.includes("cuenta") || mNorm.includes("quiero") || mNorm.includes("llevar") || mNorm.includes("zelle");

        if (!triggersHumanOrBuy) {
          userMessage = `[${messageData.type === 'video' ? 'Video' : 'Imagen'}]`;
        }
      }

      if (!userMessage && !isImage) return NextResponse.json({ status: "no_text" });

      // YCloud no siempre incluye contactos en el Inbound Message payload de manera directa, 
      // usaremos fallback.
      const pushName = "Cliente WhatsApp";

      console.log(`[WHATSAPP] Mensaje de ${pushName} (${senderNumber}): ${userMessage}`);

      // 2. Guardar/Actualizar cliente
      await query(
        `INSERT INTO whatsapp_customers (id, full_name, last_seen) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET last_seen = NOW()`,
        [senderNumber, pushName]
      );

      // 3. GUARDAR MENSAJE DEL USUARIO INMEDIATAMENTE
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [senderNumber, JSON.stringify({ role: 'user', content: userMessage })]
      );

      // 4. Verificar Breaker Global
      const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
      const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;
      
      const TEST_NUMBERS = [];
      const isTester = TEST_NUMBERS.includes(senderNumber);

      if (!isGlobalEnabled && !isTester) {
        console.log(`[WHATSAPP] BREAKER GLOBAL ACTIVADO. IA pausada.`);
        return NextResponse.json({ status: "global_paused" });
      }

      // 5. Verificar si el bot está pausado individualmente
      const customerRes = await query("SELECT ai_enabled, followup_status FROM whatsapp_customers WHERE id = $1", [senderNumber]);
      const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;
      const followupStatus = customerRes.rows[0]?.followup_status ?? 'none';

      if (!isAiEnabled) {
        console.log(`[WHATSAPP] Bot pausado para ${senderNumber}.`);
        return NextResponse.json({ status: "bot_paused" });
      }

      // --- INTERCEPCIÓN DE RESPUESTA A SEGUIMIENTO ---
      if (followupStatus === 'sent') {
        console.log(`[WHATSAPP] Cliente ${senderNumber} respondió al seguimiento. Pausando bot.`);
        
        await query(
          "UPDATE whatsapp_customers SET followup_status = 'replied', ai_enabled = false, requires_human = true WHERE id = $1",
          [senderNumber]
        );

        const notifyText = `🚨 RESPUESTA A SEGUIMIENTO\n\n*Canal:* WHATSAPP\n*Cliente:* ${pushName} (+${senderNumber})\n*Mensaje:* "${userMessage}"\n\n👇 Responde aquí:\nhttps://auto.practiiko.com/whatsapp/${senderNumber}`;
        const adminPhone = "584248068515";
        const groupId = process.env.NOTIFICATIONS_GROUP_ID;

        try {
          await sendWhatsAppMessage(adminPhone, notifyText);
          if (groupId) {
            await sendWhatsAppMessage(groupId, notifyText);
          }
        } catch (e) {
          console.error("Error notificando respuesta a seguimiento WA:", e);
        }

        return NextResponse.json({ status: "followup_replied_takeover" });
      }

      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "auto.practiiko.com";
      let baseUrl = `${protocol}://${host}`;
      if (baseUrl.includes("localhost") || baseUrl.includes("practiiko_app") || baseUrl.includes("127.0.0.1") || baseUrl.includes("::1")) {
        baseUrl = "https://auto.practiiko.com";
      }

      // 6. Procesar con IA y responder (con debounce de 5 segundos)
      let debounceState = whatsappDebounceMap.get(senderNumber);
      if (debounceState) {
        clearTimeout(debounceState.timer);
        debounceState.messages.push(userMessage);
        debounceState.pushName = pushName;
        debounceState.baseUrl = baseUrl;
      } else {
        debounceState = {
          messages: [userMessage],
          pushName,
          baseUrl,
          timer: null
        };
        whatsappDebounceMap.set(senderNumber, debounceState);
      }

      debounceState.timer = setTimeout(async () => {
        whatsappDebounceMap.delete(senderNumber);
        
        const combinedMessage = debounceState.messages.join(" ").trim();
        
        try {
          const aiResponse = await processWhatsappMessage(combinedMessage, senderNumber, debounceState.pushName, debounceState.baseUrl);
          
          if (aiResponse.ignored) return;

          await sendWhatsAppMessage(senderNumber, aiResponse.text);
          
          if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
            for (const imgUrl of aiResponse.imageUrls) {
              await sendWhatsAppImage(senderNumber, imgUrl);
            }
          }
        } catch (e) {
          console.error("[ERROR WHATSAPP AI]:", e);
        }
      }, 5000);
      
    } else if (body.type === "whatsapp.message.echo" || (body.whatsappInboundMessage && body.whatsappInboundMessage.data && body.whatsappInboundMessage.data.type === "smb_message_echoes")) {
      // Intentamos atrapar los ecos de coexistencia si Ycloud los retransmite.
      // YCloud docs dicen que los ecos usualmente caen como un webhook distinto si los habilitas
      console.log(`[WHATSAPP COEXISTENCIA YCLOUD] Echo capturado. Pausando bot.`);
      const wim = body.whatsappInboundMessage || body.message;
      if (wim && wim.to) {
        const customerNumber = wim.to; // En echo el destinatario es el cliente
        await query(
          `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
          [customerNumber, JSON.stringify({ role: 'assistant', content: "[Asesor intervino desde App Móvil (YCloud)]", manual: true })]
        );
        await query(
          `UPDATE whatsapp_customers SET ai_enabled = false WHERE id = $1`,
          [customerNumber]
        );
      }
    }

    // YCloud exige retornar 200 inmediatamente.
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[WHATSAPP YCLOUD WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
