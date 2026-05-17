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

  // Solicitud Humana (PRIORITARIA — evaluar antes que cortesía)
  if (m.includes("asesor") || m.includes("humano") || m.includes("persona") || m.includes("atenderme") || m.includes("hablar con alguien")) return "HUMAN_REQUEST";

  // Intención de Compra y Pagos Especiales (PRIORITARIA)
  if (m.includes("comprar") || m.includes("pagar") || m.includes("transferencia") || m.includes("pago") || m.includes("deposito") || m.includes("cuenta") || m.includes("quiero el") || m.includes("llevar el") || m.includes("zelle") || m.includes("paypal") || m.includes("cripto") || m.includes("usdt") || m.includes("bitcoin") || m.includes("metodos de pago")) return "BUY_REQUEST";

  // Cortesía simple (evaluar DESPUÉS de compra/humano para no cortocircuitar)
  if (["gracias", "ok", "dale", "perfecto", "entendido"].some(w => m.includes(w))) return "OTHER";

  if (m.includes("margarita") || m.includes("porlamar") || m.includes("pampatar")) return "LOCATION_UPDATE";
  if (m.includes("precio") || m.includes("cuanto")) return "PRICE_INFO";
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

  const stopWords = ["hola", "precio", "cuanto", "cuesta", "vale", "quiero", "saber", "tienen", "buenas", "tardes", "dias", "noches", "favor", "gracias", "para", "como", "esta", "donde", "tiene", "busco", "necesito", "algun"];
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
          imageUrl: p.image_url,
          variants: []
        };
      }
      groups[key].variants.push(p);
    });

    const productsText = Object.values(groups).map(g => {
      const colors = g.variants
        .map(v => {
          const match = v.name.match(/COLOR\s+([A-ZÁÉÍÓÚÑ\s]+)/i) || v.description?.match(/COLOR\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
          return match ? match[1].trim() : null;
        })
        .filter((v, i, a) => v && a.indexOf(v) === i); // Únicos

      let priceInfo = "";
      const first = g.variants[0];
      if (location === "MARGARITA") {
        priceInfo = `- Precio BCV: $${first.price_bcv}\n- Precio Especial: $${first.price_cash}`;
      } else {
        priceInfo = `- Precios: Ocultos (Redirigir a WhatsApp)`;
      }

      return `💎 MODELO: ${g.name}
- Categoría: ${g.categoria}
- Colores Disponibles: ${colors.length > 0 ? colors.join(", ") : "Consultar"}
- Descripción: ${g.description || "N/A"}
- URL Imagen: ${g.imageUrl || "No disponible"}
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
async function buildResponse(message, customerName, inventory, location, historyMessages, source, dynamicKnowledge = "", isFallback = false) {
  const isMargarita = location === "MARGARITA";

  const prompt = `
IDENTIDAD: Asesor de Ventas de Lujo de Practiiko. Nuestro sitio web oficial es https://www.practiiko.com. Eres muy amable, servicial y sumamente educado. No eres un robot automático, eres un asistente premium.

REGLAS DE ATENCIÓN AL CLIENTE:
1. AMABILIDAD Y SALUDO: SIEMPRE saluda al cliente de manera cordial al iniciar la conversación, usando su nombre si lo sabes (Ej: "¡Hola ${customerName}! Qué gusto saludarte."). Sé empático y amable.
2. BREVEDAD Y ESTILO: Mantén tus respuestas claras, concisas y elegantes. 
   - REGLA DE ORO: Si el cliente pregunta de forma general (ej: "¿Qué sofás tienen?"), NO listes cada producto de forma individual. Agrupa los modelos por nombre (ej: "Tenemos los modelos Caterpillar, Tofu y Merey...") y menciona los colores disponibles de forma fluida.
   - Evita listas verticales numeradas de más de 5 ítems. Prefiere párrafos cortos y descriptivos.
   - NUNCA menciones códigos técnicos (SKU) al cliente, a menos que él lo pida específicamente.
3. UBICACIÓN Y PRECIOS (CRÍTICO):
   - SI EL CLIENTE ESTÁ EN MARGARITA (NUEVA ESPARTA): El envío es GRATIS. Puedes darle los precios de los productos. **OBLIGATORIO: Debes mostrar SIEMPRE primero el 'Precio BCV'. Luego, como una opción secundaria, muestra el 'Precio ESPECIAL (Divisas/Zelle)'. Nunca los inviertas ni omitas el Precio BCV.**
   - SI EL CLIENTE NO ESTÁ EN MARGARITA (NACIONAL O INTERNACIONAL): **PROHIBIDO** dar precios. Debes aclarar amablemente que Practiiko NO realiza envíos internacionales. Para coordinar compras con envíos nacionales o resolver dudas, debe comunicarse directamente con nuestro asesor de ventas principal.
   - SI NO SABES LA CIUDAD Y PIDE PRECIO: Antes de dar cualquier precio o disponibilidad, pregunta amablemente desde qué ciudad nos escribe.
4. CIUDAD ACTUAL: (Ubicación detectada: ${location}). NO le preguntes su ciudad si ya dice MARGARITA u OUTSIDE.
5. REGLA DE ORO SOBRE INVENTARIO (ANTI-ALUCINACIÓN):
   - **SOLO puedes ofrecer, mencionar o describir los productos que están explícitamente listados en la sección INVENTARIO al final de este mensaje.**
   - **ESTÁ ESTRICTAMENTE PROHIBIDO inventar nombres de productos, colores, medidas o modelos (por ejemplo, no ofrezcas "Tumbonas" si no están en la lista de INVENTARIO). Cíñete 100% a la lista proporcionada.**
6. PERSUASIÓN Y VENTA: 
   - Si el cliente busca un color/modelo específico y no lo ves en el inventario, dile: "Disculpe, de ese color exacto no tenemos en este momento, pero lo tenemos disponible en [Menciona los colores del INVENTARIO]".
   - Si insiste en lo agotado, PERSUÁDELO elegantemente hacia lo que sí hay.
7. FOTOS OBLIGATORIAS: Si el cliente pide explícitamente "fotos", "imágenes" o "ver el modelo", ES OBLIGATORIO que incluyas la etiqueta de imagen debajo de CADA variante que le ofrezcas. DEBES escribir la etiqueta exacta [IMG: url_de_la_imagen] (usando la URL exacta que sale en el INVENTARIO para ese producto, sin importar si empieza por /api/ o https://).
   - EJEMPLO OBLIGATORIO DE RESPUESTA:
     *Sofá Merey Blanco:*
     [IMG: /api/media/uuid-123.webp]
     *Sofá Merey Crema:*
     [IMG: /api/media/uuid-456.webp]
   - REGLA CRÍTICA: ¡NUNCA dejes la foto en blanco! Si en el inventario dice "URL Imagen: /api/media/...", TIENES que colocar [IMG: /api/media/...]. No inventes URLs. Si solo preguntan precios, NO envíes fotos.
8. MÉTODOS DE PAGO Y COMPRA:
   - Aceptamos Cashea (sobre Precio BCV). Inicial desde 20% y hasta 12 cuotas.
   - SI EL CLIENTE PREGUNTA POR ZELLE, PAYPAL O CRIPTOMONEDAS: Debes informarle amablemente que esos métodos de pago son gestionados exclusivamente por nuestro asesor de ventas para su seguridad.
   - SI EL CLIENTE MUESTRA UNA INTENCIÓN REAL DE COMPRA (ej: "lo quiero", "quiero comprar", "dame los datos para pagar"): Debes indicarle que un asesor humano tomará el control de la conversación en un momento para finalizar el proceso.
   - **¡IMPORTANTE!** NO prometas la intervención de un asesor humano si el cliente solo responde con palabras de cortesía o afirmación simple (ej: "Ok", "Perfecto", "Gracias", "Entendido"). Para estas respuestas, sigue la regla 15.
9. HORARIOS Y TIENDA: Local A-14, CC Terranova Plaza, Porlamar, Isla de Margarita. Lun-Vie: 8:30 AM-4:30 PM. Sáb: 9:00 AM-1:00 PM.
10. CAMPAÑAS: Si el cliente escribe solo una palabra (ej: "mama", "promocion"), asume que viene de una publicidad y entrégale el catálogo.
11. PRECISIÓN TÉCNICA Y TAMAÑOS: Aclara si es Individual, Matrimonial, Sofá Cama, etc., basándote ÚNICAMENTE en la descripción del INVENTARIO.
12. DESCONOCIMIENTO: Si preguntan algo que no sabes, no inventes. Dile que consultarás con un asesor humano.
13. OBJETIVO SEGÚN EL CANAL (${source}): 
    - INSTAGRAM: Brindar atención inicial y redirigir a WhatsApp (https://wa.me/584248948664).
    - WHATSAPP: Asesorar a fondo y facilitar la venta. **IMPORTANTE: Si estás en WhatsApp, NUNCA pidas al cliente que escriba a otro número ni envíes el enlace de wa.me. Dile que un asesor humano le atenderá por este mismo chat en breve.** Tampoco sugieras realizar llamadas telefónicas, la atención es por chat.
14. DESPEDIDA: Cierra siempre de forma elegante con: "Es lujo, es simple, es Practiiko 💎".
15. MANEJO DE AFIRMACIONES SIMPLES: Si el cliente responde con "Ok", "Perfecto", "Bien" o "Gracias" después de recibir precios, NO asumas que la venta está cerrada. Mantén la conversación abierta preguntando: "¿Te gustaría que tomemos tu pedido de alguno de estos modelos?" o "¿Tienes alguna otra duda sobre el envío?". NUNCA digas que un humano intervendrá a menos que el cliente pida explícitamente comprar o hablar con uno.
${dynamicKnowledge ? `16. REGLAS DINÁMICAS Y PROMOCIONES VIGENTES:\n${dynamicKnowledge}` : ""}

INVENTARIO (Usa solo lo necesario, los precios están ocultos si no está en Margarita):
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
      new HumanMessage(message)
    ];

    const response = await model.invoke(finalMessages);
    return response.content;
  } catch (error) {
    console.error("DEBUG - DeepSeek Error:", error.message);
    // Fallback manual si falla la API (Muy importante para no dejar al cliente mudo)
    const locationText = isMargarita ? "\n🚚 Envío gratis en Margarita." : "\n📦 Para envíos nacionales, contáctanos directamente."
    const list = inventory.text || "Visita nuestro catálogo para ver modelos y precios.";
    return `¡Hola ${customerName}! 👋 (Mód. Estático) 💎\n\n${list}\n${locationText}\n\n📸 Ver más: https://www.practiiko.com/catalogo`;
  }
}

/**
 * MAIN
 */
export async function processChatMessage(message, sessionId, source = 'dm', commentId = null, customerName = 'Cliente', baseUrl = '') {
  // Declarada una sola vez en el scope principal (#3)
  const table = source === 'whatsapp' ? 'whatsapp_messages' : 'instagram_messages';

  try {
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
      let response = "Entendido 💎. En este momento estoy notificando a nuestro equipo. Un asesor humano revisará nuestra conversación y te responderá por aquí a la brevedad posible.";
      if (currentIntent === "BUY_REQUEST") {
        response = "¡Excelente elección! 💎 Estoy notificando a un asesor para que te ayude a concretar tu compra de inmediato. Un momento, por favor.";
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
      }
    } catch (e) {
      console.warn("No se pudo cargar ai_custom_instructions de la BD:", e.message);
    }

    // Si no hay inventario y no es un saludo, damos respuesta de fallback
    if (!inventory.found && intent !== "GREETING" && intent !== "OTHER") {
      const noProdMsg = `No encontré ese modelo exacto 💎`;
      if (source === 'whatsapp') {
        await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, [sessionId, JSON.stringify({ role: 'assistant', content: noProdMsg })]);
      } else {
        await query(`INSERT INTO instagram_messages (session_id, message, source, comment_id) VALUES ($1, $2, $3, $4)`, [sessionId, JSON.stringify({ role: 'assistant', content: noProdMsg }), source, commentId]);
      }
      return { text: noProdMsg, imageUrls: [] };
    }

    // Pasar isFallback para que DeepSeek sepa si los resultados son exactos o alternativos (#6)
    const rawResponse = await buildResponse(message, customerName, inventory, location, historyMessages, source, dynamicKnowledge, inventory.isFallback);

    console.log(`[DEBUG LLM RAW]\n${rawResponse}\n[DEBUG LLM RAW END]`);

    // Extraer URLs de imágenes si existen etiquetas [IMG: url]
    let imageUrls = [];
    let cleanResponse = rawResponse;
    const imgMatches = [...rawResponse.matchAll(/\[IMG:\s*([^\]]+?)\]/gi)];
    if (imgMatches.length > 0) {
      imageUrls = imgMatches.map(m => {
        let url = m[1].trim();
        if (url.startsWith('/') && baseUrl) {
          url = `${baseUrl}${url}`;
        }
        return url;
      });
      // Remover todas las etiquetas de la respuesta
      cleanResponse = rawResponse.replace(/\[IMG:\s*[^\]]+\]/gi, "").trim();
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
