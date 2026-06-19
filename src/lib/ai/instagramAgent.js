import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { query } from "@/lib/db";
import { getInstagramPrompt } from "./prompts";

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

  // --- Solicitudes EXPLICITAS de atención humana en este mismo chat ---
  if (
    m.includes("atiendeme") || m.includes("atenderme") || m.includes("quiero hablar con") ||
    m.includes("hablar con alguien") || m.includes("hablar con un humano") || m.includes("hablar con un asesor") ||
    m.includes("no tengo whatsapp") || m.includes("sin whatsapp") || m.includes("por aqui") ||
    m.includes("este chat") || m.includes("este mismo chat")
  ) return "HUMAN_REQUEST";

  // 0.5. Consulta sobre publicidad, preventas o modelo ausente en catálogo
  if (
    m.includes("publicidad") || m.includes("anuncio") || m.includes("propaganda") || 
    m.includes("promocion") || m.includes("preventa") || m.includes("nuevo modelo") ||
    m.includes("no sale") || m.includes("no aparece") || m.includes("no esta en el catalogo") || 
    m.includes("no lo encuentro") || m.includes("redes") || m.includes("instagram") || 
    m.includes("publicacion") || m.includes("post") || m.includes("story") || m.includes("historia")
  ) return "AD_OR_NEW_MODEL_QUERY";

  // --- Intenciones Emocionales/Sociales (deben evaluarse ANTES que las de venta) ---

  // Agradecimiento por experiencia en tienda, atención recibida, post-compra
  const hasGracias = m.includes("gracias") || m.includes("mil gracias") || m.includes("muy agradecido") || m.includes("muy agradecida");
  const hasExpExperiencia = (
    m.includes("atencion") || m.includes("trato") || m.includes("tienda") ||
    m.includes("visita") || m.includes("servicio") || m.includes("recibida") ||
    m.includes("recibido") || m.includes("compra") || m.includes("contento") ||
    m.includes("contenta") || m.includes("feliz") || m.includes("encanto") ||
    m.includes("encanta") || m.includes("excelente") || m.includes("genial") ||
    m.includes("maravilloso") || m.includes("maravillosa") || m.includes("estupendo")
  );
  if (hasGracias && hasExpExperiencia) return "GRATITUDE_EXPERIENCE";

  // Elogio o retroalimentación positiva sin necesariamente decir "gracias"
  if (
    m.includes("quede encantado") || m.includes("quede encantada") ||
    m.includes("quede feliz") || m.includes("quede contento") || m.includes("quede contenta") ||
    m.includes("muy buena atencion") || m.includes("excelente servicio") ||
    m.includes("excelente atencion") || m.includes("buen trato") ||
    m.includes("lo recomiendo") || m.includes("los recomiendo")
  ) return "POSITIVE_FEEDBACK";

  // Despedida o cierre de conversación
  const farewordsList = ["adios", "hasta luego", "chao", "chau", "bye", "hasta pronto", "nos vemos", "hasta la proxima"];
  if (farewordsList.some(w => m === w || (m.startsWith(w) && m.length < 30))) return "FAREWELL";

  // --- Intenciones de venta / consulta ---
  if (m.includes("precio") || m.includes("cuanto") || m.includes("cuesta") || m.includes("vale")) return "PRICE_INFO";
  if (m.includes("catalogo") || m.includes("ver todo")) return "CATALOG";
  if (m.includes("sofa") || m.includes("colchon") || m.match(/[a-z]\d{3}/)) return "PRODUCT_QUERY";
  if (m.includes("hola") || m.includes("buen") || m.includes("saludos")) return "GREETING";

  // Cortesía simple (ok, dale, etc.) sin contexto emocional
  if (["ok", "dale", "perfecto", "entendido", "gracias"].some(w => m.includes(w))) return "OTHER";

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
      WHERE p.status = 'active' AND (p.stock > 0 OR p.is_coming_soon = true)
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
      return `MODELO: ${p.name}
- Código: ${p.code || "N/A"}
- Categoría: ${p.categoria || "N/A"}
- Descripción: ${p.description || "N/A"}
- Precio BCV: $${p.price_bcv}
- Imagen: (URL_FOTO: ${imageUrl})`;
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
  const prompt = getInstagramPrompt(inventory.text, dynamicKnowledge, isFallback);

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
      finalMessages.push(new SystemMessage("REGLA DE CONTROL DE ENLACES: Ya le has enviado el enlace del catálogo web al cliente en los mensajes anteriores de esta conversación. Por lo tanto, queda estrictamente PROHIBIDO incluir cualquier URL de catálogo (como https://www.practiiko.com/catalogo) en tu respuesta actual. Si necesitas hacer referencia al catálogo o a la página, hazlo textualmente sin escribir el enlace literal. No obstante, el enlace oficial de redirección a WhatsApp SIEMPRE debe estar permitido si es requerido."));
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
    console.error("DEBUG - DeepSeek Error (Instagram):", error.message);
    return `¡Hola ${customerName}! Escríbenos a nuestro WhatsApp oficial para atención inmediata y ver todos nuestros precios: https://wa.me/584248948664?text=Hola%2C%20vengo%20de%20instagram%20y%20quisiera%20informacion%20sobre%20sus%20productos`;
  }
}

