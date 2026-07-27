import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { recipientId, text } = await req.json();
    const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();

    if (!recipientId || !text) {
      return NextResponse.json({ error: "Faltan datos (recipientId, text)" }, { status: 400 });
    }

    if (!PAGE_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Instagram Access Token no configurado" }, { status: 500 });
    }

    // 1. Enviar a través de Graph API de Meta (usando Authorization header)
    const url = `https://graph.instagram.com/v21.0/me/messages`;
    
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

    // Loguear siempre la respuesta de Meta para facilitar el diagnóstico
    console.log("[INSTAGRAM SEND RESPONSE]:", JSON.stringify(data));

    if (data.recipient_id || data.message_id) {
      // 2. Guardar en la base de datos incluyendo source='manual' para consistencia
      await query(
        "INSERT INTO instagram_messages (session_id, message, source) VALUES ($1, $2, $3)",
        [recipientId, JSON.stringify({ role: 'assistant', content: text, manual: true }), 'manual']
      );

      // 3. Auto-pausar la IA ya que un humano acaba de intervenir desde el gestor
      await query(
        "UPDATE instagram_customers SET ai_enabled = false WHERE id = $1 OR username = $1",
        [recipientId]
      );

      return NextResponse.json({ success: true, data });
    } else {
      console.error("[INSTAGRAM SEND META ERROR]:", JSON.stringify(data));
      const metaErrMsg = data.error?.message || data.error?.error?.message || (typeof data.error === 'string' ? data.error : null) || "Meta API rechazó el envío de mensaje.";
      return NextResponse.json({ success: false, error: metaErrMsg, metaError: data }, { status: 500 });
    }

  } catch (error) {
    console.error("[MANUAL SEND ERROR INSTAGRAM]:", error);
    return NextResponse.json({ success: false, error: error.message || "Error interno al enviar mensaje." }, { status: 500 });
  }
}
