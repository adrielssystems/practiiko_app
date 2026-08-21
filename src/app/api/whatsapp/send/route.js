import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { to, text } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Faltan datos (to, text)" }, { status: 400 });
    }

    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;

    if (!phoneId || !token) {
      return NextResponse.json({ error: "Meta WhatsApp API no configurada (faltan variables de entorno)" }, { status: 500 });
    }

    // 1. Enviar a través de Graph API de Meta
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

    if (response.ok && !data.error) {
      // 2. Guardar en la base de datos como mensaje del asistente (manual)
      await query(
        "INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)",
        [to, JSON.stringify({ role: 'assistant', content: text, manual: true })]
      );

      // 3. Auto-pausar la IA ya que un humano acaba de intervenir desde el gestor
      await query(
        "UPDATE whatsapp_customers SET ai_enabled = false WHERE id = $1",
        [to]
      );

      return NextResponse.json({ success: true, data });
    } else {
      console.error("[WHATSAPP SEND META ERROR]:", JSON.stringify(data));
      const metaErrMsg = data.error?.message || data.error?.error?.data?.details || "Meta API rechazó el envío de mensaje.";
      return NextResponse.json({ success: false, error: metaErrMsg, metaError: data }, { status: 500 });
    }

  } catch (error) {
    console.error("[MANUAL SEND ERROR WHATSAPP]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