// Función auxiliar para enviar alertas de Instagram a WhatsApp
async function notifyAdvisorsOfInstagramTransfer(sessionId, customerName, message, motivo, baseUrl) {
  let username = "";
  try {
    const customerRes = await query("SELECT username FROM instagram_customers WHERE id = $1", [sessionId]);
    username = customerRes.rows[0]?.username || "";
  } catch (e) {
    console.error("Error al obtener username de instagram_customers:", e.message);
  }

  const userRef = username ? `@${username}` : sessionId;
  const dashboardLink = baseUrl ? `${baseUrl}/instagram/${sessionId}` : "";
  const instagramLink = username ? `https://instagram.com/${username}` : "";

  let linksText = "";
  if (dashboardLink) linksText += `\n*Panel:* ${dashboardLink}`;
  if (instagramLink) linksText += `\n*Instagram:* ${instagramLink}`;

  const notifyText = `${motivo}\n\n*Canal:* INSTAGRAM\n*Cliente:* ${customerName} (${userRef})\n*Mensaje:* "${message}"\n${linksText}`;

  const EVO_URL = process.env.EVOLUTION_API_URL;
  const EVO_KEY = process.env.EVOLUTION_API_KEY;
  const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
  const adminPhone = "584248068515";
  const groupId = process.env.NOTIFICATIONS_GROUP_ID;

  if (EVO_URL) {
    try {
      // Notificar al admin personal
      await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ number: adminPhone, text: notifyText })
      });
      // Notificar al grupo de WhatsApp
      if (groupId) {
        await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
          body: JSON.stringify({ number: groupId, text: notifyText })
        });
      }
    } catch(e) {
      console.error("Error en flujo de notificaciones de Instagram hacia WhatsApp:", e);
    }
  }
}

