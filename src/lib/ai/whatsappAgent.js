import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { query } from "@/lib/db";
import { getWhatsappPrompt } from "./prompts";

const STORE_ADDRESS = "Av. Llano Adentro, CC Terranova Plaza, Local A14, Porlamar, Nueva Esparta, Venezuela";
const STORE_PLUS_CODE = "X49X+XF9 Porlamar, Nueva Esparta, Venezuela";
const STORE_MAPS_URL = "https://maps.google.com/?q=10.969917,-63.851278";
const CATALOG_URL = "https://www.practiiko.com/catalogo";

let _model;
function getModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com";

  if (!apiKey || apiKey === "") {
    if (process.env.NODE_ENV === "production") {
      console.warn("⚠️ Advertencia: DEEPSEEK_API_KEY no detectada.");
    }
    return null;
  }

  if (!_model) {
    _model = new ChatOpenAI({
      openAIApiKey: apiKey,
      configuration: { baseURL: baseUrl },
      modelName: "deepseek-chat",
      temperature: 0.1,
      maxTokens: 550,
    });
  }
  return _model;
}

function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function levenshtein(a, b) {
  const tmp = [];
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (let i = 0; i <= alen; i++) tmp[i] = [i];
  for (let j = 0; j <= blen; j++) tmp[0][j] = j;
  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
}

// Coincidencia estricta solo contra palabras significativas del nombre, categoría o código (máx. distancia 2)
function isStrictProductMatch(term, targetText) {
  const cleanTarget = normalize(targetText);
  const cleanTerm = normalize(term);
  if (!cleanTarget || !cleanTerm) return false;
  if (cleanTarget.includes(cleanTerm)) return true;

  if (cleanTerm.length < 4) return false;
  const targetWords = cleanTarget.split(/[\s,?.!/-]+/).filter(w => w.length >= 4);
  for (const word of targetWords) {
    const dist = levenshtein(cleanTerm, word);
    const maxDist = cleanTerm.length >= 7 ? 2 : 1;
    if (dist <= maxDist) return true;
  }
  return false;
}

