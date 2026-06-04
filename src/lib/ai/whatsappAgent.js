import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { query } from "@/lib/db";
import { getWhatsappPrompt } from "./prompts";

let _model;
function getModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com";

  if (!apiKey || apiKey === "") {
    if (process.env.NODE_ENV === 'production') {
      console.warn("⚠️ Advertencia: DEEPSEEK_API_KEY no detectada.");
    }
    return null;
  }

  if (!_model) {
    _model = new ChatOpenAI({
      openAIApiKey: apiKey,
      configuration: { baseURL: baseUrl },
      modelName: "deepseek-chat",
      temperature: 0.2, // Respuestas deterministas
      maxTokens: 500
    });
  }
  return _model;
}

function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .trim();
}

function levenshtein(a, b) {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (i = 0; i <= alen; i++) tmp[i] = [i];
  for (j = 0; j <= blen; j++) tmp[0][j] = j;
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
}

function isFuzzyMatch(term, text) {
  const cleanText = normalize(text);
  const cleanTerm = normalize(term);
  if (cleanText.includes(cleanTerm)) return true;

  const textWords = cleanText.split(/[\s,?.!/-]+/).filter(w => w.length >= 3);
  for (const word of textWords) {
    const dist = levenshtein(cleanTerm, word);
    const maxAllowedDist = cleanTerm.length > 6 ? 2 : (cleanTerm.length >= 4 ? 1 : 0);
    if (dist <= maxAllowedDist) {
      return true;
    }
  }
  return false;
}

function detectIntent(message) {
  const m = normalize(message);

  // 0. Bienvenida especial para clientes referidos desde Instagram
  // Estos clientes ya llegaron a WhatsApp — no asumir intención de compra, solo dar bienvenida y ofrecer ayuda.
  if (m.includes("vengo de instagram") || m.includes("vengo de ig") || m.includes("vengo del instagram")) return "INSTAGRAM_REFERRAL";

  // 1. Solicitud Humana (PRIORITARIA)
  if (m.includes("asesor") || m.includes("humano") || m.includes("persona") || m.includes("atenderme") || m.includes("hablar con alguien") || m.includes("hablar con un")) return "HUMAN_REQUEST";

  // 1.2. Consulta sobre publicidad, preventas o modelo ausente en catálogo
  if (
    m.includes("publicidad") || m.includes("anuncio") || m.includes("propaganda") || 
    m.includes("promocion") || m.includes("preventa") || m.includes("nuevo modelo") ||
    m.includes("no sale") || m.includes("no aparece") || m.includes("no esta en el catalogo") || 
    m.includes("no lo encuentro") || m.includes("redes") || m.includes("instagram") || 
    m.includes("publicacion") || m.includes("post") || m.includes("story") || m.includes("historia")
  ) return "AD_OR_NEW_MODEL_QUERY";

  // Cortesía simple (evaluar después de redirección para no cortocircuitar)
  if (["gracias", "ok", "dale", "perfecto", "entendido"].some(w => m.includes(w))) return "OTHER";

  if (m.includes("precio") || m.includes("cuanto") || m.includes("cuesta") || m.includes("vale")) return "PRICE_INFO";
  if (m.includes("catalogo") || m.includes("ver todo")) return "CATALOG";
  if (m.includes("sofa") || m.includes("colchon") || m.match(/[a-z]\d{3}/)) return "PRODUCT_QUERY";
  if (m.includes("hola") || m.includes("buen")) return "GREETING";

  return "OTHER";
}

function extractKeywords(message) {
  const m = normalize(message);

  const stopWords = [
    "hola", "precio", "precios", "cuanto", "cuesta", "vale", "quiero", "saber", "tienen", "buenas", "tardes", "dias", "noches", 
    "favor", "gracias", "para", "como", "esta", "donde", "tiene", "busco", "necesito", "algun",
    "muestrame", "muestra", "ver", "fotos", "foto", "imagenes", "imagen", "del", "las", "los", "una", "uno", "unos", "unas", 
    "este", "esto", "de", "el", "la", "ese", "eso", "esa", "esos", "esas", "aqui", "alla", "mueble", "muebles", 
    "sofa", "sofas", "colchon", "colchones", "modelo", "modelos", "gustaria", "mas", "informacion", "detalle", "detalles",
    "enviar", "mandar", "pasar", "saber", "conocer", "por", "con", "que", "sus", "estos", "estas", "cual", "cuales", "dame"
  ];
  const words = m.split(/[\s,?.!]+/).filter(w => w.length >= 3 && !stopWords.includes(w));

  return words.length > 0 ? words : null;
}

