import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { processInstagramMessage } from "@/lib/ai/instagramAgent";
import { query } from "@/lib/db";

const instagramDebounceMap = new Map();

// GET: Verificación de Webhook para Meta (Instagram)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

  console.log(`[DEBUG] Validando Webhook. Recibido: ${token}, Esperado: ${VERIFY_TOKEN}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST: Recepción de mensajes y comentarios de Instagram
export async function POST(req) {
  try {
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "auto.practiiko.com";
    let baseUrl = `${protocol}://${host}`;
    // Evitar que URLs locales o de red interna docker se usen para las fotos de Meta Graph API
    if (baseUrl.includes("localhost") || baseUrl.includes("practiiko_app") || baseUrl.includes("127.0.0.1") || baseUrl.includes("::1")) {
      baseUrl = "https://auto.practiiko.com";
    }

    const body = await req.json();

    // Loguear el evento completo para depuración en el panel
    await query(
      "INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)",
      [body.object || 'unknown', JSON.stringify(body)]
    );

    if (body.object === "instagram") {
      for (const entry of body.entry) {
        // --- 1. PROCESAR MENSAJES (DMs) ---
        if (entry.messaging) {
          const pageId = entry.id; // El ID de la página de Practiiko

          for (const messaging of entry.messaging) {
            const senderId = messaging.sender?.id;

            // IGNORAR REACCIONES A MENSAJES (DMs)
            if (messaging.reaction) {
              console.log("[WEBHOOK] Reacción a mensaje detectada. Ignorando.");
              continue;
            }

            // --- AUTO-TAKEOVER & GUARDADO DE MENSAJES DE ASESORES ---
            // Si el remitente es la misma página (eco) o is_echo es true
            if (senderId === pageId || messaging.message?.is_echo === true) {
              const recipientId = messaging.recipient?.id;
              let outMessage = messaging.message?.text || "";
              const isOutImage = messaging.message?.attachments?.some(att => att.type === 'image');
              
              if (isOutImage && !outMessage) outMessage = "[Imagen/Media enviada por asesor]";

              if (outMessage && recipientId) {
                 // Verificar si la IA envió exactamente este mensaje en el último minuto (es un eco de la API)
                 const recentMsg = await query(
                   `SELECT id FROM instagram_messages 
                    WHERE session_id = $1 
                    AND message->>'role' = 'assistant' 
                    AND message->>'content' = $2 
                    AND created_at >= NOW() - INTERVAL '1 minute'`,
                   [recipientId, outMessage]
                 );

                 if (recentMsg.rowCount === 0) {
                    // Es un mensaje nuevo de un humano enviado directamente desde la app
                    await query(
                      `INSERT INTO instagram_messages (session_id, message, source) VALUES ($1, $2, 'dm')`,
                      [recipientId, JSON.stringify({ role: 'assistant', content: outMessage })]
                    );
                    // Auto-pausar el bot para ceder el control al asesor
                    await query(
                      `UPDATE instagram_customers SET ai_enabled = false WHERE id = $1`,
                      [recipientId]
                    );
                    console.log(`[INSTAGRAM DM] Intervención humana detectada hacia ${recipientId}. Bot pausado y mensaje saliente guardado en dashboard.`);
                 }
              }
              continue;
            }

            const isImageAttachment = messaging.message?.attachments?.some(att => att.type === 'image');

            if (messaging.message?.text || isImageAttachment) {
              let userMessage = messaging.message?.text || "";

              if (isImageAttachment) {
                const mNorm = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const triggersHumanOrBuy = 
                  mNorm.includes("asesor") || mNorm.includes("humano") || mNorm.includes("persona") || mNorm.includes("atenderme") || mNorm.includes("hablar con alguien") ||
                  mNorm.includes("comprar") || mNorm.includes("pagar") || mNorm.includes("transferencia") || mNorm.includes("pago") || mNorm.includes("deposito") || mNorm.includes("cuenta") || mNorm.includes("quiero") || mNorm.includes("llevar") || mNorm.includes("zelle");

                if (!triggersHumanOrBuy) {
                  userMessage = "[Imagen]";
                }
              }
              console.log(`[INSTAGRAM DM] Nuevo mensaje de ${senderId}: ${userMessage}`);

              // Obtener info del usuario y guardar en DB
              const userInfo = await getInstagramUserInfo(senderId);
              if (userInfo) {
                await query(
                  `INSERT INTO instagram_customers (id, username, full_name, last_seen) 
                   VALUES ($1, $2, $3, NOW()) 
                   ON CONFLICT (id) DO UPDATE SET username = $2, full_name = $3, last_seen = NOW()`,
                  [senderId, userInfo.username, userInfo.name || userInfo.username]
                );
              }

              // 0. GUARDAR MENSAJE DEL USUARIO INMEDIATAMENTE
              await query(
                `INSERT INTO instagram_messages (session_id, message, source) VALUES ($1, $2, $3)`,
                [senderId, JSON.stringify({ role: 'user', content: userMessage }), 'dm']
              );

              // 1. Verificar Breaker Global
              const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
              const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;

              // 🌟 WHITELIST DE PRUEBAS IG
              const TEST_ACCOUNTS = ['practiiko']; // Puedes añadir tu @username personal aquí
              const isTester = TEST_ACCOUNTS.includes(userInfo?.username) || TEST_ACCOUNTS.includes(senderId);

              if (!isGlobalEnabled && !isTester) {
                console.log(`[INSTAGRAM DM] BREAKER GLOBAL ACTIVADO. IA pausada mundialmente. Ignorando a ${senderId}.`);
                return NextResponse.json({ status: "global_paused" });
              }

              // 2. Verificar si el bot está pausado para este cliente
              const customerRes = await query("SELECT ai_enabled FROM instagram_customers WHERE id = $1", [senderId]);
              const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;

              if (!isAiEnabled) {
                console.log(`[INSTAGRAM DM] Bot pausado para ${senderId}. No se generará respuesta automática.`);
                return NextResponse.json({ status: "bot_paused" });
              }

              // 2. Procesar con IA si está habilitado (con debounce de 5 segundos)
              const customerName = userInfo?.name || userInfo?.username || 'Cliente';
              let debounceState = instagramDebounceMap.get(senderId);
              if (debounceState) {
                clearTimeout(debounceState.timer);
                debounceState.messages.push(userMessage);
                debounceState.customerName = customerName;
                debounceState.baseUrl = baseUrl;
              } else {
                debounceState = {
                  messages: [userMessage],
                  customerName,
                  baseUrl,
                  timer: null
                };
                instagramDebounceMap.set(senderId, debounceState);
              }

              debounceState.timer = setTimeout(async () => {
                instagramDebounceMap.delete(senderId);

                const combinedMessage = debounceState.messages.join(" ").trim();
                console.log(`[INSTAGRAM DM DEBOUNCE] Procesando mensajes combinados para ${senderId} ("${debounceState.customerName}"): "${combinedMessage}"`);

                try {
                  const aiResponse = await processInstagramMessage(combinedMessage, senderId, debounceState.customerName, debounceState.baseUrl, 'dm', null);
                  
                  if (aiResponse.ignored) {
                    console.log(`[INSTAGRAM DM DEBOUNCE] Respuesta de IA ignorada (bot pausado) para ${senderId}.`);
                    return;
                  }

                  await sendInstagramMessage(senderId, aiResponse.text);
                  if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
                    for (const imgUrl of aiResponse.imageUrls) {
                      await sendInstagramImage(senderId, imgUrl);
                    }
                  }
                  console.log(`[INSTAGRAM DM] Respuesta de IA enviada a ${senderId}`);
                } catch (e) {
                  console.error("[ERROR ASYNC DM]:", e);
                }
              }, 5000);
            }
          }
        }

        // --- 2. PROCESAR COMENTARIOS ---
        if (entry.changes) {
          const pageId = entry.id;

          for (const change of entry.changes) {
            if (change.field === "comments") {
              const commentId = change.value.id;
              const senderId = change.value.from?.id;

              // FILTRO CRÍTICO: Solo procesar cuando se AGREGAN nuevos comentarios (evita responder a likes, reacciones, ediciones o eliminaciones)
              if (change.value.verb && change.value.verb !== "add") {
                console.log(`[WEBHOOK] Cambio en comentarios con verbo '${change.value.verb}'. Ignorando.`);
                continue;
              }

              // FILTRO CRÍTICO: No responder a comentarios hechos por la propia página
              if (senderId === pageId) {
                console.log("[WEBHOOK] Comentario propio detectado. Ignorando.");
                continue;
              }

              const userMessage = change.value.text;
              const username = change.value.from?.username;

              console.log(`[INSTAGRAM COMMENT] Nuevo de @${username} en ${commentId}: ${userMessage}`);

              // Guardar cliente
              await query(
                `INSERT INTO instagram_customers (id, username, full_name, last_seen) 
                 VALUES ($1, $2, $3, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET username = $2, full_name = $3, last_seen = NOW()`,
                [senderId, username, username]
              );

              // 0. GUARDAR MENSAJE DEL USUARIO INMEDIATAMENTE
              await query(
                `INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
                [senderId, JSON.stringify({ role: 'user', content: userMessage }), 'comment', commentId]
              );

              // Verificar Breaker Global
              const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
              const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;

              // 🌟 WHITELIST DE PRUEBAS IG
              const TEST_ACCOUNTS = ['practiiko']; // Puedes añadir tu @username personal aquí
              const isTester = TEST_ACCOUNTS.includes(username) || TEST_ACCOUNTS.includes(senderId);

              if (!isGlobalEnabled && !isTester) {
                console.log(`[INSTAGRAM COMMENT] BREAKER GLOBAL ACTIVADO. IA pausada mundialmente.`);
                return NextResponse.json({ status: "global_paused" });
              }

              // Verificar pausa del bot individual
              const customerRes = await query("SELECT ai_enabled FROM instagram_customers WHERE id = $1", [senderId]);
              const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;

              if (!isAiEnabled) {
                console.log(`[INSTAGRAM COMMENT] Bot pausado para ${senderId}. No se generará respuesta automática.`);
                return NextResponse.json({ status: "bot_paused" });
              }

              processInstagramMessage(userMessage, senderId, username || 'Cliente', baseUrl, 'comment', commentId).then(async (aiResponse) => {
                // 1. Respuesta pública corta con guía de solicitudes
                replyToInstagramComment(commentId, "¡Hola! Te enviamos el detalle al DM (revisa tu bandeja de mensajes) 💎");

                // 2. Respuesta privada con el detalle de la IA
                await sendInstagramPrivateReply(commentId, aiResponse.text, pageId);
                if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
                  for (const imgUrl of aiResponse.imageUrls) {
                    await sendInstagramImage(senderId, imgUrl);
                  }
                }
              }).catch(e => console.error("[ERROR ASYNC COMMENT]:", e));
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[ERROR WEBHOOK]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Función para responder a un comentario de Instagram
async function replyToInstagramComment(commentId, text) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) return;

  const url = `https://graph.instagram.com/v21.0/${commentId}/replies`;

  try {
    const response = await fetch(url, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({ message: text })
    });
    const data = await response.json();
    if (data.error) {
      console.error("[ERROR REPLY COMMENT]:", data.error);
    }
  } catch (e) {
    console.error("[EXCEPTION REPLY COMMENT]:", e);
  }
}

async function getInstagramUserInfo(userId) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) return null;

  try {
    const url = `https://graph.instagram.com/v21.0/${userId}?fields=username,name&access_token=${PAGE_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.error("[ERROR FETCH USER]:", data.error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[FETCH USER EXCEPTION]:", e);
    return null;
  }
}

// Función para enviar mensajes vía API de Instagram (Graph API)
async function sendInstagramMessage(recipientId, text) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();

  if (!PAGE_ACCESS_TOKEN) {
    console.error("Falta INSTAGRAM_PAGE_ACCESS_TOKEN en las variables de entorno.");
    return;
  }

  const url = `https://graph.instagram.com/v21.0/me/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[ERROR INSTAGRAM API]:", data.error);
    }
  } catch (e) {
    console.error("[ERROR SENDING MESSAGE]:", e);
  }
}

// Función para enviar respuesta privada a un comentario (DM automático)
async function sendInstagramPrivateReply(commentId, text, igId = "me") {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) return;

  console.log(`[DEBUG] Intentando respuesta privada via /${igId}/messages con token IGAA`);

  const url = `https://graph.instagram.com/v21.0/${igId}/messages`;

  try {
    const response = await fetch(url, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({ 
        recipient: { comment_id: commentId },
        message: { text: text }
      })
    });
    const data = await response.json();
    if (data.error) {
      console.error("[ERROR PRIVATE REPLY]:", data.error);
    } else {
      console.log(`[INSTAGRAM] Respuesta privada enviada al comentario ${commentId}`);
    }
  } catch (e) {
    console.error("[EXCEPTION PRIVATE REPLY]:", e);
  }
}

async function sendInstagramImage(recipientId, imageUrl) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) {
    console.error("Falta INSTAGRAM_PAGE_ACCESS_TOKEN en las variables de entorno.");
    return;
  }

  // Meta/Instagram DM no soporta formato .webp (Error 100 / Subcode 2534080).
  // La API de medios de Practiiko (/api/media/*) convierte dinámicamente WebP a JPEG al vuelo
  // si se solicita la extensión .jpeg de una imagen que físicamente es .webp en el servidor.
  let formattedUrl = imageUrl;
  if (formattedUrl && formattedUrl.endsWith(".webp")) {
    formattedUrl = formattedUrl.replace(/\.webp$/i, ".jpeg");
  }

  const url = `https://graph.instagram.com/v21.0/me/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: formattedUrl,
              is_reusable: true
            }
          }
        },
      }),
    });
    const data = await response.json();
    if (data.error) {
      console.error("[ERROR INSTAGRAM IMAGE API]:", data.error);
    }
  } catch (e) {
    console.error("[ERROR SENDING INSTAGRAM IMAGE]:", e);
  }
}