function extractKeywords(message) {
  const m = normalize(message);
  // Conservamos palabras clave de producto como sofa, colchon, vela, cama, individual, queen, king, etc.
  const stopWords = new Set([
    "hola", "buenos", "buenas", "dias", "tardes", "noches", "saludos",
    "precio", "precios", "cuanto", "cuesta", "vale", "valor", "costo",
    "quiero", "saber", "tienen", "tiene", "tengo", "busco", "necesito",
    "favor", "gracias", "para", "como", "esta", "estan", "donde", "algun",
    "muestrame", "muestra", "ver", "fotos", "foto", "imagenes", "imagen",
    "del", "las", "los", "una", "uno", "unos", "unas", "este", "esto",
    "esta", "ese", "eso", "esa", "esos", "esas", "aqui", "alla",
    "gustaria", "mas", "informacion", "detalle", "detalles", "enviar",
    "mandar", "pasar", "conocer", "por", "con", "que", "sus", "estos",
    "estas", "cual", "cuales", "dame", "sobre", "transformar", "hogar",
    "practiiko", "catalogo", "disponible", "disponibles", "medida", "medidas"
  ]);

  const words = m
    .split(/[\s,?.!:/()-]+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  return words.length > 0 ? [...new Set(words)] : null;
}

function detectRealBuyingIntent(message) {
  const m = normalize(message);

  // Preguntas informativas sobre Cashea o precios NO son cierre inmediato si solo preguntan "aceptan/tienen/como funciona"
  const isPureQuestionAboutPayment =
    (m.includes("aceptan") || m.includes("tienen") || m.includes("trabajan") || m.includes("como funciona") || m.includes("informacion") || m.includes("cuotas")) &&
    !m.includes("quiero comprar") &&
    !m.includes("lo quiero") &&
    !m.includes("me lo llevo") &&
    !m.includes("pasame los datos") &&
    !m.includes("datos para pagar") &&
    !m.includes("quiero pagar");

  if (isPureQuestionAboutPayment) return false;

  const buyingPhrases = [
    "quiero comprar", "quiero comprarlo", "quiero comprarla", "lo quiero", "la quiero",
    "me lo llevo", "me la llevo", "quiero llevarme", "quiero hacer el pedido",
    "hacer pedido", "hacer un pedido", "hacer la compra", "concretar compra",
    "concretar la compra", "quiero reservar", "reservarlo", "apartarlo", "separarlo",
    "sepáralo", "datos de pago", "datos para pagar", "pasame los datos",
    "numero de cuenta", "pago movil", "datos de zelle", "donde pago", "como pago",
    "quiero pagar", "voy hoy a comprarlo", "voy a buscarlo hoy", "quiero encargarlo",
    "procesar cashea", "pagar con cashea ahora", "como hago para comprar", "como compro"
  ];

  return buyingPhrases.some(phrase => m.includes(normalize(phrase)));
}

function detectIntent(message) {
  const m = normalize(message);

  if (m.startsWith("[multimedia/otro formato: audio]")) return "AUDIO_MEDIA";

  // 1. Solicitud explícita de asesor humano
  if (
    m.includes("asesor") ||
    m.includes("humano") ||
    m.includes("persona") ||
    m.includes("hablar con alguien") ||
    m.includes("hablar con un") ||
    m.includes("vendedor")
  ) {
    return "HUMAN_REQUEST";
  }

  // 2. Intención real de compra / cierre
  if (detectRealBuyingIntent(message)) {
    return "BUY_INTENT";
  }

  // 3. Preguntas frecuentes (resueltas por el Super Agente sin transferir)
  if (m.includes("cashea") || m.includes("cuotas") || m.includes("financiamiento") || m.includes("credito")) {
    return "FAQ_CASHEA";
  }

  if (
    m.includes("ubicacion") || m.includes("direccion") || m.includes("donde estan") ||
    m.includes("donde quedan") || m.includes("tienda") || m.includes("margarita") ||
    m.includes("porlamar") || m.includes("horario") || m.includes("abren") || m.includes("cierran")
  ) {
    return "FAQ_STORE";
  }

  if (m.includes("precio") || m.includes("cuanto") || m.includes("cuesta") || m.includes("vale") || m.includes("costo")) {
    return "PRICE_INFO";
  }

  if (m.includes("medida") || m.includes("dimension") || m.includes("tamano") || m.includes("tela") || m.includes("material") || m.includes("color")) {
    return "SPECS_INFO";
  }

  if (m.includes("catalogo") || m.includes("ver todo")) {
    return "CATALOG";
  }

  if (m.includes("sofa") || m.includes("colchon") || m.includes("vela") || m.includes("mueble") || m.includes("cama") || m.match(/[a-z]\d{2,}/)) {
    return "PRODUCT_QUERY";
  }

  if (m.includes("transformar mi hogar") || m.includes("mas informacion") || m.includes("hola") || m.includes("buen")) {
    return "WELCOME_OR_GREETING";
  }

  return "GENERAL_QUERY";
}

function formatTechnicalFeatures(rawFeatures) {
  if (!rawFeatures) return "";
  try {
    const parsed = typeof rawFeatures === "string" ? JSON.parse(rawFeatures) : rawFeatures;
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const label = item.label || item.name || item.title || item.key || "";
            const val = item.value || item.detail || item.description || "";
            return label && val ? `${label}: ${val}` : (label || val || JSON.stringify(item));
          }
          return String(item);
        })
        .filter(Boolean)
        .join(" | ");
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
    }
    return String(parsed);
  } catch {
    return String(rawFeatures).trim();
  }
}

function formatPriceNumber(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, "");
}