// Detecta cuando el cliente usa referencias de contexto (pronombres/referencias a mensajes anteriores)
const CONTEXT_REFS = [
  "el mismo", "la misma", "ese", "esa", "de ese", "de esa",
  "ese modelo", "ese mueble", "esa pieza", "el de la publicidad",
  "la de la publicidad", "el que sale", "el que aparece", "el que mostraste",
  "el que me mandaste", "el que vimos", "el que estaba", "el que salio",
  "el que salia", "el del anuncio", "el del video"
];

function detectContextReference(message) {
  const m = normalize(message);
  return CONTEXT_REFS.some(ref => m.includes(normalize(ref)));
}

// Extrae keywords de los mensajes anteriores del usuario (para resolver referencias contextuales)
function extractLastUserKeywords(historyRaw) {
  // Recorre el historial de más reciente a más antiguo buscando keywords de usuario
  const reversed = [...historyRaw].reverse();
  for (const msg of reversed) {
    if (msg.role !== 'user') continue;
    const kw = extractKeywords(msg.content);
    if (kw && kw.length > 0) return kw;
  }
  return null;
}

async function getInventory(terms, currentIntent) {
  try {
    const queryStr = `
      SELECT p.id as product_id, p.name, p.description, p.price_bcv, p.price_cash, p.code, p.stock,
             c.name as categoria,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_main DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND p.stock > 0
      ORDER BY p.id ASC
    `;
    const { rows } = await query(queryStr);

    let isFallback = false;
    let finalRows = rows;
    let found = false;

    if (terms && terms.length > 0) {
      const normalizedTerms = terms.map(t => normalize(t));
      
      finalRows = rows.filter(r => {
        const nameVal = r.name || "";
        const catVal = r.categoria || "";
        const descVal = r.description || "";
        const codeVal = r.code || "";

        return normalizedTerms.some(term => 
          isFuzzyMatch(term, nameVal) ||
          isFuzzyMatch(term, catVal) ||
          isFuzzyMatch(term, descVal) ||
          isFuzzyMatch(term, codeVal)
        );
      });

      if (finalRows.length > 0) {
        found = true;
      } else {
        // Fallback: si no coincide ninguno, mostrar todo el inventario
        finalRows = rows;
        found = false;
        isFallback = true;
      }
    } else {
      found = rows.length > 0;
    }

    const categories = [];
    finalRows.forEach((r) => {
      if (r.categoria && !categories.includes(r.categoria)) {
        categories.push(r.categoria);
      }
    });

    const productsText = finalRows.map((p) => {
      const imageUrl = p.image_url || "No disponible";
      return `💎 MODELO: ${p.name}
- Código: ${p.code || "N/A"}
- Categoría: ${p.categoria || "N/A"}
- Descripción: ${p.description || "N/A"}
- Precio BCV: $${p.price_bcv}
- Imagen: (URL_FOTO: ${imageUrl}) 💎`;
    }).join("\n\n");

    const categoriesText = categories.length > 0 ? `CATEGORÍAS DISPONIBLES: ${categories.join(", ")}` : "";

    return {
      found,
      text: `${categoriesText}\n\n${productsText}`,
      isFallback,
      rows: finalRows
    };
  } catch (e) {
    console.error("[DB ERROR]:", e);
    return { found: false, text: "", isFallback: false, rows: [] };
  }
}

