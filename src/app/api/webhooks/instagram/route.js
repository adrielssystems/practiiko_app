import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { processChatMessage } from "@/lib/ai/agent";
import { query } from "@/lib/db";

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

            // FILTRO CRÍTICO: Si el remitente es la misma página, es un eco. IGNORAR.
            if (senderId === pageId) {
              console.log("[WEBHOOK] Mensaje propio de la página detectado. Ignorando para evitar bucle.");
              continue;
            }

            if (messaging.message?.is_echo === true) {
              continue;
            }

            if (messaging.message?.text) {
              const userMessage = messaging.message.text;
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

              // 2. Procesar con IA si está habilitado
              processChatMessage(userMessage, senderId, 'dm', null, userInfo?.name || userInfo?.username || 'Cliente').then(aiResponse => {
                sendInstagramMessage(senderId, aiResponse);
              }).catch(e => console.error("[ERROR ASYNC DM]:", e));
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

              processChatMessage(userMessage, senderId, 'comment', commentId, username || 'Cliente').then(aiResponse => {
                // 1. Respuesta pública corta con guía de solicitudes
                replyToInstagramComment(commentId, "¡Hola! Te enviamos el detalle al DM (revisa tu bandeja de mensajes) 💎");

                // 2. Respuesta privada con el detalle de la IA
                sendInstagramPrivateReply(commentId, aiResponse, pageId);
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