function formatProductBlock(p) {
  const imageUrl = p.image_url || "No disponible";
  const priceStr = p.price_bcv != null ? `$${formatPriceNumber(p.price_bcv)} a tasa BCV` : "Consultar";
  const stockNum = p.stock != null ? Number(p.stock) : null;
  const availability = p.is_coming_soon
    ? "Próximamente / Preventa"
    : (stockNum != null ? (stockNum > 0 ? `En stock (${stockNum})` : "Consultar disponibilidad") : "Disponible");
  const techSummary = p.technical_summary ? String(p.technical_summary).trim() : "";
  const techFeatures = formatTechnicalFeatures(p.technical_features);
  const desc = p.description ? String(p.description).replace(/\s+/g, " ").trim() : "";

  const lines = [
    `• MODELO: ${p.name}${p.code ? ` (Código: ${p.code})` : ""}`,
    `  - Categoría: ${p.categoria || "General"}`,
    `  - Precio oficial: ${priceStr}`,
    `  - Disponibilidad: ${availability}`,
  ];
  if (techSummary) lines.push(`  - Resumen Técnico / Medidas: ${techSummary}`);
  if (techFeatures) lines.push(`  - Características Técnicas: ${techFeatures}`);
  if (desc) lines.push(`  - Descripción: ${desc}`);
  lines.push(`  - Foto (URL_FOTO): ${imageUrl}`);

  return lines.join("\n");
}

const CONTEXT_REFS = [
  "el mismo", "la misma", "ese", "esa", "de ese", "de esa",
  "ese modelo", "ese mueble", "esa pieza", "el que mostraste",
  "el que me mandaste", "en el catalogo", "del catalogo", "en la web"
];

function detectContextReference(message) {
  const m = normalize(message);
  return CONTEXT_REFS.some(ref => m.includes(normalize(ref)));
}

function extractLastUserKeywords(historyRaw) {
  const reversed = [...historyRaw].reverse();
  for (const msg of reversed) {
    if (msg.role !== "user") continue;
    const kw = extractKeywords(msg.content);
    if (kw && kw.length > 0) return kw;
  }
  return null;
}

async function getInventory(terms) {
  try {
    // Usamos p.* para ser resilientes ante cualquier variación menor de columnas
    const queryStr = `
      SELECT p.*,
             c.name as categoria,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_main DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
      ORDER BY c.name ASC NULLS LAST, p.id ASC
    `;
    const { rows } = await query(queryStr);

    const activeRows = rows.filter(r => r.stock == null || Number(r.stock) > 0 || r.is_coming_soon === true);

    let matchedRows = [];
    let isFallback = false;

    if (terms && terms.length > 0) {
      matchedRows = activeRows.filter(r => {
        const nameVal = r.name || "";
        const catVal = r.categoria || "";
        const codeVal = r.code || "";
        return terms.some(term =>
          isStrictProductMatch(term, nameVal) ||
          isStrictProductMatch(term, catVal) ||
          isStrictProductMatch(term, codeVal)
        );
      });

      if (matchedRows.length === 0) {
        isFallback = true;
      }
    }

    // Agrupar todo el catálogo autorizado por categoría
    const grouped = new Map();
    for (const r of activeRows) {
      const catName = r.categoria || "Otros Productos";
      if (!grouped.has(catName)) grouped.set(catName, []);
      grouped.get(catName).push(r);
    }

    const categoriesList = [...grouped.keys()];
    let textParts = [];
    textParts.push(`CATEGORÍAS DISPONIBLES: ${categoriesList.join(", ") || "Ninguna"}`);

    if (matchedRows.length > 0) {
      textParts.push(
        "🎯 PRODUCTOS QUE COINCIDEN CON LA CONSULTA DEL CLIENTE:\n" +
        matchedRows.map(formatProductBlock).join("\n\n")
      );
    }

    const fullCatalogBlocks = [];
    for (const [catName, items] of grouped.entries()) {
      fullCatalogBlocks.push(`--- CATEGORÍA: ${catName} ---\n` + items.map(formatProductBlock).join("\n\n"));
    }

    textParts.push(
      "📋 CATÁLOGO COMPLETO AUTORIZADO EN BASE DE DATOS:\n" +
      (fullCatalogBlocks.join("\n\n") || "Sin productos activos en inventario.")
    );

    return {
      found: matchedRows.length > 0,
      isFallback,
      matchedRows,
      allRows: activeRows,
      categoriesCount: categoriesList.length,
      text: textParts.join("\n\n"),
    };
  } catch (e) {
    console.error("[WHATSAPP AGENT DB ERROR]:", e);
    return { found: false, isFallback: true, matchedRows: [], allRows: [], categoriesCount: 0, text: "" };
  }
}