async function buildResponse(message, customerName, inventory, historyMessages, dynamicKnowledge = "", isFallback = false, isGeneralPriceQuery = false) {
  const prompt = getWhatsappPrompt(inventory.text, dynamicKnowledge, isFallback);

  try {
    const model = getModel();
    if (!model) throw new Error("Model not initialized (missing API Key)");

    const alreadySentLink = historyMessages.some(m => 
      m instanceof AIMessage && 
      (m.content.toLowerCase().includes("practiiko.com") || m.content.toLowerCase().includes("catalogo"))
    );

    const userPideLink = message.toLowerCase().includes("link") || 
                         message.toLowerCase().includes("enlace") || 
                         message.toLowerCase().includes("pagina") || 
                         message.toLowerCase().includes("página") || 
                         message.toLowerCase().includes("web") || 
                         message.toLowerCase().includes("catalogo") || 
                         message.toLowerCase().includes("catálogo") ||
                         isGeneralPriceQuery;

    const suppressLink = alreadySentLink && !userPideLink;

    const finalMessages = [
      new SystemMessage(prompt),
      ...historyMessages
    ];

    if (suppressLink) {
      finalMessages.push(new SystemMessage("REGLA DE CONTROL DE ENLACES: Ya le has enviado el enlace del catálogo web al cliente en los mensajes anteriores de esta conversación. Por lo tanto, queda estrictamente PROHIBIDO incluir cualquier URL (como https://www.practiiko.com o https://www.practiiko.com/catalogo) en tu respuesta actual. Si necesitas hacer referencia al catálogo o a la página, hazlo textualmente (ej. 'en nuestra página web' o 'en el catálogo') sin escribir el enlace literal."));
    }

    // REGLA ANTI-SALUDO REPETIDO: Si el asistente ya saludó al cliente, prohibir volver a saludar.
    const alreadyGreeted = historyMessages.some(m =>
      m instanceof AIMessage &&
      (m.content.toLowerCase().includes("hola") ||
       m.content.toLowerCase().includes("bienvenid") ||
       m.content.toLowerCase().includes("gracias por comunicarte") ||
       m.content.toLowerCase().includes("fue un placer"))
    );
    if (alreadyGreeted) {
      finalMessages.push(new SystemMessage("REGLA ANTI-SALUDO REPETIDO (CRÍTICA): Ya saludaste al cliente anteriormente en esta conversación. Queda TERMINANTEMENTE PROHIBIDO comenzar tu respuesta con \"¡Hola!\", \"Hola\", \"Bienvenido\", \"Bienvenida\" o cualquier variante de saludo. Ve directo al punto y responde la consulta del cliente sin preámbulos de bienvenida."));
    }

    finalMessages.push(new SystemMessage("REGLA CRÍTICA DE RESPUESTA: Si el cliente ha pedido fotos, imágenes o ver el modelo, DEBES obligatoriamente escribir 'URL_FOTO: [URL]' para cada color del inventario que le nombres. NUNCA respondas con una línea en blanco debajo del nombre del color. El formato exacto debe ser:\n\n*Color NombreColor*:\nURL_FOTO: /api/media/..."));
    finalMessages.push(new HumanMessage(message));

    const response = await model.invoke(finalMessages);
    return response.content;
  } catch (error) {
    console.error("DEBUG - DeepSeek Error:", error.message);
    return `¡Hola ${customerName}! 😊 Estamos teniendo un pequeño inconveniente técnico. Te invitamos a ver nuestro catálogo completo en https://www.practiiko.com/catalogo o en breve un asesor te atenderá. Es lujo, es simple, es Practiiko 💎`;
  }
}

