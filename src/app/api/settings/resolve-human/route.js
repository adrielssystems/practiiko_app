import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    await query("UPDATE whatsapp_customers SET requires_human = false, ai_enabled = true WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESOLVE HUMAN ERROR]:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
