import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const getPhoneId = () => process.env.WHATSAPP_PHONE_ID; // Ej. 584248948664
const getApiKey = () => process.env.YCLOUD_API_KEY;

// --- FUNCIONES DE ENVÍO DE YCLOUD ---

async function sendWhatsAppMessage(to, text) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify({
        from: phoneId,
        to: to,
        type: "text",
        text: { body: text }
      })
    });
    const data = await response.json();
    if (data.errorCode) console.error("[WHATSAPP SEND ERROR]:", data);
    return data;
  } catch (error) {
    console.error("[WHATSAPP SEND EXCEPTION]:", error);
  }
}

async function sendWhatsAppImage(to, imageUrl) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    let mediaPayload = imageUrl;
    if (imageUrl.includes("/api/media/")) {
      const parts = imageUrl.split('/');
      const originalFilename = parts[parts.length - 1];
      const filenameJpg = originalFilename.replace(/\.webp$/i, '.jpeg');
      mediaPayload = `https://auto.practiiko.com/api/media/${filenameJpg}`;
    }

    const payloadBody = {
      from: phoneId,
      to: to,
      type: "image",
      image: { link: mediaPayload }
    };

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payloadBody)
    });

    const data = await response.json();
    if (data.errorCode) {
      console.error(`[WHATSAPP IMAGE SEND ERROR]`, data);
      await sendWhatsAppMessage(to, `[SISTEMA-DEBUG] Falló envío de imagen.`);
      return null;
    }
    return data;
  } catch (error) {
    console.error("[WHATSAPP IMAGE SEND EXCEPTION]:", error);
  }
}

// NUEVA FUNCION: Enviar Menú Interactivo de 3 botones gratuito dentro de ventana 24h (Fase 2 sin costo de plantilla)
async function sendInteractiveMenu(to) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    const payload = {
      from: phoneId,
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Para atenderte lo más rápido, dinos... ¿Qué quieres ver?" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "btn_sofas", title: "SOFAS COMPRIMIDOS" } },
            { type: "reply", reply: { id: "btn_colchones", title: "COLCHONES" } },
            { type: "reply", reply: { id: "btn_velas", title: "VELAS PERLADAS" } }
          ]
        }
      }
    };

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.errorCode || !response.ok) {
      console.error("[WHATSAPP INTERACTIVE ERROR]:", data);
    }
    return data;
  } catch (error) {
    console.error("[WHATSAPP INTERACTIVE ERROR]:", error);
  }
}

