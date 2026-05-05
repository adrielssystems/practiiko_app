import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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

  if (["gracias", "ok", "dale", "perfecto", "entendido"].some(w => m.includes(w))) return "OTHER";
  if (m.includes("margarita") || m.includes("porlamar") || m.includes("pampatar")) return "LOCATION_UPDATE";
  if (m.includes("precio") || m.includes("cuanto")) return "PRICE_INFO";
  if (m.includes("catalogo") || m.includes("ver todo")) return "CATALOG";
  if (m.includes("sofa") || m.includes("colchon") || m.match(/[a-z]\d{3}/)) return "PRODUCT_QUERY";
  if (m.includes("hola") || m.includes("buen")) return "GREETING";

  return "OTHER";
}

/**
 * KEYWORD
 */
function extractKeyword(message) {
  const m = normalize(message);

  const code = m.match(/[a-z]\d{3}/);
  if (code) return code[0];

  if (m.includes("sofa")) return "sofa";
  if (m.includes("colchon")) return "colchon";

  return null;
}

/**
 * UBICACIÓN
 */
function detectLocation(message, history) {
  const text = normalize(history + " " + message);
  if (text.includes("margarita") || text.includes("porlamar")) return "MARGARITA";
  return "UNKNOWN";
}

/**
 * DB
 */
async function getInventory(term, intent, location) {
  try {
    let rows = [];
    let categories = [];
    let isFallback = false;

    // 1. Traer categorías activas para el saludo
    const catRes = await query("SELECT name FROM categories ORDER BY name ASC");
    categories = catRes.rows.map(c => c.name);

    const baseQuery = `
      SELECT p.name, p.code, p.price_bcv, p.price_cash, p.description, c.name as categoria
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `;

    // 2. Lógica de búsqueda de productos
    if (intent === "CATALOG") {
      const res = await query(baseQuery + " LIMIT 15");
      rows = res.rows;
    }

    if (term) {
      const res = await query(
        baseQuery + ` AND (p.name ILIKE $1 OR p.code ILIKE $1 OR c.name ILIKE $1) LIMIT 15`,
        [`%${term}%`]
      );
      rows = res.rows;

      if (rows.length === 0) {
        const res2 = await query(baseQuery + " LIMIT 5");
        rows = res2.rows;
        isFallback = true;
      }
    }

    console.log(`[DB DEBUG] Categorías: ${categories.join(", ")} | Productos: ${rows.length}`);

    // 3. Formatear el texto para la IA
    const productsText = rows.map(p => {
      return `💎 PRODUCTO: ${p.name}
- Código: ${p.code}
- Categoría: ${p.categoria}
- Descripción: ${p.description || "N/A"}
- Precio BCV: $${p.price_bcv || 'Consultar'}
- Precio ESPECIAL (Divisas/Zelle): $${p.price_cash || 'Consultar'}
- Envío: ${location === "MARGARITA" ? "Gratis" : "TEALCA (Cobro Destino)"} 💎`;
    }).join("\n\n");

    const categoriesText = categories.length > 0 ? `CATEGORÍAS DISPONIBLES: ${categories.join(", ")}` : "";

    return {
      found: rows.length > 0 || categories.length > 0,
      text: `${categoriesText}\n\n${productsText}`,
      isFallback
    };
  } catch (e) {
    console.error("[DB ERROR]:", e);
    return { found: false, text: "", isFallback: false };
  }
}

/**
 * RESPUESTA FINAL (LLM con Deepseek)
 */