export async function processInstagramMessage(message, sessionId, customerName = "Cliente", baseUrl = "", source = "instagram", commentId = null) {
  try {
    // 1. Verificar si el bot está pausado para este cliente
    const customerRes = await query("SELECT ai_enabled FROM instagram_customers WHERE id = $1", [sessionId]);
    const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;
    if (!isAiEnabled) {
      console.log(`[INSTAGRAM AGENT] Bot pausado para ${sessionId}.`);
      return { text: "", imageUrls: [], ignored: true };
    }

    // 2. Cargar historial primero para determinar si es una conversación en curso
    const historyRes = await query(
      `SELECT message FROM instagram_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`,
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
      const greetingResponse = `¡Con gusto le ayudo! ⭐\n📖 Mire nuestra coleccion completa y precios en el siguiente enlace para guiarlo mejor por su espacio🛋️🛏️\n\n👉 https://www.practiiko.com/catalogo 👈`;

      if (source === 'dm') {
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 24);
        
        try {
          await query(`UPDATE instagram_customers SET followup_status = 'pending', followup_scheduled_at = $1 WHERE id = $2`, [scheduledAt.toISOString(), sessionId]);
        } catch (e) {
          console.error("Error setting followup_status in instagram_customers:", e.message);
        }
      }

      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: greetingResponse }), source, commentId]);

      return { text: greetingResponse, imageUrls: [] };
    }

    // --- Fast-paths de Inteligencia Emocional ---
    // Manejan respuestas sociales/emocionales sin llamar al LLM ni al inventario.

    if (intent === "GRATITUDE_EXPERIENCE") {
      const name = customerName && customerName !== "Cliente" ? ` ${customerName}` : "";
      const options = [
        `¡Qué alegría escuchar eso${name}! Saber que su visita fue especial nos llena de orgullo. En Practiiko cada detalle cuenta, y usted merece lo mejor. ¡Gracias por confiar en nosotros!`,
        `Eso nos hace muy felices${name}. Su satisfacción es nuestra mayor recompensa. ¡Fue un placer atenderle, le esperamos pronto con más novedades!`,
        `¡Muchísimas gracias${name}! Comentarios como el suyo nos motivan a seguir dando lo mejor cada día. ¡Es siempre bienvenido a Practiiko!`
      ];
      const resp = options[Math.floor(Math.random() * options.length)];
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: resp }), source, commentId]);
      return { text: resp, imageUrls: [] };
    }

    if (intent === "POSITIVE_FEEDBACK") {
      const name = customerName && customerName !== "Cliente" ? ` ${customerName}` : "";
      const resp = `¡Nos alegra muchísimo${name}! Comentarios como el suyo nos inspiran a seguir ofreciendo la mejor experiencia. Si en algún momento necesita algo más, aquí estaremos.`;
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: resp }), source, commentId]);
      return { text: resp, imageUrls: [] };
    }

    if (intent === "FAREWELL") {
      const name = customerName && customerName !== "Cliente" ? ` ${customerName}` : "";
      const resp = `¡Hasta pronto${name}! Fue un placer atenderle. Recuerde que en Practiiko siempre le esperamos.`;
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: resp }), source, commentId]);
      return { text: resp, imageUrls: [] };
    }

    // GESTIÓN DE INTENCIONES
    let currentIntent = intent;
    if (intent === "GREETING" || intent === "OTHER") currentIntent = "CATALOG";

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

    const isLoopDetected = 
      // Solo disparar cuando hay MUCHAS referencias al catálogo sin avanzar (umbral alto = 3)
      (catalogRefCount >= 3) ||
      // O cuando la IA repitió la pregunta del nombre del modelo 2+ veces
      (modelNameRefCount >= 2) ||
      // O cuando hay combinación de ambas (suma >= 3 pero requiriendo al menos 1 de cada tipo)
      (catalogRefCount >= 1 && modelNameRefCount >= 1 && catalogRefCount + modelNameRefCount >= 3);

    // BYPASS CRÍTICO: Si el cliente envió un nombre de producto/modelo específico,
    // NO transferir — el usuario está avanzando en la conversación con info concreta.
    const earlyKeywords = extractKeywords(message);
    const isProductSearch = currentIntent === "PRODUCT_QUERY" || 
      (intent === "PRICE_INFO" && earlyKeywords && earlyKeywords.length > 0);

    if (isLoopDetected && !isProductSearch) {

      console.log(`[INSTAGRAM AGENT] Guardrail Anti-Bucle activado para ${sessionId}. Forzando transferencia.`);
      const loopResponse = "¡Entendido perfectamente! Veo que no logramos identificar el modelo exacto que busca por este medio automático. No se preocupe en lo absoluto: en este mismo instante le estoy transfiriendo con uno de nuestros asesores de ventas especializados para que le atienda de forma personalizada por este mismo chat en breve. ¡Muchas gracias por su paciencia!";

      const motivo = "🚨 GUARDRAIL ANTI-BUCLE (TRANSFERENCIA) (INSTAGRAM)";
      await notifyAdvisorsOfInstagramTransfer(sessionId, customerName, message, motivo, baseUrl);

      try {
        await query("UPDATE instagram_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human Instagram (Guardrail):", e);
      }
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: loopResponse }), source, commentId]);

      return { text: loopResponse, imageUrls: [] };
    }

    // Agrupar mensajes consecutivos
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

    // 3. Manejo de HUMAN_REQUEST y AD_OR_NEW_MODEL_QUERY (Fast Path) - Instagram
    // Solo para solicitudes EXPLICITAS de atención humana en este mismo chat o consultas de publicidad/preventas.
    // NO se envían notificaciones al grupo de WhatsApp — el bot ya redirige a WA por su propia cuenta.
    if (currentIntent === "HUMAN_REQUEST" || currentIntent === "AD_OR_NEW_MODEL_QUERY") {
      let response = "Con mucho gusto. Le atiendo por este mismo chat en breve. Uno de nuestros asesores se comunicará con usted aquí.";
      if (currentIntent === "AD_OR_NEW_MODEL_QUERY") {
        response = "¡Entiendo perfectamente! A veces publicamos adelantos de temporada, preventas exclusivas o campañas de nuevos modelos que aún no están subidos a nuestro catálogo web. Para brindarle todos los detalles y confirmar disponibilidad de esa publicidad, le transferiré de inmediato con uno de nuestros asesores por este chat. Le atenderá en breve.";
      }

      const motivo = currentIntent === "AD_OR_NEW_MODEL_QUERY" ? "📢 CONSULTA PUBLICIDAD/PREVENTA (INSTAGRAM)" : "🚨 SOLICITUD HUMANA (INSTAGRAM)";
      await notifyAdvisorsOfInstagramTransfer(sessionId, customerName, message, motivo, baseUrl);

      // Solo marcamos en DB para el panel de monitoreo interno
      try {
        await query("UPDATE instagram_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human Instagram:", e);
      }
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: response }), source, commentId]);

      return { text: response, imageUrls: [] };
    }

    // 4. Buscar Inventario (con soporte de referencias contextuales)
    const isContextRef = detectContextReference(message);
    let terms;
    if (isContextRef) {
      terms = extractLastUserKeywords(historyMessagesRaw) || extractKeywords(message);
      console.log(`[INSTAGRAM AGENT] Referencia contextual detectada. Keywords recuperados del historial:`, terms);
    } else {
      terms = extractKeywords(message);
    }
    const inventory = await getInventory(terms, currentIntent);

    // 5. Cargar instrucciones personalizadas
    let dynamicKnowledge = "";
    try {
      const settingsRes = await query("SELECT value FROM app_settings WHERE key = 'ai_custom_instructions'");
      if (settingsRes.rows.length > 0) {
        dynamicKnowledge = settingsRes.rows[0].value;
      }
    } catch (e) {
      console.warn("No se pudo cargar ai_custom_instructions de la BD:", e.message);
    }

    // 6. Invocar LLM
    const isGeneralPriceQuery = intent === "PRICE_INFO" && (!terms || terms.length === 0);
    const rawResponse = await buildResponse(message, customerName, inventory, historyMessages, dynamicKnowledge, inventory.isFallback, isGeneralPriceQuery);

    console.log(`[DEBUG INSTAGRAM LLM RAW]\n${rawResponse}\n[DEBUG INSTAGRAM LLM RAW END]`);

    let cleanResponse = rawResponse;
    let shouldTransfer = false;

    if (cleanResponse.includes("[TRANSFER]")) {
      shouldTransfer = true;
      cleanResponse = cleanResponse.replace(/\[TRANSFER\]/gi, "").trim();
    }

    if (shouldTransfer) {
      const motivo = "🚨 SOLICITUD HUMANA (IA) (INSTAGRAM)";
      await notifyAdvisorsOfInstagramTransfer(sessionId, customerName, message, motivo, baseUrl);

      try {
        await query("UPDATE instagram_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
      } catch(e) {
        console.error("Error actualizando requires_human (IA-TRANSFER) Instagram:", e);
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
    await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
      [sessionId, JSON.stringify({ role: 'assistant', content: cleanResponse }), source, commentId]);

    return { text: cleanResponse, imageUrls };

  } catch (error) {
    console.error("CRITICAL INSTAGRAM AGENT ERROR:", error);
    const errorMsg = "Error consultando inventario.";
    try {
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg }), source, commentId]);
    } catch (dbErr) {
      console.error("Failed to log error to DB:", dbErr);
    }
    return { text: errorMsg, imageUrls: [] };
  }
}