// NUEVA FUNCION: Enviar Video o Audio (Fase 3 Ruta A)
async function sendMediaFile(to, type, mediaUrl) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) return;

  try {
    const payload = {
      from: phoneId,
      to: to,
      type: type,
      [type]: { link: mediaUrl }
    };

    console.log(`[YCLOUD DEBUG] Enviando ${type.toUpperCase()} a ${to}. Payload:`, JSON.stringify(payload));

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[YCLOUD DEBUG] Respuesta de YCloud para ${type.toUpperCase()}:`, JSON.stringify(data));
    if (data.errorCode || !response.ok) {
      console.error(`[WHATSAPP ${type.toUpperCase()} ERROR]:`, data);
    }
    return data;
  } catch (error) {
    console.error(`[WHATSAPP ${type.toUpperCase()} EXCEPTION]:`, error);
  }
}

// NUEVA FUNCION: Enviar Plantilla de Carrusel (Fase 3 Ruta B)
async function sendTemplate(to, templateName, components = null) {
  const phoneId = getPhoneId();
  const token = getApiKey();
  if (!phoneId || !token) {
    console.error("[WHATSAPP TEMPLATE] Faltan credenciales (phoneId o token).");
    return;
  }

  try {
    const templateObj = {
      name: templateName,
      language: { code: "es" }
    };

    if (components && components.length > 0) {
      templateObj.components = components;
    }

    const payload = {
      from: phoneId,
      to: to,
      type: "template",
      template: templateObj
    };

    console.log(`[YCLOUD DEBUG] Enviando Plantilla '${templateName}' a ${to}. Payload:`, JSON.stringify(payload));

    const response = await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[YCLOUD DEBUG] Respuesta de YCloud para plantilla '${templateName}':`, JSON.stringify(data));

    if (data.errorCode || !response.ok) {
      console.error(`[WHATSAPP TEMPLATE ERROR - ${templateName}]:`, data);
    }
  } catch (error) {
    console.error(`[WHATSAPP TEMPLATE EXCEPTION]:`, error);
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// Cache en memoria para deduplicar webhooks concurrentes o reintentos de YCloud / Meta
const processedMessageIds = new Map();
const inFlightUsers = new Set();

function cleanDeduplicationCache() {
  const now = Date.now();
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > 60000) { // Limpiar después de 60 segundos
      processedMessageIds.delete(id);
    }
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Loguear el webhook
    await query("INSERT INTO webhook_logs (event_type, payload) VALUES ($1, $2)", ['whatsapp_ycloud', JSON.stringify(body)]);

    if (body.type === "whatsapp.inbound_message.received") {
      const wim = body.whatsappInboundMessage;
      if (!wim) return NextResponse.json({ status: "success" });

      const incomingMsgId = wim.id || wim.wamid;
      cleanDeduplicationCache();

      // 1. DEDUPLICACIÓN POR ID DE MENSAJE
      if (incomingMsgId) {
        if (processedMessageIds.has(incomingMsgId)) {
          console.log(`[WHATSAPP DEDUPLICATION] Mensaje duplicado ignorado: ${incomingMsgId}`);
          return NextResponse.json({ status: "duplicate_ignored" });
        }
        processedMessageIds.set(incomingMsgId, Date.now());
      }

      const senderNumber = wim.from.replace('+', ''); // Quitar el '+' para la DB

      // 2. BLOQUEO EN VUELO (Evita que dos clics simultáneos o doble webhook disparen el flujo 2 veces a la vez)
      if (inFlightUsers.has(senderNumber)) {
        console.log(`[WHATSAPP LOCK] Procesamiento en curso para ${senderNumber}. Ignorando solicitud concurrente.`);
        return NextResponse.json({ status: "concurrent_inbound_ignored" });
      }

      inFlightUsers.add(senderNumber);

      try {
        return await handleInboundMessage(wim, senderNumber);
      } finally {
        // Liberar el lock después de que termine la secuencia (delays reducidos a 500ms)
        setTimeout(() => {
          inFlightUsers.delete(senderNumber);
        }, 2000);
      }
    } else if (body.type === "whatsapp.message.updated") {
      const msg = body.whatsappMessage || body.message;
      if (msg) {
        console.log(`[YCLOUD STATUS] Mensaje ${msg.id} a ${msg.to} -> Estado: ${msg.status}`);
        if (msg.status === "failed") {
          console.error(`[YCLOUD DELIVERY FAILED]:`, JSON.stringify(msg.error || msg, null, 2));
        }
      }
    } else if (body.type === "whatsapp.message.echo" || (body.whatsappInboundMessage?.data?.type === "smb_message_echoes")) {
      const wim = body.whatsappInboundMessage || body.message;
      if (wim && wim.to) {
        const customerNumber = wim.to.replace('+', '');
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [customerNumber, JSON.stringify({ role: 'assistant', content: "[Asesor intervino desde App Móvil (YCloud)]", manual: true })]);
        await query(`UPDATE whatsapp_customers SET ai_enabled = false WHERE id = $1`, [customerNumber]);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[WHATSAPP YCLOUD WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleInboundMessage(wim, senderNumber) {
  const messageData = wim;
  const pushName = wim.customerProfile?.name || "Cliente WhatsApp";

  // 1. Extraer texto o botones interactivos
  let userMessage = "";
  let interactiveId = null;
  let isImage = false;

  if (messageData.type === "text") {
    userMessage = messageData.text?.body || "";
  } else if (messageData.type === "button") {
    // Botones de respuesta rápida de una Plantilla de Meta
    userMessage = messageData.button?.text || "";
    interactiveId = messageData.button?.payload || null;
  } else if (messageData.type === "interactive") {
    if (messageData.interactive?.type === "button_reply") {
      userMessage = messageData.interactive.button_reply.title;
      interactiveId = messageData.interactive.button_reply.id;
    } else if (messageData.interactive?.type === "list_reply") {
      userMessage = messageData.interactive.list_reply.title;
      interactiveId = messageData.interactive.list_reply.id;
    }
  } else if (messageData.type === "image" || messageData.type === "video") {
    isImage = true;
    userMessage = `[Multimedia: ${messageData.type}]`;
  } else {
    userMessage = `[Multimedia/Otro formato: ${messageData.type}]`;
  }

  if (!userMessage && !isImage) return NextResponse.json({ status: "no_text" });

  console.log(`[WHATSAPP] Mensaje de ${pushName} (${senderNumber}): ${userMessage} (ID: ${interactiveId || 'N/A'})`);

  // 2. Guardar/Actualizar cliente
  await query(
    `INSERT INTO whatsapp_customers (id, full_name, last_seen) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET last_seen = NOW()`,
    [senderNumber, pushName]
  );

  // 3. GUARDAR MENSAJE DEL USUARIO
  await query(
    `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
    [senderNumber, JSON.stringify({ role: 'user', content: userMessage })]
  );

  // 4. Verificar Breaker Global y Bot Pausado
  const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
  const isGlobalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;
  const customerRes = await query("SELECT ai_enabled, followup_status FROM whatsapp_customers WHERE id = $1", [senderNumber]);
  const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;

  if (!isGlobalEnabled || !isAiEnabled) {
    return NextResponse.json({ status: "paused" });
  }

  // ==========================================
  // 🚀 FUNNEL STATE MACHINE (MÁQUINA DE ESTADOS)
  // ==========================================

  // Cargamos el historial completo de la conversación para control permanente de costos de plantillas Meta
  // (Solo se resetea si un asesor elimina el chat desde el panel administrativo)
  const historyRes = await query(
    `SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC`,
    [senderNumber]
  );

  const parsedHistory = historyRes.rows
    .map(r => {
      try {
        return typeof r.message === "string" ? JSON.parse(r.message) : r.message;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const hasAssistantMsg = parsedHistory.some(msg => msg.role === "assistant");

  // ==========================================
  // 🚀 FLUJO GRATUITO MARGARITA (SIN PLANTILLAS PAGADAS)
  // ==========================================

    const STORE_ADDRESS = "Av. Llano Adentro, CC Terranova Plaza, Local A14, Porlamar, Nueva Esparta, Venezuela";
    const STORE_PLUS_CODE = "X49X+XF9 Porlamar, Nueva Esparta, Venezuela";
    const STORE_MAPS_URL = "https://maps.google.com/?q=10.969917,-63.851278";

    const msgText = (userMessage || "").toUpperCase().trim();

    // 🧪 COMANDOS DE PRUEBA DIRECTOS (mantenidos para diagnóstico)
    if (msgText === "TESTAUDIO" || msgText === "AUDIO") {
      console.log(`[TEST] Enviando audio de prueba voice_beneficios.mp3 a ${senderNumber}`);
      const res = await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_beneficios.mp3");
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Audio de prueba 'voice_beneficios.mp3' enviado." })]);
      return NextResponse.json({ status: "test_audio_sent", result: res });
    }

      if (msgText === "TESTVIDEO" || msgText === "VIDEO") {
        console.log(`[TEST] Enviando video de prueba benef2.mp4 a ${senderNumber}`);
        const res = await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/benef2.mp4");
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [senderNumber, JSON.stringify({ role: 'assistant', content: "[Sistema] Video de prueba 'benef2.mp4' enviado." })]);
        return NextResponse.json({ status: "test_video_sent", result: res });
      }

      // 1) PRIMER CONTACTO: Enviar 1 único mensaje de servicio gratuito (ventana 24h, $0 en plantillas)
      if (!hasAssistantMsg) {
        const welcomeMargaritaText =
          `¡Hola! 👋 Bienvenido a *Practiiko Margarita*.\n\n` +
          `Te invitamos a visitar nuestra tienda física para que vivas en persona toda la experiencia Practiiko. ¡Al llegar te estaremos esperando con un *regalo especial de bienvenida* de nuestra parte! 🎁🛋️✨\n\n` +
          `📍 *Dirección:*\n${STORE_ADDRESS}\n` +
          `📌 *Código Plus:* ${STORE_PLUS_CODE}\n` +
          `🗺️ *Cómo llegar (Google Maps):*\n${STORE_MAPS_URL}\n\n` +
          `🕘 *Horario de atención:*\n` +
          `Lunes a viernes: 9:00 a. m. a 4:00 p. m.\n` +
          `Sábados: 9:00 a. m. a 1:00 p. m.\n\n` +
          `📖 *Catálogo:* https://www.practiiko.com/catalogo\n\n` +
          `Si tienes alguna consulta sobre modelos, disponibilidad o deseas coordinar tu visita, escríbenos por acá y uno de nuestros asesores te atenderá de inmediato. 💬`;

          await sendWhatsAppMessage(senderNumber, welcomeMargaritaText);
          await query(
            `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
            [senderNumber, JSON.stringify({ role: 'assistant', type: 'text', content: welcomeMargaritaText })]
          );
          return NextResponse.json({ status: "funnel_margarita_welcome_free" });
        }

        // 2) MENSAJES POSTERIORES DEL CLIENTE: Derivación a asesor humano (sin reenviar bienvenida)
        const mNorm = (userMessage || "").toLowerCase().trim();
        const isPositiveOrAcknowledge =
          mNorm.includes("fino") ||
          mNorm.includes("gracias") ||
          mNorm.includes("gracia") ||
          mNorm.includes("chevere") ||
          mNorm.includes("chévere") ||
          mNorm.includes("bueno") ||
          mNorm.includes("excelente") ||
          mNorm.includes("perfecto") ||
          mNorm.includes("genial") ||
          mNorm.includes("ok") ||
          mNorm.includes("listo") ||
          mNorm.includes("vale") ||
          mNorm.includes("bien") ||
          mNorm.includes("me gusta");

          const handoffText = isPositiveOrAcknowledge
            ? `¡Con mucho gusto! 🎉 Te esperamos en *CC Terranova Plaza, Local A14* (Porlamar) con tu regalo de bienvenida. 🎁✨\n\nSi necesitas algo más antes de visitarnos, uno de nuestros asesores estará atento por acá para ayudarte.`
            : `¡Gracias por escribirnos! 💬 Hemos pasado tu consulta a uno de nuestros asesores en *Practiiko Margarita*, quien te atenderá muy pronto de forma personalizada.\n\n📖 También puedes ir viendo nuestros modelos en: https://www.practiiko.com/catalogo`;

        await sendWhatsAppMessage(senderNumber, handoffText);
        await query(
          `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
          [senderNumber, JSON.stringify({ role: 'assistant', type: 'text', content: handoffText })]
        );
        await query(
          `UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1`,
          [senderNumber]
        );
        return NextResponse.json({ status: "funnel_margarita_handoff" });
      }
