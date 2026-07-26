import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { id, platform, enabled } = await req.json();
    
    if (platform === 'whatsapp') {
      await query(
        "UPDATE whatsapp_customers SET ai_enabled = $1 WHERE id = $2",
        [enabled, id]
      );
    } else {
      await query(
        "UPDATE instagram_customers SET ai_enabled = $1 WHERE id = $2 OR username = $2",
        [enabled, id]
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bot Pause API Error:", error);
    return NextResponse.json({ error: "Error al cambiar estado del bot" }, { status: 500 });
  }
}
