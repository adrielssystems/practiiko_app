import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processChatMessage } from "@/lib/ai/agent";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

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

async function getLocalImageAsBase64(imageUrl) {
  try {
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', filename);
    const buffer = await fs.readFile(filePath);
    
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Evolution API's IsUrlOrBase64 validator expects RAW base64 without the data URI prefix!
    return jpegBuffer.toString('base64');
  } catch (error) {
    console.error("[BASE64 CONVERSION ERROR]:", error);
    return null;
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  if (!EVO_URL) {
    console.error("[EVOLUTION ERROR]: EVOLUTION_API_URL no está configurada en Easypanel.");
    return;
  }
  try {
    let mediaPayload = imageUrl;
    let mimetype = "image/jpeg";
    let filename = "image.jpeg";
    let isBase64 = false;
    
    const parts = imageUrl.split('/');
    const originalFilename = parts[parts.length - 1];
    
    if (imageUrl.includes("/api/media/")) {
      const base64Data = await getLocalImageAsBase64(imageUrl);
      if (base64Data) {
        mediaPayload = base64Data;
        filename = originalFilename.replace(/\.webp$/i, '.jpeg');
        isBase64 = true;
      } else {
        if (originalFilename.endsWith(".png")) mimetype = "image/png";
        else if (originalFilename.endsWith(".webp")) mimetype = "image/webp";
        filename = originalFilename;
        // Fallback a URL pública usando auto.practiiko.com para evitar Loopback NAT
        mediaPayload = `https://auto.practiiko.com/api/media/${originalFilename}`;
      }
    } else {
      if (originalFilename.endsWith(".png")) mimetype = "image/png";
      else if (originalFilename.endsWith(".webp")) mimetype = "image/webp";
      filename = originalFilename;
    }

    const payloadBody = {
      number: to,
      mediatype: "image",
      media: mediaPayload,
      fileName: filename, // Evolution API lo requiere para saber la extensión
      mimetype: mimetype,
      delay: 500
    };

    const response = await fetch(`${EVO_URL}/message/sendMedia/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY
      },
      body: JSON.stringify(payloadBody)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[EVOLUTION IMAGE SEND HTTP ERROR] ${response.status}:`, errText);
      // Enviar mensaje de debug por WhatsApp al administrador o cliente
      await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló envío de imagen. Error de Evolution API: HTTP ${response.status} - ${errText.substring(0, 100)}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === "error" || data.error) {
       await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Evolution devolvió error en JSON: ${JSON.stringify(data).substring(0, 100)}`);
    }
    
    return data;
  } catch (error) {
    console.error("[EVOLUTION IMAGE SEND ERROR]:", error);
    await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló código interno al enviar imagen: ${error.message}`);
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

      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "auto.practiiko.com";
      let baseUrl = `${protocol}://${host}`;
      // Evitar que URLs locales o de red interna docker se usen para las fotos de Evolution API
      if (baseUrl.includes("localhost") || baseUrl.includes("practiiko_app") || baseUrl.includes("127.0.0.1") || baseUrl.includes("::1")) {
        baseUrl = "https://auto.practiiko.com";
      }

      // 6. Procesar con IA y responder (en segundo plano)
      console.log(`[WHATSAPP] Procesando respuesta de IA para ${senderNumber}... (baseUrl: ${baseUrl})`);
      processChatMessage(userMessage, senderNumber, 'whatsapp', null, pushName, baseUrl).then(async (aiResponse) => {
        // Enviar a WhatsApp
        await sendWhatsAppMessage(senderNumber, aiResponse.text);
        
        // Si hay imágenes, enviarlas todas
        if (aiResponse.imageUrls && aiResponse.imageUrls.length > 0) {
          for (const imgUrl of aiResponse.imageUrls) {
            await sendWhatsAppImage(senderNumber, imgUrl);
            console.log(`[WHATSAPP] Imagen de IA enviada a ${senderNumber}: ${imgUrl}`);
          }
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
