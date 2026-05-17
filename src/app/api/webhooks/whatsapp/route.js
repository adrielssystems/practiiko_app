import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processChatMessage } from "@/lib/ai/agent";

export const dynamic = "force-dynamic";

// Configuración de Evolution API desde variables de entorno
const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";

async function sendWhatsAppMessage(to, text) {
  if (!EVO_URL) {
    console.error("[EVOLUTION ERROR]: EVOLUTION_API_URL no está configurada en Easypanel.");
    return;
  }
  try {
    const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY
      },
      body: JSON.stringify({
        number: to,
        text: text,
        delay: 1200, // Simular escritura
        linkPreview: true
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[EVOLUTION SEND ERROR]:", error);
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  if (!EVO_URL) {
    console.error("[EVOLUTION ERROR]: EVOLUTION_API_URL no está configurada en Easypanel.");
    return;
  }
  try {
    const response = await fetch(`${EVO_URL}/message/sendMedia/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY
      },
      body: JSON.stringify({
        number: to,
        mediatype: "image",
        media: imageUrl,
        delay: 500
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[EVOLUTION IMAGE SEND ERROR]:", error);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Loguear el webhook para monitoreo (opcional, pero útil al principio)
    await query("INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)", ['whatsapp', JSON.stringify(body)]);

    // Evolution API envía eventos con el campo "event" o "type"
    const eventType = (body.event || body.type || "").toLowerCase();
    console.log(`[WHATSAPP DEBUG] Evento recibido: ${eventType}`);
    
    if (eventType === "messages.upsert" || eventType === "messages-upsert") {
      const messageData = body.data;
      const key = messageData.key;
      const remoteJid = key.remoteJid;
      const fromMe = key.fromMe;
      
      // 1. FILTRO CRÍTICO: Ignorar si el mensaje lo envió el bot (fromMe) o si no es de un chat individual
      if (fromMe || !remoteJid.includes('@s.whatsapp.net')) {
        return NextResponse.json({ status: "ignored" });
      }

      // 2. Extraer el texto del mensaje
      const userMessage = messageData.message?.conversation || 
                          messageData.message?.extendedTextMessage?.text || 
                          "";

      if (!userMessage) return NextResponse.json({ status: "no_text" });

      const senderNumber = remoteJid.split('@')[0];
      const pushName = messageData.pushName || "Cliente WhatsApp";

      console.log(`[WHATSAPP] Mensaje de ${pushName} (${senderNumber}): ${userMessage}`);

      // 3. Guardar/Actualizar cliente
      await query(
        `INSERT INTO whatsapp_customers (id, full_name, last_seen) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET full_name = $2, last_seen = NOW()`,
        [senderNumber, pushName]
      );

      // 4. GUARDAR MENSAJE DEL USUARIO INMEDIATAMENTE (Para que aparezca en el board)
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [senderNumber, JSON.stringify({ role: 'user', content: userMessage })]
      );
      console.log(`[WHATSAPP] Mensaje de usuario guardado para ${senderNumber}`);

      // 5. Verificar Breaker Global
      const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
      const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;
      
      // 🌟 WHITELIST DE PRUEBAS: Añade aquí los números que siempre deben funcionar
      const TEST_NUMBERS = []; // Lista de prueba vacía
      const isTester = TEST_NUMBERS.includes(senderNumber);

      if (!isGlobalEnabled && !isTester) {
        console.log(`[WHATSAPP] BREAKER GLOBAL ACTIVADO. IA pausada mundialmente. Ignorando a ${senderNumber}.`);
        return NextResponse.json({ status: "global_paused" });
      }

      // 6. Verificar si el bot está pausado para este cliente individual
      const customerRes = await query("SELECT ai_enabled FROM whatsapp_customers WHERE id = $1", [senderNumber]);
      const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;

      if (!isAiEnabled) {
        console.log(`[WHATSAPP] Bot pausado para ${senderNumber}. No se generará respuesta automática.`);
        return NextResponse.json({ status: "bot_paused" });
      }

      // 6. Procesar con IA y responder (en segundo plano)
      console.log(`[WHATSAPP] Procesando respuesta de IA para ${senderNumber}...`);
      processChatMessage(userMessage, senderNumber, 'whatsapp', null, pushName).then(async (aiResponse) => {
        // Enviar a WhatsApp
        await sendWhatsAppMessage(senderNumber, aiResponse.text);
        
        // Si hay una imagen, enviarla también
        if (aiResponse.imageUrl) {
          await sendWhatsAppImage(senderNumber, aiResponse.imageUrl);
          console.log(`[WHATSAPP] Imagen de IA enviada a ${senderNumber}: ${aiResponse.imageUrl}`);
        }
        console.log(`[WHATSAPP] Respuesta de IA enviada a ${senderNumber}`);
      }).catch(e => console.error("[ERROR WHATSAPP AI]:", e));
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[WHATSAPP WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