export async function processWhatsappMessage(message, sessionId, customerName = "Cliente", baseUrl = "") {
  try {
    // 1. Verificar si el bot está pausado para este cliente
    const customerRes = await query("SELECT ai_enabled FROM whatsapp_customers WHERE id = $1", [sessionId]);
    const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;
    if (!isAiEnabled) {
      console.log(`[WHATSAPP AGENT] Bot pausado para ${sessionId}.`);
      return { text: "", imageUrls: [], ignored: true };
    }

    // 🎯 DETECCIÓN DE MENSAJE DE ANUNCIO DE INSTAGRAM
    // Meta envía este mensaje predeterminado cuando el cliente presiona "Más información" en un anuncio.
    // El bot no tiene contexto de "qué es esto", así que lo interceptamos y guiamos al catálogo.
    const AD_MESSAGES = [
      "¡hola! me gustaría conseguir más información sobre esto.",
      "hola! me gustaria conseguir mas informacion sobre esto.",
      "me gustaría conseguir más información sobre esto",
      "me gustaria conseguir mas informacion sobre esto",
      "¡hola! quiero más información",
      "hola! quiero mas informacion",
    ];
    const normalizedMsg = normalize(message);
    const isAdMessage = AD_MESSAGES.some(ad => normalizedMsg.includes(normalize(ad)));

    if (isAdMessage) {
      const adResponse = `¡Hola ${customerName}! Qué gusto tenerte por aquí 🌹 Veo que te interesó nuestro anuncio. Te invito a descubrir toda nuestra colección de sofás y muebles en nuestro catálogo digital: https://www.practiiko.com/catalogo ✨\n\n¿Hay algún modelo o estilo en particular que te llame la atención? Con gusto te doy el precio al instante 💎`;

      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: adResponse })]);

      return { text: adResponse, imageUrls: [] };
    }

    // 2. Cargar historial primero para determinar si es una conversación en curso
    const historyRes = await query(
      `SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`,
      [sessionId]
    );

    // Determinar si ya hubo respuestas previas del asistente (evita bucles o saludos repetidos)
    let hasChatHistory = false;
    if (historyRes.rows.length > 0) {
      hasChatHistory = historyRes.rows.some(r => {
        try {
          const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
          return msg && msg.role === 'assistant';
        } catch (e) {
          return false;
        }
      });
    }

    const intent = detectIntent(message);

    // Si detectamos saludo ("hola", "buenas"), solo enviamos el mensaje duro de bienvenida si NO hay historial de chat previo.
    // Si ya hay conversación, dejamos que la IA responda de forma natural y respetuosa.
    if (intent === "GREETING" && !hasChatHistory) {
      const greetingResponse = `👋🏼 ¡Hola! Gracias por comunicarte con nosotros

Te invitamos a visitar nuestra pagina web www.practiiko.com con información de interes para ti. Puedes consultar nuestro catálogo de muebles y colchones en el siguiente enlace: 

www.practiiko.com/catalogo

📄Deja tu consulta detallada y en breve le atenderemos. ¡Gracias por tu paciencia! 😊`;

      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: greetingResponse })]);

      return { text: greetingResponse, imageUrls: [] };
    }

    // GESTIÓN DE INTENCIONES
    let currentIntent = intent;
    if (intent === "GREETING" || intent === "OTHER") currentIntent = "CATALOG";
    // INSTAGRAM_REFERRAL se gestiona en su propio Fast Path — no remapear a CATALOG

    // Evitar duplicar el mensaje actual si ya fue insertado por el webhook
    if (historyRes.rows.length > 0) {
      try {
        const mostRecentRaw = historyRes.rows[0].message;
        const mostRecentMsg = typeof mostRecentRaw === 'string' ? JSON.parse(mostRecentRaw) : mostRecentRaw;
        if (mostRecentMsg && mostRecentMsg.role === 'user' && mostRecentMsg.content === message) {
          historyRes.rows.shift();
        }
      } catch (e) {
        console.warn("Error filtrando mensaje actual del historial:", e.message);
      }
    }

    const historyMessagesRaw = historyRes.rows.reverse().map(r => {
      if (!r.message) return null;
      let msg;
      try {
        msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
      } catch (e) {
        msg = { role: 'user', content: String(r.message) };
      }
      if (!msg || typeof msg !== 'object') return null;
      return { role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content || "" };
    }).filter(Boolean);

    // Eliminar los mensajes del usuario consecutivos más recientes (al final de la lista ASC)
    // para evitar duplicación con el mensaje combinado actual.
    while (historyMessagesRaw.length > 0 && historyMessagesRaw[historyMessagesRaw.length - 1].role === 'user') {
      historyMessagesRaw.pop();
    }

    // --- GUARDRAIL FÍSICO ANTI-BUCLE (FAIL-SAFE) ---
    let catalogRefCount = 0;
    let modelNameRefCount = 0;
    
    historyMessagesRaw.forEach(msg => {
      if (msg.role === 'assistant') {
        const cNorm = normalize(msg.content);
        if (cNorm.includes("catalogo") || cNorm.includes("practiiko.com")) {
          catalogRefCount++;
        }
        if (cNorm.includes("nombre del modelo") || cNorm.includes("cual es el modelo") || cNorm.includes("indicarme el nombre") || cNorm.includes("modelo que te interesa")) {
          modelNameRefCount++;
        }
      }
    });

    const isLoopDetected = catalogRefCount >= 2 || modelNameRefCount >= 2 || (catalogRefCount + modelNameRefCount >= 3);
    if (isLoopDetected) {
      console.log(`[WHATSAPP AGENT] Guardrail Anti-Bucle activado para ${sessionId}. Forzando transferencia.`);
      const loopResponse = "¡Entendido perfectamente! 🌹 Veo que no logramos identificar el modelo exacto que buscas por este medio automático. No te preocupes en lo absoluto: en este mismo instante te estoy transfiriendo con uno de nuestros asesores de ventas especializados para que te atienda de forma personalizada y revise tu consulta de inmediato. Te escribirá aquí mismo en breve. 💎";
      
      const motivo = "🚨 GUARDRAIL ANTI-BUCLE (TRANSFERENCIA)";
      const replyLink = `https://wa.me/${sessionId}`;
      const notifyText = `${motivo}\n\n*Canal:* WHATSAPP\n*Cliente:* ${customerName} (+${sessionId})\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\n${replyLink}`;

      const EVO_URL = process.env.EVOLUTION_API_URL;
      const EVO_KEY = process.env.EVOLUTION_API_KEY;
      const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
      const adminPhone = "584248068515";
      const groupId = process.env.NOTIFICATIONS_GROUP_ID;

      if (EVO_URL) {
        try {
          await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify({ number: adminPhone, text: notifyText })
          });
          if (groupId) {
            await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
              body: JSON.stringify({ number: groupId, text: notifyText })
            });
          }
        } catch(e) {
          console.error("Error en flujo de notificaciones WhatsApp (Guardrail):", e);
        }
      }

      try {
        await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human WhatsApp (Guardrail):", e);
      }
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: loopResponse })]);

      return { text: loopResponse, imageUrls: [] };
    }

    // Agrupar mensajes consecutivos del mismo rol
    const groupedMessages = [];
    for (const msg of historyMessagesRaw) {
      if (groupedMessages.length > 0 && groupedMessages[groupedMessages.length - 1].role === msg.role) {
        groupedMessages[groupedMessages.length - 1].content += "\n" + msg.content;
      } else {
        groupedMessages.push({ ...msg });
      }
    }

    const historyMessages = groupedMessages.map(msg => {
      return msg.role === 'assistant' ? new AIMessage(msg.content) : new HumanMessage(msg.content);
    });

    // 3a. Bienvenida para clientes referidos desde Instagram (Fast Path - sin pausar bot)
    if (currentIntent === "INSTAGRAM_REFERRAL") {
      const igResponse = `¡Bienvenido/a a Practiiko! 🌹 Qué bueno que nos escribes desde Instagram.

Puedes ver nuestro catálogo completo aquí:
👉 www.practiiko.com/catalogo

¿Qué te gustaría conocer? ¿Precios, modelos, disponibilidad? Dale un vistazo al catálogo y cuéntame qué modelo te gusta más 😊`;

      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: igResponse })]);

      return { text: igResponse, imageUrls: [] };
    }

    // 3b. Manejo de HUMAN_REQUEST, BUY_REQUEST y AD_OR_NEW_MODEL_QUERY (ALERTA CRÍTICA - Fast Path)
    if (currentIntent === "HUMAN_REQUEST" || currentIntent === "BUY_REQUEST" || currentIntent === "AD_OR_NEW_MODEL_QUERY") {
      let response = "Entendido 💎. Para brindarte la mejor información de manera personalizada, en este mismo instante te estoy transfiriendo con uno de nuestros asesores de ventas especializados. Te atenderá por este mismo chat en breve.";
      if (currentIntent === "BUY_REQUEST") {
        response = "¡Excelente elección! 💎 Para ayudarte a concretar tu compra de inmediato, en este mismo instante te estoy comunicando con uno de nuestros asesores de ventas especializados, quien te atenderá aquí mismo en breve.";
      } else if (currentIntent === "AD_OR_NEW_MODEL_QUERY") {
        response = "¡Entiendo perfectamente! 🌹 A veces publicamos adelantos de temporada, preventas exclusivas o campañas de nuevos modelos que aún no están subidos a nuestro catálogo web. Para brindarte todos los detalles exactos y confirmar su llegada, en este mismo instante te estoy transfiriendo con uno de nuestros asesores de ventas especializados. Te atenderá por aquí en breve. 💎";
      }

      const motivo = currentIntent === "BUY_REQUEST" ? "🔥 INTENCIÓN DE COMPRA" : 
                    (currentIntent === "AD_OR_NEW_MODEL_QUERY" ? "📢 CONSULTA PUBLICIDAD/PREVENTA" : "🚨 SOLICITUD HUMANA");
      const replyLink = `https://wa.me/${sessionId}`;
      const notifyText = `${motivo}\n\n*Canal:* WHATSAPP\n*Cliente:* ${customerName} (+${sessionId})\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\n${replyLink}`;

      const EVO_URL = process.env.EVOLUTION_API_URL;
      const EVO_KEY = process.env.EVOLUTION_API_KEY;
      const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
      const adminPhone = "584248068515";
      const groupId = process.env.NOTIFICATIONS_GROUP_ID;

      if (EVO_URL) {
        try {
          await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify({ number: adminPhone, text: notifyText })
          });
          if (groupId) {
            await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
              body: JSON.stringify({ number: groupId, text: notifyText })
            });
          }
        } catch(e) {
          console.error("Error en flujo de notificaciones WhatsApp:", e);
        }
      }

      // El webhook ya guardó el mensaje del usuario — solo guardamos la respuesta del bot
      try {
        await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human WhatsApp:", e);
      }
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: response })]);

      return { text: response, imageUrls: [] };
    }

    // 4. Buscar Inventario (con soporte de referencias contextuales)
    const isContextRef = detectContextReference(message);
    let terms;
    if (isContextRef) {
      // El cliente dice "el mismo", "ese", etc. — recuperar keywords del historial
      terms = extractLastUserKeywords(historyMessagesRaw) || extractKeywords(message);
      console.log(`[WHATSAPP AGENT] Referencia contextual detectada. Keywords recuperados del historial:`, terms);
    } else {
      terms = extractKeywords(message);
    }
    const inventory = await getInventory(terms, currentIntent);
    const isGeneralPriceQuery = intent === "PRICE_INFO" && (!terms || terms.length === 0);

    // 5. Cargar instrucciones personalizadas de la BD
    let dynamicKnowledge = "";
    try {
      const settingsRes = await query("SELECT value FROM app_settings WHERE key = 'ai_custom_instructions'");
      if (settingsRes.rows.length > 0) {
        dynamicKnowledge = settingsRes.rows[0].value;
      }
    } catch (e) {
      console.warn("No se pudo cargar ai_custom_instructions de la BD:", e.message);
    }



    // 7. Invocar LLM
    const rawResponse = await buildResponse(message, customerName, inventory, historyMessages, dynamicKnowledge, inventory.isFallback, isGeneralPriceQuery);

    console.log(`[DEBUG WHATSAPP LLM RAW]\n${rawResponse}\n[DEBUG WHATSAPP LLM RAW END]`);

    let cleanResponse = rawResponse;
    let shouldTransfer = false;

    if (cleanResponse.includes("[TRANSFER]")) {
      shouldTransfer = true;
      cleanResponse = cleanResponse.replace(/\[TRANSFER\]/gi, "").trim();
    }

    if (shouldTransfer) {
      const motivo = "🚨 SOLICITUD HUMANA (IA)";
      const replyLink = `https://wa.me/${sessionId}`;
      const notifyText = `${motivo}\n\n*Canal:* WHATSAPP\n*Cliente:* ${customerName} (+${sessionId})\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\n${replyLink}`;

      const EVO_URL = process.env.EVOLUTION_API_URL;
      const EVO_KEY = process.env.EVOLUTION_API_KEY;
      const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
      const adminPhone = "584248068515";
      const groupId = process.env.NOTIFICATIONS_GROUP_ID;

      if (EVO_URL) {
        try {
          await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify({ number: adminPhone, text: notifyText })
          });
          if (groupId) {
            await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
              body: JSON.stringify({ number: groupId, text: notifyText })
            });
          }
        } catch(e) {
          console.error("Error en flujo de notificaciones (IA-TRANSFER) WhatsApp:", e);
        }
      }

      try {
        await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human (IA-TRANSFER) WhatsApp:", e);
      }
    }

    // Extraer URLs de imágenes
    let imageUrls = [];
    const imgMatches = [...cleanResponse.matchAll(/URL_FOTO:\s*([^\s]+)/gi)];
    if (imgMatches.length > 0) {
      imageUrls = imgMatches.map(m => {
        let url = m[1].trim();
        if (url.startsWith('/') && baseUrl) {
          url = `${baseUrl}${url}`;
        }
        return url;
      });
      cleanResponse = cleanResponse.replace(/URL_FOTO:\s*[^\s]+/gi, "").trim();
    }

    // Fallback de extracción de imágenes
    if (imageUrls.length === 0 && inventory.found && inventory.rows) {
      const textHistory = historyMessages.map(m => m.content || "").join(" ");
      const normalizeMsg = normalize(message);
      const normalizeRawResp = normalize(rawResponse);
      const normalizeHistory = normalize(textHistory);
      const fullContext = normalizeHistory + " " + normalizeMsg + " " + normalizeRawResp;

      const userPideFotos = normalizeMsg.includes("foto") || 
                            normalizeMsg.includes("imagen") || 
                            normalizeMsg.includes("imagenes") || 
                            normalizeMsg.includes("ver") || 
                            normalizeMsg.includes("mostra") || 
                            normalizeMsg.includes("muestr");
                            
      const botEntregaFotos = (normalizeRawResp.includes("foto") || 
                              normalizeRawResp.includes("imagen") || 
                              normalizeRawResp.includes("imagenes")) && 
                             (normalizeRawResp.includes("aqui tiene") || 
                              normalizeRawResp.includes("aqui esta") || 
                              normalizeRawResp.includes("te muestro") || 
                              normalizeRawResp.includes("te envio") || 
                              normalizeRawResp.includes("foto de") || 
                              normalizeRawResp.includes("imagen de") || 
                              normalizeRawResp.includes("estas son") ||
                              normalizeRawResp.includes("aqui adjunto") ||
                              normalizeRawResp.includes("en la imagen"));

      if (userPideFotos || botEntregaFotos) {
        let mentionedColor = "";
        const COLORS_LIST = ["blanco", "negro", "gris", "beige", "azul", "verde", "arena", "crema", "rosado", "naranja", "oliva"];
        for (const col of COLORS_LIST) {
          if (normalizeMsg.includes(col) || normalizeRawResp.includes(col)) {
            mentionedColor = col;
            break;
          }
        }

        const GENERIC_WORDS = [
          "sofa", "sofas", "sofá", "sofás", "modular", "mueble", "muebles", "poltrona", "butaca", 
          "sillon", "sillón", "mesa", "juego", "para", "tres", "puestos", "asientos", 
          "gris", "claro", "medio", "verde", "oliva", "arena", "blanco", "beige", 
          "azul", "negro", "crema", "naranja", "rosado"
        ];
        
        inventory.rows.forEach(r => {
          if (r.image_url) {
            const prodName = normalize(r.name);
            const prodCode = normalize(r.code || "");
            const prodPseudonimo = normalize(r.pseudonimo || "");
            
            const nameWords = prodName.split(" ").filter(word => !GENERIC_WORDS.includes(word));
            
            const nameMentioned = (nameWords.some(word => word.length >= 3 && fullContext.includes(word))) || 
                                  (prodPseudonimo && fullContext.includes(prodPseudonimo)) ||
                                  (prodCode && fullContext.includes(prodCode));
            
            let matchesColor = true;
            if (mentionedColor) {
              matchesColor = prodName.includes(mentionedColor);
            }
            
            if (nameMentioned && matchesColor) {
              let url = r.image_url.trim();
              if (url.startsWith('/') && baseUrl) {
                url = `${baseUrl}${url}`;
              }
              if (!imageUrls.includes(url)) {
                imageUrls.push(url);
              }
            }
          }
        });
      }
    }

    // Guardar en DB
    await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
      [sessionId, JSON.stringify({ role: 'assistant', content: cleanResponse })]);

    return { text: cleanResponse, imageUrls };

  } catch (error) {
    console.error("CRITICAL WHATSAPP AGENT ERROR:", error);
    const errorMsg = "Error consultando inventario 💎";
    try {
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg })]);
    } catch (dbErr) {
      console.error("Failed to log error to DB:", dbErr);
    }
    return { text: errorMsg, imageUrls: [] };
  }
}
