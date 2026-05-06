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

function detectLocation(message, history) {
  const text = normalize(history + " " + message);
  if (text.includes("margarita") || text.includes("porlamar") || text.includes("pampatar") || text.includes("nueva esparta") || text.includes("juan griego") || text.includes("asuncion")) return "MARGARITA";

  const outsideCities = ["caracas", "valencia", "maracaibo", "maracay", "barquisimeto", "lecheria", "puerto la cruz", "barcelona", "maturin", "cumana", "merida", "tachira", "zulia", "anzoategui", "aragua", "carabobo", "miranda", "lara"];
  if (outsideCities.some(city => text.includes(city))) return "OUTSIDE";

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
      let priceInfo = "";
      if (location === "MARGARITA") {
        priceInfo = `- Precio BCV: $${p.price_bcv || 'Consultar'}\n- Precio ESPECIAL (Divisas/Zelle): $${p.price_cash || 'Consultar'}\n- Envío: Gratis en Margarita`;
      } else {
        priceInfo = `- Precio: [OCULTO] Dile al cliente que debe contactar al asesor de ventas en WhatsApp para acordar precio y envío.\n- Envío: Nacional (Cobro Destino), acordar en WhatsApp.`;
      }

      return `💎 PRODUCTO: ${p.name}
- Código: ${p.code}
- Categoría: ${p.categoria}
- Descripción: ${p.description || "N/A"}
${priceInfo} 💎`;
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
async function buildResponse(message, customerName, inventory, location, history, source) {
  const isMargarita = location === "MARGARITA";

  const prompt = `
IDENTIDAD: Asesor de Ventas de Lujo de Practiiko. Eres muy amable, servicial y sumamente educado. No eres un robot automático, eres un asistente premium.

REGLAS DE ATENCIÓN AL CLIENTE:
1. AMABILIDAD Y SALUDO: SIEMPRE saluda al cliente de manera cordial al iniciar la conversación, usando su nombre si lo sabes (Ej: "¡Hola ${customerName}! Qué gusto saludarte."). Sé empático y amable.
2. BREVEDAD: Mantén tus respuestas claras y concisas, pero siempre con un tono humano y servicial.
3. UBICACIÓN Y PRECIOS (CRÍTICO):
   - SI EL CLIENTE ESTÁ EN MARGARITA (NUEVA ESPARTA): El envío es GRATIS. Puedes darle los precios de los productos (Precio BCV y como beneficio adicional, el Precio Especial en Divisas/Zelle).
   - SI EL CLIENTE NO ESTÁ EN MARGARITA O ES DE OTRO ESTADO: **PROHIBIDO** dar precios. Debes decirle amablemente que para compras con envíos nacionales y para acordar el precio del producto, debe comunicarse directamente con nuestro asesor de ventas principal. Entrégale este enlace: https://wa.me/584248948664
   - SI NO SABES LA CIUDAD Y PIDE PRECIO: Antes de dar cualquier precio o disponibilidad, pregunta amablemente desde qué ciudad nos escribe.
4. CIUDAD ACTUAL: (Ubicación detectada: ${location}). NO le preguntes su ciudad si ya dice MARGARITA u OUTSIDE.
5. NO INVENTARIO: Si buscas un producto y no está en la lista de abajo, dile amablemente: "Actualmente no tenemos ese modelo exacto en tienda, pero ¿le interesaría conocer nuestros Sofá Cama y Colchones disponibles?".
6. CATÁLOGO: Si piden ver todos los modelos, invítalos cordialmente a ver nuestro catálogo: www.bit.ly/CatalogoPractiiko
    - No debes ofrecer imagenes de los productos y si el cliente te pide una imagen, dile amablemente que se comunique con nuestro asesor de ventas principal. Entrégale este enlace: https://wa.me/584248948664
7. CASHEA: Aceptamos Cashea (sobre Precio BCV). Inicial desde 20% y hasta 12 cuotas dependiendo del nivel en la app. (Mencionar solo si preguntan por métodos de pago o cuotas).
    - Cualquier otra negociacion on propuesta del cliente debe ser manejada por el asesor de ventas principal.
8. HORARIOS Y TIENDA: Local A-14, CC Terranova Plaza, Porlamar, Isla de Margarita. Lun-Vie: 8:30 AM-4:30 PM. Sáb: 9:00 AM-1:00 PM. (Da esta info solo si el cliente la solicita).
9. CAMPAÑAS: Si el cliente escribe solo una palabra (ej: "mama", "promocion", "poltrona" = "puf"), saluda amablemente, asume que viene de una publicidad y entrégale el catálogo: www.bit.ly/CatalogoPractiiko
10. PRECISIÓN TÉCNICA: Aclara amablemente la diferencia si el cliente pide "Sofá" y nosotros ofrecemos "Sofá Cama" (que son más versátiles).
11. TAMAÑOS: Menciona amablemente si es Individual, Matrimonial, Queen, etc., para que el cliente esté seguro.
12. DESCONOCIMIENTO: Si preguntan algo que no sabes, sé honesto y amable: "No manejo esa información en este momento, pero nuestro asesor especializado te ayudará con gusto por WhatsApp: https://wa.me/584248948664". No inventes precios ni productos.
13. OBJETIVO EN INSTAGRAM: Si estás hablando por Instagram (${source}), tu misión es brindar atención inicial amable y redirigir al cliente a WhatsApp (https://wa.me/584248948664) para concretar y asegurar su compra.
14. DESPEDIDA: Siempre que te despidas o el cliente agradezca, cierra de forma elegante con: "Es lujo, es simple, es Practiiko 💎".

INVENTARIO (Usa solo lo necesario, los precios están ocultos si no está en Margarita):
${inventory.text}

HISTORIAL DE LA CONVERSACIÓN:
${history}

ORIGEN DEL MENSAJE: ${source}
MENSAJE ACTUAL DEL CLIENTE: ${message}

CIERRE:
Nunca olvides mantener la educación, la amabilidad y el enfoque en la satisfacción del cliente.
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

    const response = await buildResponse(message, customerName, inventory, location, history, source);

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