function buildValidPriceSet(allRows, dynamicKnowledge = "") {
  const valid = new Set();
  for (const r of allRows) {
    if (r.price_bcv != null && r.price_bcv !== "") {
      const n = Number(r.price_bcv);
      if (!Number.isNaN(n)) {
        valid.add(n);
        valid.add(Math.round(n));
      }
    }
    if (r.price_cash != null && r.price_cash !== "") {
      const n = Number(r.price_cash);
      if (!Number.isNaN(n) && n > 0) {
        valid.add(n);
        valid.add(Math.round(n));
      }
    }
  }
  // Incluir montos en $ explícitos presentes en Reglas Dinámicas
  if (dynamicKnowledge) {
    const dkMatches = [...dynamicKnowledge.matchAll(/\$\s?(\d+(?:[.,]\d+)?)/g)];
    for (const m of dkMatches) {
      const n = Number(m[1].replace(",", ""));
      if (!Number.isNaN(n)) valid.add(n);
    }
  }
  return valid;
}

function validateAndSanitizeResponse(rawText, inventory, dynamicKnowledge = "") {
  const validPrices = buildValidPriceSet(inventory.allRows, dynamicKnowledge);
  const priceMatches = [...rawText.matchAll(/\$\s?(\d+(?:[.,]\d+)?)/g)];

  let hallucinationBlocked = false;
  for (const match of priceMatches) {
    const rawNum = match[1].replace(/,/g, "");
    const num = Number(rawNum);
    if (!Number.isNaN(num) && !validPrices.has(num)) {
      hallucinationBlocked = true;
      console.warn(`[ANTI-HALLUCINATION SHIELD] Precio inventado bloqueado: $${match[1]}`);
      break;
    }
  }

  if (!hallucinationBlocked) {
    return { text: rawText, hallucinationBlocked: false };
  }

  // Reemplazo determinista 100% respaldado por la BD
  const sourceProducts = inventory.matchedRows.length > 0 ? inventory.matchedRows.slice(0, 4) : inventory.allRows.slice(0, 4);
  if (sourceProducts.length > 0) {
    const listLines = sourceProducts
      .map(p => `• *${p.name}*: *$${formatPriceNumber(p.price_bcv)}* a tasa BCV`)
      .join("\n");
    const safeReply =
      `Con mucho gusto te comparto nuestros precios oficiales actuales:\n\n${listLines}\n\n` +
      `📖 Puedes ver todos los modelos y fotos en: ${CATALOG_URL}\n` +
      `📍 También te invitamos a nuestra tienda en *${STORE_ADDRESS}* (te recibimos con un regalo de bienvenida 🎁).`;
    return { text: safeReply, hallucinationBlocked: true };
  }

  return {
    text: `Puedes consultar nuestros modelos y precios oficiales actualizados en nuestro catálogo: ${CATALOG_URL}\n\nTambién te esperamos en nuestra tienda de Margarita (${STORE_ADDRESS}) con un regalo especial de bienvenida. 🎁`,
    hallucinationBlocked: true,
  };
}

function resolveActionTag({ intent, transferred, transferReason, hallucinationBlocked, inventoryMatched }) {
  if (hallucinationBlocked) return "🛡️ Anti-Alucinación Aplicado";
  if (transferred && transferReason === "BUY_INTENT") return "🔥 Intención de Compra -> Asesor";
  if (transferred) return "👤 Solicitud de Asesor";
  if (intent === "FAQ_STORE") return "📍 Info Tienda Margarita";
  if (intent === "FAQ_CASHEA") return "💳 Info Cashea";
  if (intent === "PRICE_INFO" || (inventoryMatched && intent === "PRODUCT_QUERY")) return "💰 Precio BD";
  if (intent === "SPECS_INFO") return "📐 Medidas/Ficha BD";
  return "✅ Consulta Resuelta";
}

