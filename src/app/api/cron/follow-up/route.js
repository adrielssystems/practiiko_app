import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query } from "@/lib/db";

const FOLLOW_UP_MESSAGE = `¡Hola! Le escribo para ayudarle a elegir el mueble ideal para su espacio ⭐. Comprar en PRACTIIKO le da tres ventajas increibles: 📦 a) ¡Llegan donde estes! Vienen en caja con envio seguro a nivel nacional; 🧼 b) ¡Siempre como nuevos! Forros desmontables y lavables! ¡Y vendemos extras para cambiar de color!; 🌟 c) Tendencia mundial. diseño moderno, practico y de exito internacional. ¿Cual es la mas importante para usted hoy?. Estare leyendo su respuesta`;

export async function GET(req) {
  try {
    const results = { whatsapp: 0, instagram: 0, errors: [] };

    // --- 1. PROCESAR WHATSAPP ---
    const waQuery = `
      SELECT id, full_name 
      FROM whatsapp_customers 
      WHERE followup_status = 'pending' 
        AND followup_scheduled_at <= NOW() 
        AND ai_enabled = true
    `;
    const waRes = await query(waQuery);

    const EVO_URL = process.env.EVOLUTION_API_URL;
    const EVO_KEY = process.env.EVOLUTION_API_KEY;
    const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || "Practiiko";

    for (const customer of waRes.rows) {
      try {
        if (EVO_URL) {
          const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify({ number: customer.id, text: FOLLOW_UP_MESSAGE })
          });
          
          if (!response.ok) {
            throw new Error(`Evolution API error: ${response.status}`);
          }

          // Marcar como enviado y guardar el mensaje en la DB
          await query(`UPDATE whatsapp_customers SET followup_status = 'sent' WHERE id = $1`, [customer.id]);
          await query(`INSERT INTO whatsapp_messages (session_id, message) VALUES ($1, $2)`, 
            [customer.id, JSON.stringify({ role: 'assistant', content: FOLLOW_UP_MESSAGE })]);

          results.whatsapp++;
        }
      } catch (err) {
        console.error(`Error enviando followup a WA ${customer.id}:`, err.message);
        results.errors.push(`WA ${customer.id}: ${err.message}`);
      }
    }

    // --- 2. PROCESAR INSTAGRAM ---
    const igQuery = `
      SELECT id, username 
      FROM instagram_customers 
      WHERE followup_status = 'pending' 
        AND followup_scheduled_at <= NOW() 
        AND ai_enabled = true
    `;
    const igRes = await query(igQuery);
    
    const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();

    for (const customer of igRes.rows) {
      try {
        if (PAGE_ACCESS_TOKEN) {
          const url = `https://graph.instagram.com/v21.0/me/messages`;
          const response = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${PAGE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              recipient: { id: customer.id },
              message: { text: FOLLOW_UP_MESSAGE },
            }),
          });
          
          const data = await response.json();
          if (data.error) {
            throw new Error(`Graph API error: ${JSON.stringify(data.error)}`);
          }

          // Marcar como enviado y guardar el mensaje
          await query(`UPDATE instagram_customers SET followup_status = 'sent' WHERE id = $1`, [customer.id]);
          await query(`INSERT INTO instagram_messages (session_id, message, source) VALUES ($1, $2, 'dm')`, 
            [customer.id, JSON.stringify({ role: 'assistant', content: FOLLOW_UP_MESSAGE })]);

          results.instagram++;
        }
      } catch (err) {
        console.error(`Error enviando followup a IG ${customer.id}:`, err.message);
        results.errors.push(`IG ${customer.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error) {
    console.error("Cron Follow-Up Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
