import { processInstagramMessage } from "@/lib/ai/instagramAgent";
import { processWhatsappMessage } from "@/lib/ai/whatsappAgent";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { message, sessionId, testId, customerName, platform } = await req.json();

    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Modo Simulador WhatsApp (Super Agente Vendedor en el panel /settings/ai)
    if (platform === "whatsapp") {
      const resolvedSessionId = sessionId || "simulador-wa-admin";
      const resolvedName = customerName || "Cliente Simulador";

      await query(
        `INSERT INTO whatsapp_customers (id, full_name, ai_enabled, requires_human, last_seen)
         VALUES ($1, $2, true, false, NOW())
         ON CONFLICT (id) DO UPDATE SET full_name = $2, last_seen = NOW()`,
        [resolvedSessionId, resolvedName]
      );

      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [resolvedSessionId, JSON.stringify({ role: "user", content: message })]
      );

      const waResponse = await processWhatsappMessage(
        message,
        resolvedSessionId,
        resolvedName,
        baseUrl
      );

      return NextResponse.json({
        success: true,
        bot_response: waResponse,
      });
    }

    // Flujo original del Simulador Instagram
    const resolvedSessionId = sessionId || testId || "simul-user";
    const resolvedName = customerName || "Explorador (Simulador)";

    try {
      await query(
        `INSERT INTO instagram_customers (id, username, full_name, last_seen)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET full_name = $3, last_seen = NOW()`,
        [resolvedSessionId, resolvedSessionId, resolvedName]
      );
    } catch (dbErr) {
      console.warn("[SIMULATOR] No se pudo upsert cliente:", dbErr.message);
    }

    try {
      await query(
        `INSERT INTO instagram_messages (session_id, message, source)
         VALUES ($1, $2, $3)`,
        [resolvedSessionId, JSON.stringify({ role: "user", content: message }), "dm"]
      );
    } catch (dbErr) {
      console.warn("[SIMULATOR] No se pudo guardar mensaje de usuario:", dbErr.message);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const aiResponse = await processInstagramMessage(
      message,
      resolvedSessionId,
      resolvedName,
      baseUrl,
      "dm",
      null
    );

    let audioUrl = null;
    if (aiResponse.isWelcomeTemplate) {
      audioUrl = `${baseUrl}/api/media/voice_beneficios.mp3`;
    }

    return NextResponse.json({
      success: true,
      bot_response: {
        ...aiResponse,
        audioUrl,
      },
    });
  } catch (error) {
    console.error("Simulator API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error en el agente virtual",
      },
      { status: 500 }
    );
  }
}
