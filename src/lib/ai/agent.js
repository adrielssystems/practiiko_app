import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { query } from "@/lib/db";

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
      temperature: 0.3,
    });
  }
  return _model;
}

/**
 * NORMALIZADOR
 */
function normalize(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * INTENCIÓN
 */
function detectIntent(message) {
  const m = normalize(message);

  // 1. Solicitud Humana (PRIORITARIA)
  if (m.includes("asesor") || m.includes("humano") || m.includes("persona") || m.includes("atenderme") || m.includes("hablar con alguien") || m.includes("hablar con un") || m.includes("contacto") || m.includes("llamar") || m.includes("telefono")) return "HUMAN_REQUEST";

  // 2. Métodos de Pago, Compras, Crédito y ofertas (Redirigir a agente)
  if (m.includes("comprar") || m.includes("compro") || m.includes("adquirir") || m.includes("ordenar") || m.includes("pedido") || m.includes("zelle") || m.includes("paypal") || m.includes("transferencia") || m.includes("deposito") || m.includes("cuenta") || m.includes("efectivo") || m.includes("tarjeta") || m.includes("cuotas") || m.includes("credito") || m.includes("financiamiento") || m.includes("descuento") || m.includes("oferta") || m.includes("precio especial") || m.includes("pagar") || m.includes("pago") || m.includes("pagos") || m.includes("metodos de pago")) return "BUY_REQUEST";

  // 3. Especificaciones del producto o dudas técnicas particulares (Redirigir a agente)
  if (m.includes("medida") || m.includes("tela") || m.includes("material") || m.includes("densidad") || m.includes("goma") || m.includes("madera") || m.includes("estructura") || m.includes("puestos") || m.includes("individual") || m.includes("matrimonial") || m.includes("dimension") || m.includes("especificacion")) return "HUMAN_REQUEST";

  // 4. Envíos y entregas (Redirigir a agente)
  if (m.includes("envio") || m.includes("delivery") || m.includes("despacho") || m.includes("flete") || m.includes("enviar") || m.includes("mandar") || m.includes("entrega") || m.includes("entregas")) return "HUMAN_REQUEST";

  // Cortesía simple (evaluar DESPUÉS de redirección para no cortocircuitar)
  if (["gracias", "ok", "dale", "perfecto", "entendido"].some(w => m.includes(w))) return "OTHER";

  if (m.includes("margarita") || m.includes("porlamar") || m.includes("pampatar")) return "LOCATION_UPDATE";
  if (m.includes("precio") || m.includes("cuanto") || m.includes("cuesta") || m.includes("vale")) return "PRICE_INFO";
  if (m.includes("catalogo") || m.includes("ver todo")) return "CATALOG";
  if (m.includes("sofa") || m.includes("colchon") || m.match(/[a-z]\d{3}/)) return "PRODUCT_QUERY";
  if (m.includes("hola") || m.includes("buen")) return "GREETING";

  return "OTHER";
}

/**
 * KEYWORDS (Búsqueda Multi-Término)
 */
function extractKeywords(message) {
  const m = normalize(message);

  const stopWords = [
    "hola", "precio", "cuanto", "cuesta", "vale", "quiero", "saber", "tienen", "buenas", "tardes", "dias", "noches", 
    "favor", "gracias", "para", "como", "esta", "donde", "tiene", "busco", "necesito", "algun",
    "muestrame", "muestra", "ver", "fotos", "foto", "imagenes", "imagen", "del", "las", "los", "una", "uno", "unos", "unas", 
    "este", "esto", "de", "el", "la", "ese", "eso", "esa", "esos", "esas", "aqui", "alla", "mueble", "muebles", 
    "sofa", "sofas", "colchon", "colchones", "modelo", "modelos", "gustaria", "mas", "informacion", "detalle", "detalles",
    "enviar", "mandar", "pasar", "saber", "conocer"
  ];
  const words = m.split(/[\s,?.!]+/).filter(w => w.length >= 3 && !stopWords.includes(w));

  return words.length > 0 ? words : null;
}

function detectLocation(message, history) {
  const text = normalize(history + " " + message);
  if (text.includes("margarita") || text.includes("porlamar") || text.includes("pampatar") || text.includes("nueva esparta") || text.includes("juan griego") || text.includes("asuncion")) return "MARGARITA";

  const outsideCities = ["caracas", "valencia", "maracaibo", "maracay", "barquisimeto", "lecheria", "puerto la cruz", "barcelona", "maturin", "cumana", "merida", "tachira", "zulia", "anzoategui", "aragua", "carabobo", "miranda", "lara", "extranjero", "brasil", "colombia", "usa", "miami", "panama", "españa", "chile", "peru", "ecuador", "argentina"];
  if (outsideCities.some(city => text.includes(city))) return "OUTSIDE";

  return "UNKNOWN";
}

/**
 * DB
 */
async function getInventory(terms, intent, location) {
  try {
    let rows = [];
    let categories = [];
    let isFallback = false;

    // 1. Traer categorías activas para el saludo
    const catRes = await query("SELECT name FROM categories ORDER BY name ASC");
    categories = catRes.rows.map(c => c.name);

    const baseQuery = `
      SELECT p.name, p.code, p.pseudonimo, p.price_bcv, p.price_cash, p.description, c.name as categoria,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_main DESC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND p.stock > 0
    `;

    // 2. Lógica de búsqueda de productos
    if (intent === "CATALOG") {
      const res = await query(baseQuery + " LIMIT 20");
      rows = res.rows;
    } else if (terms && terms.length > 0) {
      let conditions = [];
      let params = [];

      // Búsqueda estricta: EL producto DEBE coincidir con todos los términos (ej. "sofa" AND "azul")
      terms.forEach((term, index) => {
        conditions.push(`(p.name ILIKE $${index + 1} OR p.code ILIKE $${index + 1} OR c.name ILIKE $${index + 1} OR p.description ILIKE $${index + 1})`);
        params.push(`%${term}%`);
      });

      const whereClause = conditions.join(" AND ");

      const res = await query(
        baseQuery + ` AND ${whereClause} LIMIT 15`,
        params
      );
      rows = res.rows;

      // Si el cliente pide algo muy específico ("sofa azul gigante") y no hay, traemos variedad para que la IA le ofrezca alternativas
      if (rows.length === 0) {
        const res2 = await query(baseQuery + " LIMIT 20");
        rows = res2.rows;
        isFallback = true;
      }
    } else {
      // Siempre enviar algo de inventario para que la IA no se quede ciega
      const res2 = await query(baseQuery + " LIMIT 20");
      rows = res2.rows;
    }

    console.log(`[DB DEBUG] Categorías: ${categories.join(", ")} | Productos: ${rows.length}`);
    rows.forEach(r => console.log(`[DB DEBUG] Producto: ${r.name} | IMG: ${r.image_url}`));

    // 3. Formatear el texto para la IA (AGRUPADO POR PSEUDONIMO)
    const groups = {};
    rows.forEach(p => {
      const key = p.pseudonimo || p.name;
      if (!groups[key]) {
        groups[key] = {
          name: key,
          categoria: p.categoria,
          description: p.description,
          variants: []
        };
      }
      groups[key].variants.push(p);
    });

    const productsText = Object.values(groups).map(g => {
      const colorsAndUrls = g.variants
        .map(v => {
          let colorName = "";
          const KNOWN_COLORS = [
            "gris claro", "gris medio", "gris", "rosado", "verde oliva", 
            "verde", "arena", "blanco", "beige", "azul", "negro", "crema", "naranja"
          ];
          const nameLower = v.name.toLowerCase();
          
          const matchedColor = KNOWN_COLORS
            .sort((a, b) => b.length - a.length)
            .find(color => nameLower.endsWith(color) || nameLower.includes(" " + color + " "));
            
          if (matchedColor) {
            colorName = matchedColor.toUpperCase();
          } else if (v.pseudonimo) {
            const pseudonimoLower = v.pseudonimo.toLowerCase();
            if (nameLower.includes(pseudonimoLower)) {
              const idx = nameLower.indexOf(pseudonimoLower);
              colorName = v.name.substring(idx + v.pseudonimo.length).trim();
            }
          }
          if (!colorName) {
            const match = v.name.match(/COLOR\s+([A-ZÁÉÍÓÚÑ\s]+)/i) || v.description?.match(/COLOR\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
            colorName = match ? match[1].trim() : "Estándar";
          }
          return `${colorName} (URL_FOTO: ${v.image_url || "No disponible"})`;
        })
        .filter((v, i, a) => a.indexOf(v) === i); // Únicos

      const first = g.variants[0];
      const priceInfo = `- Precio BCV: $${first.price_bcv}`;

      return `💎 MODELO: ${g.name}
- Categoría: ${g.categoria}
- Colores y URLs de Imágenes Disponibles:
  ${colorsAndUrls.join("\n  ")}
- Descripción: ${g.description || "N/A"}
${priceInfo} 💎`;
    }).join("\n\n");

    const categoriesText = categories.length > 0 ? `CATEGORÍAS DISPONIBLES: ${categories.join(", ")}` : "";

    return {
      found: rows.length > 0 || categories.length > 0,
      text: `${categoriesText}\n\n${productsText}`,
      isFallback,
      rows
    };
  } catch (e) {
    console.error("[DB ERROR]:", e);
    return { found: false, text: "", isFallback: false, rows: [] };
  }
}

/**
 * RESPUESTA FINAL (LLM con Deepseek)
 */
async function buildResponse(message, customerName, inventory, location, historyMessages, source, dynamicKnowledge = "", isFallback = false) {

  const prompt = `
IDENTIDAD: Recepcionista de Lujo / Lobby Concierge de Practiiko. Nuestro sitio web oficial es https://www.practiiko.com. Eres sumamente cordial, empático, servicial y elegante. Tu rol es dar la bienvenida al cliente al "Lobby" de Practiiko, guiándolo con amabilidad, y delegar las consultas de ventas particulares o técnicas al asesor humano especializado.

REGLAS DE ATENCIÓN AL CLIENTE:
1. AMABILIDAD Y BIENVENIDA (LOBBY): SIEMPRE saluda de manera sumamente cálida y hospitalaria al cliente (Ej: "¡Hola! Qué gusto saludarte 🌹 Claro, con gusto te ayudo a orientarte." o si sabes su nombre: "¡Hola ${customerName}! Qué gusto saludarte 🌹 Claro, con gusto te ayudo."). Eres la primera cara que el cliente ve al entrar a nuestra tienda de lujo.
2. BREVEDAD EXTREMA E INVITACIÓN AL SHOWROOM (CRÍTICO):
   - **Tus respuestas deben ser extremadamente cortas, elegantes, amables y directas (máximo 2 o 3 líneas). Evita explicaciones largas, rodeos o redundancias.**
   - **INVITAR AL CATÁLOGO WEB (REGLA DE ORO):** Ante saludos iniciales o cualquier pregunta general (ej: "Hola", "Quiero información", "¿Qué tienen?", "¿Qué modelos hay?", "¿Qué sofás venden?"), debes dar la bienvenida y guiar de forma muy elegante al cliente a explorar todos nuestros modelos, fotos y detalles directamente en nuestro catálogo y showroom digital en https://www.practiiko.com.
   - **PROHIBICIÓN ABSOLUTA DE NOMBRES DE MODELOS EN SALUDOS/CONSULTAS GENERALES:** Está estrictamente prohibido listar de manera proactiva o mencionar nombres de modelos de sofás (como Caterpillar, Merey, Lemmy, Tofu, Nube, Burbuja, etc.) en mensajes de bienvenida, saludos o consultas genéricas de información. El cliente no conoce estos nombres técnicos y se confunde.
3. PRECIOS EXCLUSIVAMENTE SI PREGUNTAN PUNTUALMENTE POR SU NOMBRE (CRÍTICO):
   - **DAR PRECIO INDIVIDUAL:** Si el cliente pregunta de forma directa y puntual por el precio de un modelo de sofá por su nombre específico (ej: "¿Qué precio tiene el Caterpillar?" o "¿Cuánto cuesta el Lemmy?"), indícale de inmediato el Precio BCV exacto de ese modelo de forma sumamente corta e invítalo a ver sus fotos y colores en la web https://www.practiiko.com.
   - **PREGUNTAS DE PRECIO GENÉRICAS:** Si el cliente pregunta por precios de manera general sin mencionar el nombre del modelo (ej: "¿Qué precios tienen los sofás?" o "¿Cuánto cuestan?"), NO inventes, no adivines ni menciones modelos. Invítalo amablemente a explorar todos los precios y modelos en el catálogo web https://www.practiiko.com.
   - **ÚNICAMENTE PRECIO BCV:** El bot tiene estrictamente **PROHIBIDO** dar "precios especiales", "descuentos cash", "Zelle", "efectivo" o "divisas". Solo debes dar el "Precio BCV" disponible en el INVENTARIO.
4. NO INVENTAR Y TRASPASO AL ASESOR ESPECIALISTA (CRÍTICO):
   - **PROHIBICIÓN DE ALUCINACIONES:** Está estrictamente prohibido inventar nombres de productos, colores, medidas, materiales, promociones o datos que no estén explícitamente en la sección INVENTARIO al final de este mensaje.
   - **DELEGACIÓN INMEDIATA (REDISPATCH):** El recepcionista no gestiona ventas, no da especificaciones de materiales, no calcula envíos ni coordina formas de pago. Si el cliente pregunta por:
     - Detalles técnicos / especificaciones (medidas, tamaño, tipo de tela, materiales, densidad de espuma, etc.)
     - Formas de pago (transferencias, Zelle, efectivo, cuotas, crédito, etc.)
     - Envíos, fletes o logística (costos de envío, delivery, fletes nacionales, etc.)
     - Deseo de compra directa (cómo comprar, concretar pedido)
     - O si pregunta por algo de lo que no tienes información exacta en el inventario,
     - **DEBES** responder de manera sumamente atenta diciendo que lo estás comunicando en este instante con un asesor humano especialista en ventas para que le atienda de inmediato por este mismo chat.
     - Ejemplo: "Entendido 💎. Con gusto un asesor especializado te ayudará de inmediato con todos los detalles técnicos / formas de pago / envíos / tu compra por este mismo chat. Te estoy transfiriendo en este momento."
5. PERSUASIÓN Y VENTA: Cíñete a responder el precio de lo que hay. Si preguntan por algo agotado o inexistente, indícale amablemente que no disponemos de ese artículo y que un asesor humano lo asistirá para buscar alternativas.
6. FOTOS OBLIGATORIAS: Si el cliente pide fotos de un modelo específico y este se encuentra listado en el inventario, incluye "URL_FOTO: " seguido de la URL exacta que sale en el inventario. De lo contrario, no envíes fotos.
7. HORARIOS Y TIENDA: CC Terranova Plaza, Porlamar, Isla de Margarita. Lun-Vie: 8:30 AM-4:30 PM. Sáb: 9:00 AM-1:00 PM.
8. OBJETIVO SEGÚN EL CANAL (${source}):
    - INSTAGRAM: Brindar atención inicial y redirigir a WhatsApp (https://wa.me/584248948664).
    - WHATSAPP: Asesorar a nivel de lobby y delegar de inmediato al asesor humano para concretar la venta. **IMPORTANTE: Si estás en WhatsApp, nunca pidas al cliente que escriba a otro número o enlace de wa.me. Dile que un asesor le atenderá por este chat.**
9. DESPEDIDA: Cierra con: "Es lujo, es simple, es Practiiko 💎".
${dynamicKnowledge ? `10. REGLAS DINÁMICAS Y PROMOCIONES VIGENTES:\n${dynamicKnowledge}` : ""}

INVENTARIO DISPONIBLE (Usa solo la información necesaria. Siempre muestra el Precio BCV. Nunca reveles el Precio Cash ni precios especiales):
${inventory.text}
${isFallback ? "\n⚠️ NOTA INTERNA: No se encontró el producto exacto solicitado. Los resultados son alternativas del catálogo. Informa al cliente amablemente que no disponemos de lo que busca exactamente y ofrécele las alternativas listadas." : ""}

ORIGEN DEL MENSAJE: ${source}

CIERRE:
Nunca olvides mantener la educación, la amabilidad y el enfoque en la satisfacción del cliente.
`;

  try {
    const model = getModel();
    if (!model) throw new Error("Model not initialized (missing API Key)");

    const finalMessages = [
      new SystemMessage(prompt),
      ...historyMessages,
      new SystemMessage("REGLA CRÍTICA DE RESPUESTA: Si el cliente ha pedido fotos, imágenes o ver el modelo, DEBES obligatoriamente escribir 'URL_FOTO: [URL]' para cada color del inventario que le nombres. NUNCA respondas con una línea en blanco debajo del nombre del color. El formato exacto debe ser:\n\n*Color NombreColor*:\nURL_FOTO: /api/media/..."),
      new HumanMessage(message)
    ];

    const response = await model.invoke(finalMessages);
    return response.content;
  } catch (error) {
    console.error("DEBUG - DeepSeek Error:", error.message);
    // Fallback manual si falla la API (Muy importante para no dejar al cliente mudo)
    return `¡Hola ${customerName}! 😊 Estamos teniendo un pequeño inconveniente técnico. Te invitamos a ver nuestro catálogo completo en https://www.practiiko.com o en breve un asesor te atenderá. Es lujo, es simple, es Practiiko 💎`;
  }
}

/**
 * MAIN
 */
export async function processChatMessage(message, sessionId, source = 'dm', commentId = null, customerName = 'Cliente', baseUrl = '') {
  // Declarada una sola vez en el scope principal (#3)
  const table = source === 'whatsapp' ? 'whatsapp_messages' : 'instagram_messages';

  try {
    // Interceptar si el mensaje es una imagen
    if (message === "[Imagen]") {
      const responseText = `Actualmente no estoy capacitado para interpretar imágenes. Pero si me indicas cómo es el modelo del sofá o sofá cama (su nombre, color o características), con mucho gusto te ayudaré a ubicar toda la información. Es lujo, es simple, es Practiiko 💎`;
      const botPayload = JSON.stringify({ role: 'assistant', content: responseText });
      
      if (source === 'whatsapp') {
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, botPayload]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, botPayload, source, commentId]);
      }
      return { text: responseText, imageUrls: [] };
    }

    const intent = detectIntent(message);

    // GESTIÓN DE INTENCIONES
    let currentIntent = intent;
    if (intent === "LOCATION_UPDATE") currentIntent = "CATALOG";
    if (intent === "GREETING" || intent === "OTHER") currentIntent = "CATALOG";

    // --- CARGAR HISTORIAL PRIMERO para que detectLocation tenga contexto completo (#5) ---
    const historyRes = await query(
      `SELECT message FROM ${table} WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`,
      [sessionId]
    );
    const historyMessages = historyRes.rows.reverse().map(r => {
      const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
      return msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content);
    });

    // Detectar ubicación con historial completo disponible
    const textHistory = historyMessages.map(m => m.content).join(" ");
    const location = detectLocation(message, textHistory);

    // Manejo de HUMAN_REQUEST y BUY_REQUEST (ALERTA CRÍTICA)
    if (currentIntent === "HUMAN_REQUEST" || currentIntent === "BUY_REQUEST") {
      let response = "Entendido 💎. Para brindarte la mejor información de manera personalizada, en este mismo instante te estoy transfiriendo con uno de nuestros asesores de ventas especializados. Te atenderá por este mismo chat en breve.";
      if (currentIntent === "BUY_REQUEST") {
        response = "¡Excelente elección! 💎 Para ayudarte a concretar tu compra de inmediato, en este mismo instante te estoy comunicando con uno de nuestros asesores de ventas especializados, quien te atenderá aquí mismo en breve.";
      }

      const motivo = currentIntent === "BUY_REQUEST" ? "🔥 INTENCIÓN DE COMPRA" : "🚨 SOLICITUD HUMANA";
      const notifyText = `${motivo}\n\n*Canal:* ${source.toUpperCase()}\n*Cliente:* ${customerName} (+${sessionId})\n*Ubicación detectada:* ${location}\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\nhttps://wa.me/${sessionId}`;

      const EVO_URL = process.env.EVOLUTION_API_URL;
      const EVO_KEY = process.env.EVOLUTION_API_KEY;
      const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
      const adminPhone = "584248068515";
      const groupId = process.env.NOTIFICATIONS_GROUP_ID;

      // Notificar al admin y grupo (aplica para WHATSAPP e INSTAGRAM) (#2)
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
          console.error("Error en flujo de notificaciones:", e);
        }
      }

      // Guardar mensaje del usuario ANTES de la respuesta (#7)
      const userPayload = JSON.stringify({ role: 'user', content: message });
      const botPayload = JSON.stringify({ role: 'assistant', content: response });

      if (source === 'whatsapp') {
        // Marcar requires_human y apagar bot para este cliente
        try {
          await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
        } catch(e) {
          console.error("Error actualizando requires_human:", e);
        }
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, userPayload]);
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, botPayload]);
      } else {
        // Instagram: notificar al admin por WhatsApp + guardar en DB (#2)
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, userPayload, source, commentId]);
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, botPayload, source, commentId]);
      }
      return { text: response, imageUrls: [] };
    }

    const terms = extractKeywords(message);
    const inventory = await getInventory(terms, currentIntent, location);

    // EXTRAER CONOCIMIENTO DINÁMICO DE LA BD (Cerebro IA)
    let dynamicKnowledge = "";
    try {
      const settingsRes = await query("SELECT value FROM app_settings WHERE key = 'ai_custom_instructions'");
      if (settingsRes.rows.length > 0) {
        dynamicKnowledge = settingsRes.rows[0].value;
        console.log(`[DEBUG LLM KNOWLEDGE]\n${dynamicKnowledge}\n[DEBUG LLM KNOWLEDGE END]`);
      }
    } catch (e) {
      console.warn("No se pudo cargar ai_custom_instructions de la BD:", e.message);
    }

    // Si no hay inventario y no es un saludo, es una pregunta sobre un producto no disponible o desconocido.
    // Como el bot no debe inventar ni dejar al cliente sin respuesta satisfactoria, redirigimos de inmediato al agente humano.
    if (!inventory.found && intent !== "GREETING" && intent !== "OTHER") {
      const response = "Entendido 💎. En este momento no cuento con la información exacta sobre ese modelo o artículo. Te estoy transfiriendo de inmediato con un asesor de ventas especializado por este chat para que te ayude y aclare todas tus dudas.";

      const notifyText = `🚨 CONSULTA DE PRODUCTO INEXISTENTE/DESCONOCIDO\n\n*Canal:* ${source.toUpperCase()}\n*Cliente:* ${customerName} (+${sessionId})\n*Ubicación detectada:* ${location}\n*Mensaje:* "${message}"\n\n👇 Responde aquí:\nhttps://wa.me/${sessionId}`;

      const EVO_URL = process.env.EVOLUTION_API_URL;
      const EVO_KEY = process.env.EVOLUTION_API_KEY;
      const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";
      const adminPhone = "584248068515";
      const groupId = process.env.NOTIFICATIONS_GROUP_ID;

      // Notificar al admin y grupo
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
          console.error("Error en flujo de notificaciones (fallback):", e);
        }
      }

      // Guardar mensaje del usuario y la respuesta de redirección
      const userPayload = JSON.stringify({ role: 'user', content: message });
      const botPayload = JSON.stringify({ role: 'assistant', content: response });

      if (source === 'whatsapp') {
        try {
          await query("UPDATE whatsapp_customers SET ai_enabled = false, requires_human = true WHERE id = $1", [sessionId]);
        } catch(e) {
          console.error("Error actualizando requires_human (fallback):", e);
        }
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, userPayload]);
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, botPayload]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, userPayload, source, commentId]);
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, botPayload, source, commentId]);
      }
      return { text: response, imageUrls: [] };
    }

    // Pasar isFallback para que DeepSeek sepa si los resultados son exactos o alternativos (#6)
    const rawResponse = await buildResponse(message, customerName, inventory, location, historyMessages, source, dynamicKnowledge, inventory.isFallback);

    console.log(`[DEBUG LLM INVENTORY]\n${inventory.text}\n[DEBUG LLM INVENTORY END]`);
    console.log(`[DEBUG LLM RAW]\n${rawResponse}\n[DEBUG LLM RAW END]`);

    // Extraer URLs de imágenes si existen etiquetas URL_FOTO: url
    let imageUrls = [];
    let cleanResponse = rawResponse;
    const imgMatches = [...rawResponse.matchAll(/URL_FOTO:\s*([^\s]+)/gi)];
    if (imgMatches.length > 0) {
      imageUrls = imgMatches.map(m => {
        let url = m[1].trim();
        if (url.startsWith('/') && baseUrl) {
          url = `${baseUrl}${url}`;
        }
        return url;
      });
      // Remover todas las etiquetas de la respuesta
      cleanResponse = rawResponse.replace(/URL_FOTO:\s*[^\s]+/gi, "").trim();
    }

    // Fallback proactivo: Si la IA no colocó las etiquetas URL_FOTO, pero el cliente pidió fotos/imágenes (o la IA generó una respuesta de fotos), las extraemos del inventario.
    if (imageUrls.length === 0 && inventory.found && inventory.rows) {
      const normalizeMsg = normalize(message);
      const normalizeRawResp = normalize(rawResponse);
      const normalizeHistory = normalize(textHistory);
      const fullContext = normalizeHistory + " " + normalizeMsg + " " + normalizeRawResp;

      // 1. Detección Inteligente de Petición de Fotos (evita disparar si el bot solo pregunta u ofrece)
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
                              normalizeRawResp.includes("te adjunto"));

      const pideFotos = userPideFotos || botEntregaFotos;
                       
      if (pideFotos) {
        const KNOWN_COLORS = [
          "gris claro", "gris medio", "gris", "rosado", "verde oliva", 
          "verde", "arena", "blanco", "beige", "azul", "negro", "crema", "naranja"
        ];
        // Buscar color mencionado en el mensaje actual, respuesta o historial
        const mentionedColor = KNOWN_COLORS.find(c => fullContext.includes(c));
        
        // Palabras genéricas a ignorar para evitar falsos positivos de otros modelos
        const GENERIC_WORDS = [
          "sofa", "sofas", "sofá", "sofás", "modular", "mueble", "muebles", "poltrona", "butaca", 
          "sillon", "sillón", "mesa", "juego", "para", "tres", "puestos", "asientos", 
          "gris", "claro", "medio", "verde", "oliva", "arena", "blanco", "beige", 
          "azul", "negro", "crema", "naranja", "rosado"
        ];
        
        inventory.rows.forEach(r => {
          if (r.image_url) {
            // Verificar si el nombre, código o seudónimo del producto aparece en el contexto completo
            const prodName = normalize(r.name);
            const prodCode = normalize(r.code || "");
            const prodPseudonimo = normalize(r.pseudonimo || "");
            
            // Filtrar palabras genéricas y colores de la comparación del nombre del producto
            const nameWords = prodName.split(" ").filter(word => !GENERIC_WORDS.includes(word));
            
            // El modelo se considera mencionado si alguna palabra distintiva aparece en el contexto completo
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

    // Guardar respuesta del bot
    if (source === 'whatsapp') {
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: cleanResponse })]);
    } else {
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: cleanResponse }), source, commentId]);
    }

    return { text: cleanResponse, imageUrls };

  } catch (error) {
    console.error("CRITICAL AGENT ERROR:", error);
    const errorMsg = "Error consultando inventario 💎";

    // Guardar error en DB usando `table` del scope principal (sin redeclarar) (#3)
    try {
      if (source === 'whatsapp') {
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg })]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg }), source, commentId]);
      }
    } catch (dbErr) {
      console.error("Failed to log error to DB:", dbErr);
    }

    return { text: errorMsg, imageUrls: [] };
  }
}
