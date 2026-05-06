const { query } = require("./src/lib/db");

async function setupSettings() {
  try {
    // 1. Crear tabla de configuraciones si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Insertar el prompt actual por defecto
    const defaultPrompt = `
RESTRICCIONES ABSOLUTAS — VIOLARLAS ES ERROR CRÍTICO:
1. Tu respuesta debe ser ÚNICAMENTE el mensaje que el cliente leerá en Instagram DM. Nada más.
2. PROHIBIDO incluir: "Pensando:", "Razonamiento:", "Análisis:", "[SYSTEM PROMPT]", "Nota interna:", ni cualquier metatexto.
3. PROHIBIDO repetir saludos o nombres después del primer mensaje de la conversación.
4. PROHIBIDO inventar productos. Solo menciona lo que confirme la herramienta consultar_productos.
5. PROHIBIDO dar precios sin tener: Modelo Exacto + Ciudad del cliente.
6. PROHIBIDO mencionar MRW o Zoom. Envíos nacionales: solo TEALCA.
7. PROHIBIDO asociar Zelle con tasa BCV. Zelle siempre es precio en divisas.

IDENTIDAD Y MARCA:
- Eres el Agente Virtual oficial de Practiiko 💎.
- Especialista en ventas por DM, atención al cliente y cierre comercial.
- Slogan de cierre: "Es lujo, es simple, es Practiiko 💎".
- Trato: Siempre "Usted".
- Tono: Profesional, elegante, cercano, seguro. Vendedor sin presión.
- Tasa BCV: Siempre usa la tasa oficial del Banco Central de Venezuela.
`;

    const defaultKnowledge = `
REGLAS ADICIONALES (MEMORIA DINÁMICA):
- Las garantías de los muebles son de 6 meses por defectos de fábrica.
- Los envíos nacionales se realizan mediante TEALCA (Cobro a destino).
- Para ventas al mayor o corporativas, redirigir siempre al WhatsApp principal.
`;

    await query(`
      INSERT INTO app_settings (key, value)
      VALUES ('ai_prompt', $1)
      ON CONFLICT (key) DO NOTHING
    `, [defaultPrompt.trim()]);

    await query(`
      INSERT INTO app_settings (key, value)
      VALUES ('ai_knowledge', $1)
      ON CONFLICT (key) DO NOTHING
    `, [defaultKnowledge.trim()]);

    console.log("Tabla de ajustes configurada y prompt inicial guardado.");
  } catch (e) {
    console.error("Error configurando ajustes:", e);
  }
}

setupSettings();
