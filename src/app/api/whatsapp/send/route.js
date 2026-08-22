import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { to, text } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Faltan datos (to, text)" }, { status: 400 });
    }

    const phone = process.env.WHATSAPP_PHONE_ID; // Debe ser el numero, ej. 584248948664
    const token = process.env.YCLOUD_API_KEY;

    if (!phone || !token) {
      return NextResponse.json({ error: "YCloud API no configurada (faltan variables de entorno)" }, { status: 500 });
    }

    // 1. Enviar a través de API de YCloud
    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': token
      },
      body: JSON.stringify({
        from: phone,
        to: to,
        type: "text",
        text: {
          body: text
        }
      })
    });

    const data = await response.json();

    // YCloud devuelve un ID de mensaje o un error
    if (response.ok && !data.errorCode) {
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
      console.error("[WHATSAPP SEND YCLOUD ERROR]:", JSON.stringify(data));
      const errMsg = data.errorMessage || data.message || "YCloud API rechazó el envío de mensaje.";
      return NextResponse.json({ success: false, error: errMsg, ycloudError: data }, { status: 500 });
    }

  } catch (error) {
    console.error("[MANUAL SEND ERROR WHATSAPP]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
