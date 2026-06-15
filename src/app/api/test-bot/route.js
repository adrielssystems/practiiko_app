import { processInstagramMessage } from "@/lib/ai/instagramAgent";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { message, sessionId, testId, customerName } = await req.json();
    
    // Resolver el ID de sesión: priorizar sessionId, luego testId, luego default
    const resolvedSessionId = sessionId || testId || 'simul-user';
    const resolvedName = customerName || 'Explorador (Simulador)';

    // Persistir el cliente de prueba en la DB para que sea visible en el panel
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

    // Guardar el mensaje del USUARIO en la DB antes de procesar la IA
    // Esto es crucial para que el agente tenga un historial completo y coherente
    try {
      await query(
        `INSERT INTO instagram_messages (session_id, message, source)
         VALUES ($1, $2, $3)`,
        [resolvedSessionId, JSON.stringify({ role: 'user', content: message }), 'dm']
      );
    } catch (dbErr) {
      console.warn("[SIMULATOR] No se pudo guardar mensaje de usuario:", dbErr.message);
    }

    // Simular el tiempo de espera de 5 segundos acordado en el simulador
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const aiResponse = await processInstagramMessage(
      message, 
      resolvedSessionId, 
      resolvedName,
      baseUrl,
      'dm',
      null
    );
    
    return NextResponse.json({ 
      success: true, 
      bot_response: aiResponse 
    });
  } catch (error) {
    console.error("Simulator API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error en el agente virtual" 
    }, { status: 500 });
  }
}