async function notifyHumanAdvisor(sessionId, customerName, message, motivo) {
  const EVO_URL = process.env.EVOLUTION_API_URL;
  const EVO_KEY = process.env.EVOLUTION_API_KEY;
  const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
  const adminPhone = "584248068515";
  const groupId = process.env.NOTIFICATIONS_GROUP_ID;

  if (!EVO_URL) return;

  const replyLink = `https://wa.me/${sessionId}`;
  const notifyText = `${motivo}\n\n*Canal:* WHATSAPP\n*Cliente:* ${customerName} (+${sessionId})\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\n${replyLink}`;

  try {
    await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number: adminPhone, text: notifyText }),
    });
    if (groupId) {
      await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVO_KEY },
        body: JSON.stringify({ number: groupId, text: notifyText }),
      });
    }
  } catch (e) {
    console.error("Error enviando notificación a asesor:", e.message);
  }
}

async function buildResponse(message, customerName, inventory, historyMessages, dynamicKnowledge = "") {
  const prompt = getWhatsappPrompt(inventory.text, dynamicKnowledge, inventory.isFallback);

  const model = getModel();
  if (!model) throw new Error("Model not initialized (missing DEEPSEEK_API_KEY)");

  const alreadySentLink = historyMessages.some(
    m => m instanceof AIMessage && (m.content.toLowerCase().includes("practiiko.com") || m.content.toLowerCase().includes("catalogo"))
  );

  const msgLower = (message || "").toLowerCase();
  const userPideLink =
    msgLower.includes("link") ||
    msgLower.includes("enlace") ||
    msgLower.includes("pagina") ||
    msgLower.includes("página") ||
    msgLower.includes("web") ||
    msgLower.includes("catalogo") ||
    msgLower.includes("catálogo");

  const finalMessages = [
    new SystemMessage(prompt),
    ...historyMessages,
  ];

  if (alreadySentLink && !userPideLink) {
    finalMessages.push(
      new SystemMessage("REGLA DE ENLACES: Ya enviaste el enlace del catálogo anteriormente en esta charla. No repitas la URL literal del catálogo salvo que el cliente la pida de nuevo.")
    );
  }

  const alreadyGreeted = historyMessages.some(
    m => m instanceof AIMessage && (m.content.toLowerCase().includes("hola") || m.content.toLowerCase().includes("bienvenid"))
  );
  if (alreadyGreeted) {
    finalMessages.push(
      new SystemMessage("REGLA ANTI-SALUDO: Ya saludaste antes. Ve directo al grano sin repetir '¡Hola!' ni '¡Bienvenido!'.")
    );
  }

  finalMessages.push(new HumanMessage(message));

  const response = await model.invoke(finalMessages);
  return response.content;
}