async function buildResponse(message, customerName, inventory, location, history) {
  const isMargarita = location === "MARGARITA";

  const prompt = `
IDENTIDAD: Agente de Ventas Practiiko. No eres un bot, eres un asesor de lujo.

REGLAS MILITARES DE BREVEDAD:
1. CERO RELLENO: Prohibido usar frases como "Gracias por...", "Un placer...", "Agradezco su...", "Entiendo que...". Ve directo al grano.
2. MÁXIMO 20 PALABRAS: Si tu respuesta tiene más de 20 palabras, está mal.
3. ESTRUCTURA: [Respuesta directa] + [Pregunta corta].
4. PRECIOS: Solo si tienes CIUDAD. 
   - SI ESTÁ EN MARGARITA: Da el "Precio BCV" y dile como gancho: "Si paga en divisas, efectivo o Zelle, el precio le queda en solo [Precio Cash]".
   - SI NO ES MARGARITA: No des precios todavía, pide su ciudad para calcular logística de envío.
5. NO INVENTARIO: Si el producto no está en la lista de abajo, di: "Ese modelo no está disponible ahora, ¿le interesa ver nuestros Sofá Cama?" (Y nada más).
6. CIUDAD: PROHIBIDO preguntar la ciudad si ya está en el historial o si el sistema ya la detectó. (Ubicación actual: ${location}).
7. CATÁLOGO: PROHIBIDO enviar el link del catálogo a menos que el cliente lo pida expresamente. Si lo pide, usa este: www.bit.ly/CatalogoPractiiko
8. GREETING: Si el cliente solo saluda ("hola"), responde: "¡Hola! Un gusto. Tenemos colchones, sofás y sofás cama en varios modelos y colores. ¿Cuál le interesa?". NO pidas ciudad todavía.
9. HORARIOS Y TIENDA: SOLO dar esta info si el cliente la pide o si confirma estar en Margarita y quiere visitar. Local A-14, CC Terranova Plaza. Lun-Vie: 8:30 AM-4:30 PM. Sáb: 9:00 AM-1:00 PM. Maps: https://maps.google.com/?q=X49X%2BXF+Porlamar
10. PERSONALIZACIÓN: Usa el nombre del cliente (si no es "Cliente" o "Explorador") para saludar o responder de forma más personal.
11. CAMPAÑAS: Si el mensaje es solo una palabra clave (ej: "mama"), asume que viene de un post. Y enviale el catalogo, usa este: www.bit.ly/CatalogoPractiiko.
12. PRECISIÓN TÉCNICA: No confundas "Sofá" con "Sofá Cama". Si el cliente pide uno y solo tenemos el otro, aclara que nuestros modelos son Sofá Cama (multifuncionales).
13. TAMAÑOS: Menciona siempre si el producto es Individual, Matrimonial, Queen o de 2/3 asientos según la descripción. Es un dato crítico para el cliente.
14. CASHEA: Aceptamos Cashea (Precio BCV). Promo Mamá (hasta 10/05): Inicial desde 20% y hasta 12 cuotas. Niveles 3-4 (min $200): 25-30% inicial, 6 cuotas. Nivel 5 (min $450): 25% inicial, 9 cuotas. Nivel 6 (min $600): 20% inicial, 12 cuotas. Sé muy breve.
15. DESCONOCIMIENTO: Si te preguntan algo que no sepas o no esté en estas reglas, di que no manejas esa info y avisarás a un asesor para que lo contacte. No inventes.

INVENTARIO (Usa solo lo necesario):
${inventory.text}

HISTORIAL:
${history}

CLIENTE NOMBRE: ${customerName}
MENSAJE ACTUAL: ${message}

CIERRE:
Es lujo, es simple, es Practiiko.
`;

  try {
    const model = getModel();
    if (!model) throw new Error("Model not initialized (missing API Key)");

    const response = await model.invoke([
      new SystemMessage(prompt),
      new HumanMessage(message)
    ]);
    return response.content;
  } catch (error) {
    console.error("DEBUG - DeepSeek Error:", error.message);
    // Fallback manual si falla la API (Muy importante para no dejar al cliente mudo)
    const locationText = isMargarita ? "\n🚚 Envío gratis en Margarita." : "\n📦 Envíos nacionales: 0424-8948664.";
    const list = inventory.text || "Visita nuestro catálogo para ver modelos y precios.";
    return `¡Hola ${customerName}! 👋 (Mód. Estático) 💎\n\n${list}\n${locationText}\n\n📸 Ver más: www.bit.ly/CatalogoPractiiko`;
  }
}

/**
 * MAIN
 */
export async function processChatMessage(message, sessionId, source = 'dm', commentId = null, customerName = 'Cliente') {
  try {
    const intent = detectIntent(message);

    // RESPUESTAS RÁPIDAS
    // GESTIÓN DE INTENCIONES ESPECIALES (No cortocircuitamos, dejamos que Deepseek les de forma)
    let currentIntent = intent;
    if (intent === "LOCATION_UPDATE") currentIntent = "CATALOG";

    // Si es un saludo o no hay intención clara, forzamos catálogo para que Deepseek tenga algo que mostrar
    if (intent === "GREETING" || intent === "OTHER") {
      currentIntent = "CATALOG";
    }

    // historial (últimos 6 mensajes para contexto completo)
    const table = source === 'whatsapp' ? 'whatsapp_messages' : 'instagram_messages';

    const historyRes = await query(
      `SELECT message FROM ${table} WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`,
      [sessionId]
    );

    const historyArray = historyRes.rows.reverse().map(r => {
      const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
      return `${msg.role === 'user' ? 'Cliente' : 'Agente'}: ${msg.content}`;
    });

    const history = historyArray.join("\n");

    const location = detectLocation(message, history);

    const term = extractKeyword(message);
    const inventory = await getInventory(term, currentIntent, location);

    // Si no hay inventario y no es un saludo, damos respuesta de fallback
    if (!inventory.found && intent !== "GREETING" && intent !== "OTHER") {
      const noProdMsg = `No encontré ese modelo exacto 💎`;

      if (source === 'whatsapp') {
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, JSON.stringify({ role: 'assistant', content: noProdMsg })]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, JSON.stringify({ role: 'assistant', content: noProdMsg }), source, commentId]);
      }
      return noProdMsg;
    }

    const response = await buildResponse(message, customerName, inventory, location, history);

    // guardar
    if (source === 'whatsapp') {
      await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: response })]);
    } else {
      await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`,
        [sessionId, JSON.stringify({ role: 'assistant', content: response }), source, commentId]);
    }

    return response;

  } catch (error) {
    console.error("CRITICAL AGENT ERROR:", error);
    const errorMsg = "Error consultando inventario 💎";

    // Intentar guardar el error en la DB para que el admin lo vea
    try {
      const table = source === 'whatsapp' ? 'whatsapp_messages' : 'instagram_messages';
      if (source === 'whatsapp') {
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg })]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, JSON.stringify({ role: 'assistant', content: errorMsg }), source, commentId]);
      }
    } catch (dbErr) {
      console.error("Failed to log error to DB:", dbErr);
    }

    return errorMsg;
  }
}
