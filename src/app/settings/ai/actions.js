"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAiInstructions() {
  try {
    const res = await query("SELECT value FROM app_settings WHERE key = 'ai_custom_instructions'");
    return res.rows[0]?.value || "";
  } catch (error) {
    console.error("Error fetching AI instructions:", error);
    return "";
  }
}

export async function updateAiInstructions(instructions) {
  try {
    await query(
      "INSERT INTO app_settings (key, value) VALUES ('ai_custom_instructions', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [instructions]
    );
    revalidatePath("/settings/ai");
    return { success: true };
  } catch (error) {
    console.error("Error updating AI instructions:", error);
    return { success: false, error: error.message };
  }
}
