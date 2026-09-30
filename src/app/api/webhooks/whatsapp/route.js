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

// NUEVA FUNCION: Enviar Menú Interactivo de 3 botones (Fase 2)
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

    await fetch(`https://api.ycloud.com/v2/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token },
      body: JSON.stringify(payload)
    });
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

      // Cargamos el historial reciente para saber si el asistente ya le ha hablado previamente
      const historyRes = await query(`SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`, [senderNumber]);
      const hasAssistantMsg = historyRes.rows.some(r => {
        try {
          const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
          return msg && msg.role === 'assistant';
        } catch(e) { return false; }
      });

      // A) EVALUAR INTERCEPTACIÓN POR BOTONES O COMANDOS DE PRUEBA (FASE 3)
      if (interactiveId || userMessage) {
        const msgText = userMessage.toUpperCase().trim();
        
        // 🧪 COMANDOS DE PRUEBA DIRECTOS
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

        if (interactiveId === "btn_sofas" || msgText.includes("SOFAS COMPRIMIDOS") || msgText === "SOFÁS" || msgText === "SOFAS") {
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/video_sofas.mp4?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'video',
              mediaUrl: 'https://auto.practiiko.com/api/media/video_sofas.mp4?v=2',
              content: '📹 Video: Sofás Comprimidos en Caja' 
            })
          ]);
          await delay(500);

          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_sofas.mp3?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'audio',
              mediaUrl: 'https://auto.practiiko.com/api/media/voice_sofas.mp3?v=2',
              content: '🎙️ Nota de voz: Sofás Comprimidos' 
            })
          ]);
          await delay(500);

          const sofaVideos = [
            { name: "Sofa Modular en L", file: "sofa_modular_l.mp4" },
            { name: "Sofa Cama Tandem", file: "sofa_cama_tandem.mp4" },
            { name: "Sofa Avila", file: "sofa_avila.mp4" },
            { name: "Sofa Remanso", file: "sofa_remanso.mp4" },
            { name: "Sofa Cama Plegable", file: "sofa_cama_plegable.mp4" },
            { name: "Sofa Reclinable", file: "sofa_reclinable.mp4" },
            { name: "Sofa Merey", file: "sofa_merey.mp4" },
            { name: "Sofa Caterpillar", file: "sofa_caterpillar.mp4" },
            { name: "Sofa Burbuja", file: "sofa_burbuja.mp4" },
            { name: "Sofa Nube Modular", file: "sofa_nube_modular.mp4" }
          ];

          const carouselSofas = [
            {
              type: "carousel",
              cards: sofaVideos.map((item, idx) => ({
                card_index: idx,
                components: [
                  {
                    type: "header",
                    parameters: [
                      {
                        type: "video",
                        video: { link: `https://auto.practiiko.com/api/media/${item.file}?v=2` }
                      }
                    ]
                  }
                ]
              }))
            }
          ];

          await sendTemplate(senderNumber, "krrusel_a", carouselSofas);
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'carousel',
              template: 'krrusel_a',
              content: '🎠 Carrusel de Sofás Comprimidos (10 modelos con video)',
              cards: sofaVideos.map(s => ({
                title: s.name,
                videoUrl: `https://auto.practiiko.com/api/media/${s.file}?v=2`,
                buttons: ['Contactar a un asesor', 'Más Información']
              }))
            })
          ]);
          return NextResponse.json({ status: "funnel_ruta_a_sofas" });

        } else if (interactiveId === "btn_colchones" || msgText.includes("COLCHONES")) {
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/video_colchones.mp4?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'video',
              mediaUrl: 'https://auto.practiiko.com/api/media/video_colchones.mp4?v=2',
              content: '📹 Video: Colchones' 
            })
          ]);
          await delay(500);

          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_colchones.mp3?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'audio',
              mediaUrl: 'https://auto.practiiko.com/api/media/voice_colchones.mp3?v=2',
              content: '🎙️ Nota de voz: Colchones' 
            })
          ]);
          await delay(500);

          const colchonVideos = [
            { name: "Colchón Individual", file: "colchon_individual.mp4" },
            { name: "Colchón Matrimonial", file: "colchon_matrimonial.mp4" },
            { name: "Colchón Queen", file: "colchon_queen.mp4" },
            { name: "Colchón King", file: "colchon_king.mp4" }
          ];

          const carouselColchones = [
            {
              type: "carousel",
              cards: colchonVideos.map((item, idx) => ({
                card_index: idx,
                components: [
                  {
                    type: "header",
                    parameters: [
                      {
                        type: "video",
                        video: { link: `https://auto.practiiko.com/api/media/${item.file}?v=2` }
                      }
                    ]
                  }
                ]
              }))
            }
          ];

          await sendTemplate(senderNumber, "krrusel_a_c", carouselColchones);
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'carousel',
              template: 'krrusel_a_c',
              content: '🎠 Carrusel de Colchones (4 medidas con video)',
              cards: colchonVideos.map(c => ({
                title: c.name,
                videoUrl: `https://auto.practiiko.com/api/media/${c.file}?v=2`,
                buttons: ['Contactar a un asesor', 'Más Información']
              }))
            })
          ]);
          return NextResponse.json({ status: "funnel_ruta_a_colchones" });

        } else if (interactiveId === "btn_velas" || msgText.includes("VELAS PERLADAS") || msgText.includes("VELAS")) {
          await sendMediaFile(senderNumber, "video", "https://auto.practiiko.com/api/media/video_velas.mp4?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'video',
              mediaUrl: 'https://auto.practiiko.com/api/media/video_velas.mp4?v=2',
              content: '📹 Video: Velas Perladas' 
            })
          ]);
          await delay(500);

          await sendMediaFile(senderNumber, "audio", "https://auto.practiiko.com/api/media/voice_velas.mp3?v=2");
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'audio',
              mediaUrl: 'https://auto.practiiko.com/api/media/voice_velas.mp3?v=2',
              content: '🎙️ Nota de voz: Velas Perladas' 
            })
          ]);
          await delay(500);

          const velasVideos = [
            { name: "Opulencia", file: "vela_opulencia.mp4" },
            { name: "Midas", file: "vela_midas.mp4" },
            { name: "Estoico", file: "vela_estoico.mp4" },
            { name: "Atenea", file: "vela_atenea.mp4" },
            { name: "Venus", file: "vela_venus.mp4" },
            { name: "Vigor", file: "vela_vigor.mp4" }
          ];

          const carouselVelas = [
            {
              type: "carousel",
              cards: velasVideos.map((item, idx) => ({
                card_index: idx,
                components: [
                  {
                    type: "header",
                    parameters: [
                      {
                        type: "video",
                        video: { link: `https://auto.practiiko.com/api/media/${item.file}?v=2` }
                      }
                    ]
                  }
                ]
              }))
            }
          ];

          await sendTemplate(senderNumber, "krrusel_a_v", carouselVelas);
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
            senderNumber, 
            JSON.stringify({ 
              role: 'assistant', 
              type: 'carousel',
              template: 'krrusel_a_v',
              content: '🎠 Carrusel de Velas Perladas (6 fragancias/modelos con video)',
              cards: velasVideos.map(v => ({
                title: v.name,
                videoUrl: `https://auto.practiiko.com/api/media/${v.file}?v=2`,
                buttons: ['Contactar a un asesor', 'Más Información']
              }))
            })
          ]);
          return NextResponse.json({ status: "funnel_ruta_b_velas" });

        } else if (
          (interactiveId && (interactiveId.includes("asesor") || interactiveId.includes("contactar"))) ||
          msgText.includes("CONTACTAR A UN ASESOR") ||
          msgText.includes("CONTACTAR ASESOR") ||
          msgText.includes("ASESOR")
        ) {
          const replyText = `🎉 ¡Gracias por elegir Practiiko!\n\nHemos recibido tu solicitud correctamente. 🛋️✨\nMuy pronto, un asesor especializado de Practiiko se pondrá en contacto contigo para continuar con tu atención y ayudarte con los siguientes pasos.\n\n🕘 *Nuestro horario de atención:*\nLunes a viernes: 9:00 a. m. a 4:00 p. m.\nSábados: 9:00 a. m. a 1:00 p. m.\n\nSi nos escribes fuera de este horario, no te preocupes: hemos recibido tu mensaje y un asesor te contactará en nuestro próximo horario de atención.\n\n💬 ¡Gracias por confiar en Practiiko! Estamos aquí para ayudarte.`;
          await sendWhatsAppMessage(senderNumber, replyText);
          await query(
            `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
            [senderNumber, JSON.stringify({ role: 'assistant', content: replyText })]
          );
          // Pausar IA y marcar que requiere asesor humano
          await query(
            `UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1`,
            [senderNumber]
          );
          return NextResponse.json({ status: "funnel_contactar_asesor" });

        } else if (
          (interactiveId && (interactiveId.includes("info") || interactiveId.includes("mas_info") || interactiveId.includes("catalogo"))) ||
          (hasAssistantMsg && (
            msgText.includes("MAS INFORMACION") ||
            msgText.includes("MÁS INFORMACIÓN") ||
            msgText.includes("MAS INFORMACION") ||
            msgText.includes("MÁS INFORMACION") ||
            msgText.includes("PRECIO") ||
            msgText.includes("PRECIOS") ||
            msgText.includes("CUANTO") ||
            msgText.includes("CUÁNTO") ||
            msgText.includes("CUESTA") ||
            msgText.includes("VALE") ||
            msgText.includes("CATALOGO") ||
            msgText.includes("CATÁLOGO")
          ))
        ) {
          // Detectar si el usuario viene de un carrusel específico (Sofás, Colchones, Velas Perladas)
          let catalogUrl = "https://www.practiiko.com/catalogo";
          let categoryName = "";

          try {
            const lastMessages = await query(
              `SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 8`,
              [senderNumber]
            );

            for (const row of lastMessages.rows) {
              const msgData = typeof row.message === "string" ? JSON.parse(row.message) : row.message;
              const template = (msgData?.template || "").toLowerCase();
              const content = (msgData?.content || "").toLowerCase();

              if (template === "krrusel_a_v" || content.includes("velas") || content.includes("vela")) {
                catalogUrl = "https://www.practiiko.com/catalogo?categoria=velas-perladas";
                categoryName = " de Velas Perladas";
                break;
              } else if (template === "krrusel_a_c" || content.includes("colchón") || content.includes("colchon")) {
                catalogUrl = "https://www.practiiko.com/catalogo?categoria=colchones";
                categoryName = " de Colchones";
                break;
              } else if (template === "krrusel_a" || content.includes("sofá") || content.includes("sofa")) {
                catalogUrl = "https://www.practiiko.com/catalogo?categoria=sofas";
                categoryName = " de Sofás";
                break;
              }
            }
          } catch (err) {
            console.error("Error detecting carousel context for catalog URL:", err);
          }

          const replyText = `Con gusto. Puede consultar nuestros modelos, medidas y precios a tasa oficial BCV directamente en nuestra sección${categoryName} del catálogo oficial:\n${catalogUrl}`;
          await sendWhatsAppMessage(senderNumber, replyText);
          await query(
            `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
            [senderNumber, JSON.stringify({ role: 'assistant', content: replyText })]
          );
          return NextResponse.json({ status: "funnel_mas_informacion" });
        }
      }

      // B) EVALUAR INTERCEPTACIÓN DE PRIMER CONTACTO (FASE 2)
      const mNorm = userMessage.toLowerCase().trim();
      let isFirstContact = false;

      // Si es su primer mensaje (el bot nunca le ha respondido), o manda "menu", o viene de Instagram, lanzamos la bienvenida
      if (!hasAssistantMsg || mNorm === "menu" || mNorm.includes("hola") || mNorm.includes("quiero transformar mi hogar")) {
        isFirstContact = true;
      }

      if (isFirstContact) {
        await delay(500); // Retraso reducido a 500ms
        
        // La plantilla 'welcome' configurada con header de formato GIF (esperado por Meta para esta plantilla)
        const headerComponent = [
          {
            type: "header",
            parameters: [
              {
                type: "gif",
                gif: { link: "https://auto.practiiko.com/api/media/gif_welcome.mp4?v=2" }
              }
            ]
          }
        ];
        
        await sendTemplate(senderNumber, "welcome", headerComponent);
        
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [
          senderNumber, 
          JSON.stringify({ 
            role: 'assistant', 
            type: 'template',
            template: 'welcome',
            videoUrl: 'https://auto.practiiko.com/api/media/gif_welcome.mp4?v=2',
            content: "¡Bienvenido a PRACTIIKO!\nEstamos aquí para ayudarte a encontrar la solución perfecta para tu hogar.\n¿Qué quieres ver?",
            buttons: ['SOFAS COMPRIMIDOS', 'COLCHONES', 'VELAS PERLADAS']
          })
        ]);
        return NextResponse.json({ status: "funnel_fase2_template" });
      }

      // C) INTERCEPTAR COMENTARIOS, AGRADECIMIENTOS O FEEDBACK POST-CATÁLOGO (SIN COSTO DE PLANTILLA)
      // Detecta frases comunes venezolanas y de cortesía: "ta fino", "gracias", "ok", "chévere", "me gusta", etc.
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
        mNorm.includes("me gusta") || 
        mNorm.includes("bellos") || 
        mNorm.includes("hermosos");

      // Comprobar si el asistente le envió el catálogo recientemente
      const sentCatalogRecently = historyRes.rows.some(r => {
        try {
          const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
          const c = (msg?.content || "").toLowerCase();
          return c.includes("catálogo") || c.includes("catalogo") || c.includes("practiiko.com/catalogo");
        } catch(e) { return false; }
      });

      if (isPositiveOrAcknowledge || sentCatalogRecently) {
        // Enviar mensaje de texto regular (NO plantilla de marketing pagada) con cierre hacia asesor
        const politeReply = "¡Nos alegra mucho! 🎉\n\nSi deseas ordenar algún modelo, consultar disponibilidad de colores o tiempos de entrega a tu ciudad, déjanos tu consulta por acá y con gusto uno de nuestros asesores te atenderá de inmediato. ✨";
        await sendWhatsAppMessage(senderNumber, politeReply);
        await query(
          `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
          [senderNumber, JSON.stringify({ role: 'assistant', content: politeReply })]
        );
        // Pausar bot para que las siguientes respuestas del cliente sean atendidas por el equipo humano
        await query(
          `UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1`,
          [senderNumber]
        );
        return NextResponse.json({ status: "funnel_post_catalog_polite_reply" });
      }

      // ==========================================
      // MENSAJES LIBRES NO CUBIERTOS: REORIENTAR AL FLUJO DETERMINISTA
      // (Se desconectó DeepSeek/Gemini a petición de la dirección de la empresa)
      // ==========================================
      await delay(500);
      const headerComponent = [
        {
          type: "header",
          parameters: [
            {
              type: "gif",
              gif: { link: "https://auto.practiiko.com/api/media/gif_welcome.mp4?v=2" }
            }
          ]
        }
      ];
      await sendTemplate(senderNumber, "welcome", headerComponent);
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [
          senderNumber, 
          JSON.stringify({ 
            role: 'assistant', 
            type: 'template',
            template: 'welcome',
            videoUrl: 'https://auto.practiiko.com/api/media/gif_welcome.mp4?v=2',
            content: "¡Bienvenido a PRACTIIKO!\nEstamos aquí para ayudarte a encontrar la solución perfecta para tu hogar.\n¿Qué quieres ver?",
            buttons: ['SOFAS COMPRIMIDOS', 'COLCHONES', 'VELAS PERLADAS']
          })
        ]
      );
      return NextResponse.json({ status: "funnel_reorient_welcome" });
}