export async function processWhatsappMessage(message, sessionId, customerName = "Cliente", baseUrl = "") {
  try {
    // 1. Verificar si el bot está pausado para este cliente
    const customerRes = await query("SELECT ai_enabled FROM whatsapp_customers WHERE id = $1", [sessionId]);
    const isAiEnabled = customerRes.rows[0]?.ai_enabled ?? true;
    if (!isAiEnabled) {
      console.log(`[WHATSAPP SUPER AGENT] Bot pausado para ${sessionId}.`);
      return { text: "", imageUrls: [], ignored: true };
    }

    // 2. Cargar historial reciente (máx. 8 mensajes)
    const historyRes = await query(
      `SELECT message FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 8`,
      [sessionId]
    );

    if (historyRes.rows.length > 0) {
      try {
        const mostRecentRaw = historyRes.rows[0].message;
        const mostRecentMsg = typeof mostRecentRaw === "string" ? JSON.parse(mostRecentRaw) : mostRecentRaw;
        if (mostRecentMsg && mostRecentMsg.role === "user" && mostRecentMsg.content === message) {
          historyRes.rows.shift();
        }
      } catch (e) {
        console.warn("Error filtrando mensaje actual del historial:", e.message);
      }
    }

    const historyMessagesRaw = historyRes.rows
      .reverse()
      .map(r => {
        if (!r.message) return null;
        let msg;
        try {
          msg = typeof r.message === "string" ? JSON.parse(r.message) : r.message;
        } catch {
          msg = { role: "user", content: String(r.message) };
        }
        if (!msg || typeof msg !== "object") return null;
        return { role: msg.role === "assistant" ? "assistant" : "user", content: msg.content || "" };
      })
      .filter(Boolean);

    while (historyMessagesRaw.length > 0 && historyMessagesRaw[historyMessagesRaw.length - 1].role === "user") {
      historyMessagesRaw.pop();
    }

    const intent = detectIntent(message);

    // 3. Transferencias directas rápidas (Audio, Solicitud explícita de humano o Intención real de compra)
    if (intent === "AUDIO_MEDIA" || intent === "HUMAN_REQUEST" || intent === "BUY_INTENT") {
      const transferReason = intent === "BUY_INTENT" ? "BUY_INTENT" : "HUMAN_REQUEST";
      const responseText =
        intent === "BUY_INTENT"
          ? `¡Excelente decisión! 🎉 Para ayudarte a concretar tu compra de inmediato, ya mismo te conecto con uno de nuestros asesores especializados de *Practiiko Margarita*, quien te atenderá por acá en breve.\n\n📍 Recuerda que si deseas pasar por nuestra tienda en *${STORE_ADDRESS}*, te estaremos esperando con un regalo especial de bienvenida. 🎁`
          : intent === "AUDIO_MEDIA"
          ? `¡Recibimos tu nota de voz! 🎙️ Enseguida uno de nuestros asesores especializados de *Practiiko Margarita* la escuchará y te responderá personalmente por este chat.\n\n🕘 *Horario:* Lunes a viernes 9:00 a. m. a 4:00 p. m. | Sábados 9:00 a. m. a 1:00 p. m.`
          : `¡Con mucho gusto! 💬 En este mismo instante te paso con uno de nuestros asesores especializados de *Practiiko Margarita*, quien te atenderá de forma personalizada por acá.\n\n🕘 *Horario:* Lunes a viernes 9:00 a. m. a 4:00 p. m. | Sábados 9:00 a. m. a 1:00 p. m.`;

      const motivo = intent === "BUY_INTENT" ? "🔥 INTENCIÓN REAL DE COMPRA" : "👤 SOLICITUD DE ASESOR";
      await notifyHumanAdvisor(sessionId, customerName, message, motivo);

      await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);

      const actionTag = resolveActionTag({
        intent,
        transferred: true,
        transferReason,
        hallucinationBlocked: false,
        inventoryMatched: false,
      });

      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [
          sessionId,
          JSON.stringify({
            role: "assistant",
            type: "text",
            agent: "super_agent_v2",
            intent,
            actionTag,
            matchedProducts: [],
            transferred: true,
            transferReason,
            hallucinationBlocked: false,
            content: responseText,
          }),
        ]
      );

      return {
        text: responseText,
        imageUrls: [],
        transferred: true,
        transferReason,
        actionTag,
        hallucinationBlocked: false,
        intent,
      };
    }

    // 4. Primer mensaje genérico ("Hola", "Quiero transformar mi hogar", "Más información" sin pregunta de producto)
    const isFirstContact = historyMessagesRaw.length === 0;
    if (isFirstContact && intent === "WELCOME_OR_GREETING") {
      const welcomeMargaritaText =
        `¡Hola${customerName && customerName !== "Cliente WhatsApp" ? ` ${customerName}` : ""}! 👋 Bienvenido a *Practiiko Margarita*.\n\n` +
        `Te invitamos a visitar nuestra tienda física para probar nuestros muebles comprimidos y recibir un *regalo especial de bienvenida*. 🎁🛋️✨\n\n` +
        `📍 *Dirección:* ${STORE_ADDRESS}\n` +
        `🗺️ *Google Maps:* ${STORE_MAPS_URL}\n` +
        `🕘 *Horario:* Lunes a viernes 9:00 a. m. a 4:00 p. m. | Sábados 9:00 a. m. a 1:00 p. m.\n` +
        `📖 *Catálogo:* ${CATALOG_URL}\n\n` +
        `¿En qué modelo o producto estás interesado? Pregúntame por precios, medidas o modelos disponibles y te respondo al instante. 💬`;

      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [
          sessionId,
          JSON.stringify({
            role: "assistant",
            type: "text",
            agent: "super_agent_v2",
            intent: "WELCOME_OR_GREETING",
            actionTag: "📍 Info Tienda Margarita",
            matchedProducts: [],
            transferred: false,
            transferReason: null,
            hallucinationBlocked: false,
            content: welcomeMargaritaText,
          }),
        ]
      );

      return {
        text: welcomeMargaritaText,
        imageUrls: [],
        transferred: false,
        transferReason: null,
        actionTag: "📍 Info Tienda Margarita",
        hallucinationBlocked: false,
        intent: "WELCOME_OR_GREETING",
      };
    }

    // 5. Cargar inventario estructurado completo y reglas dinámicas
    const isContextRef = detectContextReference(message);
    const terms = isContextRef
      ? extractLastUserKeywords(historyMessagesRaw) || extractKeywords(message)
      : extractKeywords(message);

    const inventory = await getInventory(terms);

    let dynamicKnowledge = "";
    try {
      const settingsRes = await query("SELECT value FROM app_settings WHERE key = 'ai_custom_instructions'");
      if (settingsRes.rows.length > 0) {
        dynamicKnowledge = settingsRes.rows[0].value || "";
      }
    } catch (e) {
      console.warn("No se pudo cargar ai_custom_instructions:", e.message);
    }

    const groupedMessages = [];
    for (const msg of historyMessagesRaw) {
      if (groupedMessages.length > 0 && groupedMessages[groupedMessages.length - 1].role === msg.role) {
        groupedMessages[groupedMessages.length - 1].content += "\n" + msg.content;
      } else {
        groupedMessages.push({ ...msg });
      }
    }
    const historyMessages = groupedMessages.map(msg =>
      msg.role === "assistant" ? new AIMessage(msg.content) : new HumanMessage(msg.content)
    );

    // 6. Invocar LLM con fallback seguro si falla la API Key o red
    let rawResponse = "";
    try {
      rawResponse = await buildResponse(message, customerName, inventory, historyMessages, dynamicKnowledge);
    } catch (llmErr) {
      console.error("[SUPER AGENT LLM ERROR]:", llmErr.message);
      const safeFallback =
        inventory.matchedRows.length > 0
          ? `Con gusto te comparto nuestros modelos disponibles:\n\n` +
            inventory.matchedRows
              .slice(0, 4)
              .map(p => `• *${p.name}*: *$${formatPriceNumber(p.price_bcv)}* a tasa BCV`)
              .join("\n") +
            `\n\n📖 Catálogo completo: ${CATALOG_URL}\n📍 Te esperamos en *${STORE_ADDRESS}* con un regalo especial de bienvenida. 🎁`
          : `Puedes ver todos nuestros modelos y precios actualizados en: ${CATALOG_URL}\n\n📍 También te invitamos a visitarnos en *${STORE_ADDRESS}* (${STORE_MAPS_URL}) donde te recibiremos con un regalo especial de bienvenida. 🎁`;
      rawResponse = safeFallback;
    }

    let cleanResponse = rawResponse;
    let shouldTransfer = false;
    let transferReason = null;

    if (/\[TRANSFER_BUY\]/i.test(cleanResponse)) {
      shouldTransfer = true;
      transferReason = "BUY_INTENT";
      cleanResponse = cleanResponse.replace(/\[TRANSFER_BUY\]/gi, "").trim();
    } else if (/\[TRANSFER_HUMAN\]/i.test(cleanResponse) || /\[TRANSFER\]/i.test(cleanResponse)) {
      shouldTransfer = true;
      transferReason = "HUMAN_REQUEST";
      cleanResponse = cleanResponse.replace(/\[TRANSFER_HUMAN\]|\[TRANSFER\]/gi, "").trim();
    }

    // 7. Extraer URLs de fotos (solo si el cliente pidió fotos o el modelo incluyó URL_FOTO)
    const imageUrls = [];
    const imgMatches = [...cleanResponse.matchAll(/URL_FOTO:\s*([^\s]+)/gi)];
    if (imgMatches.length > 0) {
      const seenUrls = new Set();
      for (const m of imgMatches) {
        let url = m[1].trim();
        if (url.startsWith("/") && baseUrl) {
          url = `${baseUrl}${url}`;
        }
        if (url.startsWith("http") && !seenUrls.has(url)) {
          seenUrls.add(url);
          imageUrls.push(url);
        }
      }
      cleanResponse = cleanResponse
        .replace(/URL_FOTO:\s*[^\s]+/gi, "")
        .replace(/:\s*\n\s*\n/g, ":\n")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();
    }

    // Sanitizar formato WhatsApp (sin ** doble asterisco)
    cleanResponse = cleanResponse
      .replace(/(https:\/\/[^\s]+\.com\/[^\s]*)\.+(\s|$)/gi, "$1$2")
      .replace(/(\*\*|__)/g, "*")
      .trim();

    // 8. Escudo Anti-Alucinación en código
    const shieldResult = validateAndSanitizeResponse(cleanResponse, inventory, dynamicKnowledge);
    cleanResponse = shieldResult.text;
    const hallucinationBlocked = shieldResult.hallucinationBlocked;

    // Si bloqueamos una alucinación, no transferir falsamente
    if (hallucinationBlocked) {
      shouldTransfer = false;
      transferReason = null;
    }

    if (shouldTransfer) {
      const motivo = transferReason === "BUY_INTENT" ? "🔥 INTENCIÓN REAL DE COMPRA (IA)" : "👤 SOLICITUD HUMANA (IA)";
      await notifyHumanAdvisor(sessionId, customerName, message, motivo);
      await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
    }

    const matchedProducts = inventory.matchedRows.slice(0, 6).map(p => p.name);
    const actionTag = resolveActionTag({
      intent,
      transferred: shouldTransfer,
      transferReason,
      hallucinationBlocked,
      inventoryMatched: inventory.found,
    });

    // 9. Guardar en DB con metadatos de monitorización
    await query(
      `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
      [
        sessionId,
        JSON.stringify({
          role: "assistant",
          type: "text",
          agent: "super_agent_v2",
          intent,
          actionTag,
          matchedProducts,
          transferred: shouldTransfer,
          transferReason,
          hallucinationBlocked,
          content: cleanResponse,
        }),
      ]
    );

    return {
      text: cleanResponse,
      imageUrls,
      transferred: shouldTransfer,
      transferReason,
      actionTag,
      hallucinationBlocked,
      matchedProducts,
      intent,
    };
  } catch (error) {
    console.error("CRITICAL WHATSAPP SUPER AGENT ERROR:", error);
    const fallbackErrorMsg =
      `Puedes consultar nuestros modelos y precios oficiales en: ${CATALOG_URL}\n\n` +
      `En breve uno de nuestros asesores en *Practiiko Margarita* (${STORE_ADDRESS}) te atenderá por acá.`;
    try {
      await query(
        `INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [
          sessionId,
          JSON.stringify({
            role: "assistant",
            type: "text",
            agent: "super_agent_v2",
            intent: "ERROR_FALLBACK",
            actionTag: "⚠️ Fallback Seguro",
            matchedProducts: [],
            transferred: false,
            transferReason: null,
            hallucinationBlocked: false,
            content: fallbackErrorMsg,
          }),
        ]
      );
    } catch (dbErr) {
      console.error("Failed to log error to DB:", dbErr);
    }
    return { text: fallbackErrorMsg, imageUrls: [], transferred: false, actionTag: "⚠️ Fallback Seguro" };
  }
}
