import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processWhatsappMessage } from "@/lib/ai/whatsappAgent";

export const dynamic = "force-dynamic";

const whatsappDebounceMap = new Map();

// Configuración de Meta Cloud API
const getPhoneId = () => process.env.WHATSAPP_PHONE_ID;
const getAccessToken = () => process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;

async function sendWhatsAppMessage(to, text) {
  const phoneId = getPhoneId();
  const token = getAccessToken();
  
  if (!phoneId || !token) {
    console.error("[WHATSAPP CLOUD ERROR]: Falta WHATSAPP_PHONE_ID o WHATSAPP_CLOUD_ACCESS_TOKEN.");
    return;
  }
  
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: true,
          body: text
        }
      })
    });
    const data = await response.json();
    if (data.error) {
      console.error("[WHATSAPP SEND ERROR]:", data.error);
    }
    return data;
  } catch (error) {
    console.error("[WHATSAPP SEND EXCEPTION]:", error);
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  const phoneId = getPhoneId();
  const token = getAccessToken();
  
  if (!phoneId || !token) {
    console.error("[WHATSAPP CLOUD ERROR]: Falta WHATSAPP_PHONE_ID o WHATSAPP_CLOUD_ACCESS_TOKEN.");
    return;
  }

  try {
    let mediaPayload = imageUrl;
    
    // Si es una imagen local servida por nuestra API de media, nos aseguramos de que termine en .jpeg o .png para Meta
    // Meta Cloud API no soporta WebP para imágenes estándar (solo para stickers).
    if (imageUrl.includes("/api/media/")) {
      const parts = imageUrl.split('/');
      const originalFilename = parts[parts.length - 1];
      const filenameJpg = originalFilename.replace(/\.webp$/i, '.jpeg');
      mediaPayload = `https://auto.practiiko.com/api/media/${filenameJpg}`;
    }

    const payloadBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "image",
      image: {
        link: mediaPayload
      }
    };

    console.log(`[WHATSAPP] Enviando imagen via URL pública dinámica a ${to}: ${mediaPayload}`);

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payloadBody)
    });
    
    const data = await response.json();
    if (data.error) {
      console.error(`[WHATSAPP IMAGE SEND ERROR]`, data.error);
      await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló envío de imagen. Meta API rechazó el enlace.`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[WHATSAPP IMAGE SEND EXCEPTION]:", error);
  }
}

// GET: Verificación de Webhook para Meta (WhatsApp Cloud API)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log(`[DEBUG WA] Validando Webhook. Recibido: ${token}, Esperado: ${VERIFY_TOKEN}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Loguear el webhook
    await query("INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)", ['whatsapp_cloud', JSON.stringify(body)]);

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const value = change.value;
            
            // Ignorar notificaciones de estado (enviado, entregado, leído)
            if (value.statuses) {
              continue;
            }

            if (value.messages && value.messages.length > 0) {
              const messageData = value.messages[0];
              const senderNumber = messageData.from; // Número del cliente
              
              // 1. Extraer texto o imagen
              let userMessage = "";
              let isImage = false;
              
              if (messageData.type === "text") {
                userMessage = messageData.text?.body || "";
              } else if (messageData.type === "image") {
                isImage = true;
                userMessage = messageData.image?.caption || "[Imagen]";
              } else if (messageData.type === "interactive") {
                // Si usan botones
                if (messageData.interactive.type === "button_reply") {
                  userMessage = messageData.interactive.button_reply.title || messageData.interactive.button_reply.id;
                } else if (messageData.interactive.type === "list_reply") {
                  userMessage = messageData.interactive.list_reply.title || messageData.interactive.list_reply.id;
                }
              } else if (messageData.type === "video") {
                isImage = true; // Tratamos video igual que imagen para los triggers
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

              const pushName = value.contacts && value.contacts.length > 0 ? value.contacts[0].profile?.name : "Cliente WhatsApp";

              console.log(`[WHATSAPP] Mensaje de ${pushName} (${senderNumber}): ${userMessage}`);

              // 2. Guardar/Actualizar cliente
              await query(
                `INSERT INTO whatsapp_customers (id, full_name, last_seen) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET full_name = $2, last_seen = NOW()`,
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
              
              const TEST_NUMBERS = []; // Whitelist
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

                  // Enviar a WhatsApp
                  await sendWhatsAppMessage(senderNumber, aiResponse.text);
                  
                  // Enviar imágenes si las hay
                  if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
                    for (const imgUrl of aiResponse.imageUrls) {
                      await sendWhatsAppImage(senderNumber, imgUrl);
                    }
                  }
                } catch (e) {
                  console.error("[ERROR WHATSAPP AI]:", e);
                }
              }, 5000);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[WHATSAPP WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
