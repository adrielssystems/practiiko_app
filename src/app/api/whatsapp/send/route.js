import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";

export async function POST(req) {
  try {
    const { to, text } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Faltan datos (to, text)" }, { status: 400 });
    }

    if (!EVO_URL) {
      return NextResponse.json({ error: "Evolution API URL no configurada" }, { status: 500 });
    }

    // 1. Enviar a través de Evolution API
    const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY
      },
      body: JSON.stringify({
        number: to,
        text: text,
        linkPreview: true
      })
    });

    const data = await response.json();

    if (response.ok && !data.error) {
      // 2. Guardar en la base de datos como mensaje del asistente (pero manual)
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
      return NextResponse.json({ success: false, error: data }, { status: 500 });
    }

  } catch (error) {
    console.error("[MANUAL SEND ERROR WHATSAPP]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
