import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processInstagramMessage } from "@/lib/ai/instagramAgent";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const confirm = searchParams.get("confirm");

  try {
    // 1. Obtener las sesiones de Instagram con mensajes HOY (a partir de las 00:00)
    // donde la IA sigue encendida.
    const sessionsRes = await query(`
      SELECT DISTINCT m.session_id, c.full_name, c.username
      FROM instagram_messages m
      JOIN instagram_customers c ON m.session_id = c.id
      WHERE m.created_at >= CURRENT_DATE 
        AND m.session_id != 'practiiko'
        AND c.ai_enabled = true
    `);

    const sessions = sessionsRes.rows;
    let report = [];

    for (const session of sessions) {
      const sessionId = session.session_id;

      // Buscar el último mensaje de la conversación
      const lastMsgRes = await query(`
        SELECT id, message, created_at, source, comment_id 
        FROM instagram_messages 
        WHERE session_id = $1 
        ORDER BY created_at DESC LIMIT 1
      `, [sessionId]);

      if (lastMsgRes.rows.length === 0) continue;
      
      const lastMsgRow = lastMsgRes.rows[0];
      let msgObj = typeof lastMsgRow.message === 'string' ? JSON.parse(lastMsgRow.message) : lastMsgRow.message;

      // Si el último mensaje es del asistente, y fue enviado hoy,
      // asumimos que es una respuesta "fantasma" que nunca llegó a Meta por el token vencido.
      const isToday = new Date(lastMsgRow.created_at) >= new Date(new Date().setHours(0,0,0,0));
      
      if (msgObj.role === 'assistant' && isToday) {
        if (confirm === 'true') {
          // PASO A: Eliminar la respuesta fantasma para que la IA no se confunda
          await query(`DELETE FROM instagram_messages WHERE id = $1`, [lastMsgRow.id]);
          
          // PASO B: Buscar el mensaje original del usuario que causó esa respuesta
          const userMsgRes = await query(`
            SELECT id, message, source, comment_id 
            FROM instagram_messages 
            WHERE session_id = $1 AND message->>'role' = 'user' 
            ORDER BY created_at DESC LIMIT 1
          `, [sessionId]);

          if (userMsgRes.rows.length > 0) {
            const uMsgRow = userMsgRes.rows[0];
            const uMsgObj = typeof uMsgRow.message === 'string' ? JSON.parse(uMsgRow.message) : uMsgRow.message;
            const textToProcess = uMsgObj.content;

            const protocol = req.headers.get("x-forwarded-proto") || "https";
            const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "auto.practiiko.com";
            const baseUrl = `${protocol}://${host}`;

            // PASO C: Volver a procesar el mensaje con la IA (Esto guardará la nueva respuesta en BD)
            const aiResponse = await processInstagramMessage(
              textToProcess, 
              sessionId, 
              session.full_name || session.username, 
              baseUrl, 
              uMsgRow.source, 
              uMsgRow.comment_id
            );

            // PASO D: Enviar forzosamente a Meta la nueva respuesta
            if (!aiResponse.ignored && aiResponse.text) {
              if (uMsgRow.source === 'dm' || uMsgRow.source === 'comment') {
                // Enviar texto
                await sendInstagramMessage(sessionId, aiResponse.text);
                // Enviar imágenes si las hay
                if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
                  for (const img of aiResponse.imageUrls) {
                    await sendInstagramImage(sessionId, img);
                  }
                }
              }
            }
          }
        }
        report.push({ 
          session_id: sessionId, 
          customer: session.full_name || session.username, 
          status: confirm === 'true' ? 'Rescatado y Respondido' : 'Pendiente de Rescate' 
        });
      }
    }

    return NextResponse.json({ 
      mensaje: confirm === 'true' ? "Operación ejecutada con éxito. Los mensajes fueron respondidos." : "MODO SIMULACIÓN: Estos son los chats atascados de HOY. Para procesarlos, agrega '?confirm=true' a la URL.",
      chats_afectados: report.length,
      detalles: report
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// Funciones clonadas de route.js para poder enviar los mensajes
// ------------------------------------------------------------------

async function sendInstagramMessage(recipientId, text) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.instagram.com/v21.0/me/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: text } }),
    });
  } catch (e) {
    console.error("Rescue Send Msg Error:", e);
  }
}

async function sendInstagramImage(recipientId, imageUrl) {
  const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
  if (!PAGE_ACCESS_TOKEN) return;

  let formattedUrl = imageUrl;
  if (formattedUrl && formattedUrl.endsWith(".webp")) {
    formattedUrl = formattedUrl.replace(/\.webp$/i, ".jpeg");
  }

  const url = `https://graph.instagram.com/v21.0/me/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { attachment: { type: "image", payload: { url: formattedUrl, is_reusable: true } } }
      }),
    });
  } catch (e) {
    console.error("Rescue Send Img Error:", e);
  }
}
