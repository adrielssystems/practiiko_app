import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const getPhoneId = () => process.env.WHATSAPP_PHONE_ID; // Ej. 584248948664
const getApiKey = () => process.env.YCLOUD_API_KEY;

// --- FUNCIONES DE ENVÍO DE YCLOUD ---

async function sendWhatsAppMessage(to, text) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;
  
  try {
    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify({
        from: phoneId,
        to: to,
        type: "text",
        text: { body: text }
      })
    });
    const data = await response.json();
    if (data.errorCode) console.error("[WHATSAPP SEND ERROR]:", data);
    return data;
  } catch (error) {
    console.error("[WHATSAPP SEND EXCEPTION]:", error);
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

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
      image: { link: mediaPayload }
    };

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payloadBody)
    });
    
    const data = await response.json();
    if (data.errorCode) {
      console.error(`[WHATSAPP IMAGE SEND ERROR]`, data);
      await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló envío de imagen.`);
      return null;
    }
    return data;
  } catch (error) {
    console.error("[WHATSAPP IMAGE SEND EXCEPTION]:", error);
  }
}

// NUEVA FUNCION: Enviar Menú Interactivo de 3 botones (Fase 2)
async function sendInteractiveMenu(to) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    const payload = {
      from: phoneId,
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Para atenderte lo más rápido, dinos... ¿Qué quieres ver?" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "btn_sofas", title: "SOFAS COMPRIMIDOS" } },
            { type: "reply", reply: { id: "btn_colchones", title: "COLCHONES" } },
            { type: "reply", reply: { id: "btn_velas", title: "VELAS PERLADAS" } }
          ]
        }
      }
    };

    await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("[WHATSAPP INTERACTIVE ERROR]:", error);
  }
}

// NUEVA FUNCION: Enviar Video o Audio (Fase 3 Ruta A)
async function sendMediaFile(to, type, mediaUrl) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    const payload = {
      from: phoneId,
      to: to,
      type: type,
      [type]: { link: mediaUrl }
    };
    
    console.log(`[YCLOUD DEBUG] Enviando ${type.toUpperCase()} a ${to}. Payload:`, JSON.stringify(payload));

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log(`[YCLOUD DEBUG] Respuesta de YCloud para ${type.toUpperCase()}:`, JSON.stringify(data));
    if (data.errorCode || !response.ok) {
      console.error(`[WHATSAPP ${type.toUpperCase()} ERROR]:`, data);
    }
    return data;
  } catch (error) {
    console.error(`[WHATSAPP ${type.toUpperCase()} EXCEPTION]:`, error);
  }
}

// NUEVA FUNCION: Enviar Plantilla de Carrusel (Fase 3 Ruta B)
async function sendTemplate(to, templateName, components = null) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) {
    console.error("[WHATSAPP TEMPLATE] Faltan credenciales (phoneId o token).");
    return;
  }

  try {
    const templateObj = {
      name: templateName,
      language: { code: "es" }
    };
    
    if (components && components.length > 0) {
      templateObj.components = components;
    }

    const payload = {
      from: phoneId,
      to: to,
      type: "template",
      template: templateObj
    };
    
    console.log(`[YCLOUD DEBUG] Enviando Plantilla '${templateName}' a ${to}. Payload:`, JSON.stringify(payload));

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log(`[YCLOUD DEBUG] Respuesta de YCloud para plantilla '${templateName}':`, JSON.stringify(data));
    
    if (data.errorCode || !response.ok) {
      console.error(`[WHATSAPP TEMPLATE ERROR - ${templateName}]:`, data);
    }
  } catch (error) {
    console.error(`[WHATSAPP TEMPLATE EXCEPTION]:`, error);
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

export async function POST(req) {
  try {
    const body = await req.json();

    // Loguear el webhook
    await query("INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)", ['whatsapp_ycloud', JSON.stringify(body)]);

    if (body.type === "whatsapp.inbound_message.received") {
      const wim = body.whatsappInboundMessage;
      if (!wim) return NextResponse.json({ status: "success" });

      const senderNumber = wim.from.replace('+', ''); // Quitar el '+' para la DB
      const messageData = wim; 
      const pushName = wim.customerProfile?.name || "Cliente WhatsApp";

      // 1. Extraer texto o botones interactivos
      let userMessage = "";
      let interactiveId = null;
      let isImage = false;
      
      if (messageData.type === "text") {
        userMessage = messageData.text?.body || "";
      } else if (messageData.type === "button") {
        // Botones de respuesta rápida de una Plantilla de Meta
        userMessage = messageData.button?.text || "";
        interactiveId = messageData.button?.payload || null;
      } else if (messageData.type === "interactive") {
        if (messageData.interactive?.type === "button_reply") {
          userMessage = messageData.interactive.button_reply.title;
          interactiveId = messageData.interactive.button_reply.id;
        } else if (messageData.interactive?.type === "list_reply") {
          userMessage = messageData.interactive.list_reply.title;
          interactiveId = messageData.interactive.list_reply.id;
        }
      } else if (messageData.type === "image" || messageData.type === "video") {
        isImage = true;
        userMessage = `[Multimedia: ${messageData.type}]`;
      } else {
        userMessage = `[Multimedia/Otro formato: ${messageData.type}]`;
      }

      if (!userMessage && !isImage) return NextResponse.json({ status: "no_text" });

      console.log(`[WHATSAPP] Mensaje de ${pushName} (${senderNumber}): ${userMessage} (ID: ${interactiveId || 'N/A'})`);

      // 2. Guardar/Actualizar cliente
      await query(
        `INSERT INTO whatsapp_customers (id, full_name, last_seen) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET last_seen = NOW()`,
        [senderNumber, pushName]
      );

      // 3. GUARDAR MENSAJE DEL USUARIO
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [senderNumber, JSON.stringify({ role: 'user', content: userMessage })]
      );

      // 4. Verificar Breaker Global y Bot Pausado
      const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
      const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;
      const customerRes = await query("SELECT ai_enabled, followup_status FROM whatsapp_customers WHERE id = $1", [senderNumber]);
      const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;
      
      if (!isGlobalEnabled || !isAiEnabled) {
        return NextResponse.json({ status: "paused" });
      }

      // ==========================================
      // 🚀 FUNNEL STATE MACHINE (MÁQUINA DE ESTADOS)
      // ==========================================

      // A) EVALUAR INTERCEPTACIÓN POR BOTONES O COMANDOS DE PRUEBA (FASE 3)
      if (interactiveId || userMessage) {
        const msgText = userMessage.toUpperCase().trim();
        
        // 🧪 COMANDOS DE PRUEBA DIRECTOS
        if (msgText === "TESTAUDIO" || msgText === "AUDIO") {
          console.log(`[TEST] Enviando audio de prueba voice_beneficios.mp3 a ${senderNumber}`);
          const res = await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_beneficios.mp3");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Audio de prueba 'voice_beneficios.mp3' enviado." })]);
          return NextResponse.json({ status: "test_audio_sent", result: res });
        }

        if (msgText === "TESTVIDEO" || msgText === "VIDEO") {
          console.log(`[TEST] Enviando video de prueba benef2.mp4 a ${senderNumber}`);
          const res = await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/benef2.mp4");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Video de prueba 'benef2.mp4' enviado." })]);
          return NextResponse.json({ status: "test_video_sent", result: res });
        }

        if (interactiveId === "btn_sofas" || msgText.includes("SOFAS COMPRIMIDOS") || msgText === "SOFÁS" || msgText === "SOFAS") {
          const responseMsg = "[Sistema] Envió beneficios y plantilla 'krrusel_a' (Sofás).";
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: responseMsg })]);
          
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/benef2.mp4");
          await delay(2500);
          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_beneficios.mp3");
          await delay(2500);

          await sendTemplate(senderNumber, "krrusel_a");
          return NextResponse.json({ status: "funnel_ruta_a_sofas" });

        } else if (interactiveId === "btn_colchones" || msgText.includes("COLCHONES")) {
          const responseMsg = "[Sistema] Envió beneficios y plantilla 'krrusel_a_c' (Colchones).";
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: responseMsg })]);
          
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/benef2.mp4");
          await delay(2500);
          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_beneficios.mp3");
          await delay(2500);

          await sendTemplate(senderNumber, "krrusel_a_c");
          return NextResponse.json({ status: "funnel_ruta_a_colchones" });

        } else if (interactiveId === "btn_velas" || msgText.includes("VELAS PERLADAS") || msgText.includes("VELAS")) {
          const responseMsg = "[Sistema] Envió beneficios y plantilla 'krrusel_a_v' (Velas Perladas).";
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: responseMsg })]);
          
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/benef2.mp4");
          await delay(2500);
          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_beneficios.mp3");
          await delay(2500);

          await sendTemplate(senderNumber, "krrusel_a_v");
          return NextResponse.json({ status: "funnel_ruta_b_velas" });

        } else if (
          (interactiveId && (interactiveId.includes("asesor") || interactiveId.includes("contactar"))) ||
          msgText.includes("CONTACTAR A UN ASESOR") ||
          msgText.includes("CONTACTAR ASESOR") ||
          msgText.includes("ASESOR")
        ) {
          const replyText = "Entendido, en la brevedad posible uno de nuestros asesores lo contactara!";
          await sendWhatsAppMessage(senderNumber, replyText);
          await query(
            `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
            [senderNumber, JSON.stringify({ role: 'assistant', content: replyText })]
          );
          // Pausar IA y marcar que requiere asesor humano
          await query(
            `UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1`,
            [senderNumber]
          );
          return NextResponse.json({ status: "funnel_contactar_asesor" });

        } else if (
          (interactiveId && (interactiveId.includes("info") || interactiveId.includes("mas_info") || interactiveId.includes("catalogo"))) ||
          msgText.includes("MAS INFORMACION") ||
          msgText.includes("MÁS INFORMACIÓN") ||
          msgText.includes("MAS INFORMACIÓN") ||
          msgText.includes("MÁS INFORMACION")
        ) {
          const replyText = "Con gusto. Puede explorar todos nuestros modelos, medidas y precios directamente en nuestro catálogo oficial:\nhttps://www.practiiko.com/catalogo";
          await sendWhatsAppMessage(senderNumber, replyText);
          await query(
            `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
            [senderNumber, JSON.stringify({ role: 'assistant', content: replyText })]
          );
          return NextResponse.json({ status: "funnel_mas_informacion" });
        }
      }

      // B) EVALUAR INTERCEPTACIÓN DE PRIMER CONTACTO (FASE 2)
      // Cargamos el historial corto para saber si es el primer mensaje de la sesión actual
      const historyRes = await query(`SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`, [senderNumber]);
      const mNorm = userMessage.toLowerCase().trim();
      let isFirstContact = false;
      
      const hasAssistantMsg = historyRes.rows.some(r => {
        try {
          const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
          return msg && msg.role === 'assistant';
        } catch(e) { return false; }
      });

      // Si es su primer mensaje (el bot nunca le ha respondido), o manda "menu", o viene de Instagram, lanzamos la bienvenida
      if (!hasAssistantMsg || mNorm === "menu" || mNorm.includes("hola") || mNorm.includes("quiero transformar mi hogar")) {
        isFirstContact = true;
      }

      if (isFirstContact) {
        await delay(1500); // Retraso simulado
        
        // La plantilla 'welcome' exige un header de imagen
        const headerComponent = [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: { link: "https://www.practiiko.com/logo-p.jpeg" } // Logo público en la web - siempre accesible por Meta
              }
            ]
          }
        ];
        
        await sendTemplate(senderNumber, "welcome", headerComponent);
        
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Plantilla 'welcome' enviada." })]);
        return NextResponse.json({ status: "funnel_fase2_template" });
      }

      // ==========================================
      // MENSAJES LIBRES NO CUBIERTOS: REORIENTAR AL FLUJO DETERMINISTA
      // (Se desconectó DeepSeek/Gemini a petición de la dirección de la empresa)
      // ==========================================
      await delay(1000);
      const headerComponent = [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: "https://www.practiiko.com/logo-p.jpeg" }
            }
          ]
        }
      ];
      await sendTemplate(senderNumber, "welcome", headerComponent);
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Reorientación: Plantilla 'welcome' enviada." })]
      );
      return NextResponse.json({ status: "funnel_reorient_welcome" });
      
    } else if (body.type === "whatsapp.message.echo" || (body.whatsappInboundMessage?.data?.type === "smb_message_echoes")) {
      const wim = body.whatsappInboundMessage || body.message;
      if (wim && wim.to) {
        const customerNumber = wim.to.replace('+', '');
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [customerNumber, JSON.stringify({ role: 'assistant', content: "[Asesor intervino desde App Móvil (YCloud)]", manual: true })]);
        await query(`UPDATE whatsapp_customers SET ai_enabled = false WHERE id = $1`, [customerNumber]);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[WHATSAPP YCLOUD WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
