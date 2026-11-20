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

export async function getSuperAgentStatus() {
  try {
    const res = await query("SELECT value FROM app_settings WHERE key = 'whatsapp_super_agent_enabled'");
    return res.rows[0]?.value === "true";
  } catch (error) {
    console.error("Error fetching super agent status:", error);
    return false;
  }
}

export async function toggleSuperAgentStatus(enabled) {
  try {
    const val = enabled ? "true" : "false";
    await query(
      "INSERT INTO app_settings (key, value) VALUES ('whatsapp_super_agent_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [val]
    );
    revalidatePath("/settings/ai");
    return { success: true, enabled: Boolean(enabled) };
  } catch (error) {
    console.error("Error toggling super agent status:", error);
    return { success: false, error: error.message };
  }
}

export async function getAgentDashboardData() {
  try {
    const [
      settingsRes,
      productsRes,
      quotaRes,
      customersRes,
      agentStatsRes,
      recentRes,
    ] = await Promise.all([
      query(
        `SELECT key, value FROM app_settings WHERE key IN ('whatsapp_super_agent_enabled', 'global_bot_enabled', 'ai_custom_instructions')`
      ),
      query(
        `SELECT p.*, c.name AS categoria
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.status = 'active'
         ORDER BY c.name ASC NULLS LAST, p.id ASC`
      ),
      query(
        `SELECT COUNT(*)::int AS sent_count
         FROM whatsapp_messages
         WHERE session_id NOT LIKE 'simulador-%'
           AND (message::jsonb)->>'role' = 'assistant'
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
      ),
      query(
        `SELECT
           COUNT(*)::int AS total_customers,
           COUNT(*) FILTER (WHERE ai_enabled = true)::int AS active_agent_chats,
           COUNT(*) FILTER (WHERE requires_human = true)::int AS pending_human_advisor
         FROM whatsapp_customers
         WHERE id NOT LIKE 'simulador-%'`
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE (message::jsonb)->>'agent' = 'super_agent_v2')::int AS super_agent_replies,
           COUNT(*) FILTER (WHERE (message::jsonb)->>'transferReason' = 'BUY_INTENT')::int AS buy_intent_transfers,
           COUNT(*) FILTER (WHERE (message::jsonb)->>'hallucinationBlocked' = 'true')::int AS hallucinations_blocked
         FROM whatsapp_messages
         WHERE session_id NOT LIKE 'simulador-%'`
      ),
      query(
        `WITH ordered AS (
           SELECT
             wm.id,
             wm.session_id,
             wm.created_at,
             wm.message::jsonb AS msg_json,
             LAG(wm.message::jsonb) OVER (PARTITION BY wm.session_id ORDER BY wm.created_at ASC, wm.id ASC) AS prev_msg_json
           FROM whatsapp_messages wm
           WHERE wm.session_id NOT LIKE 'simulador-%'
         )
         SELECT
           o.id,
           o.session_id,
           COALESCE(NULLIF(wc.full_name, ''), '+' || o.session_id) AS customer_name,
           COALESCE(wc.requires_human, false) AS requires_human,
           COALESCE(wc.ai_enabled, true) AS ai_enabled,
           to_char(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas', 'DD/MM HH12:MI AM') AS timestamp_fmt,
           o.msg_json->>'content' AS agent_reply,
           o.msg_json->>'agent' AS agent_version,
           o.msg_json->>'intent' AS intent,
           o.msg_json->>'actionTag' AS action_tag,
           o.msg_json->'matchedProducts' AS matched_products,
           COALESCE((o.msg_json->>'transferred')::boolean, false) AS transferred,
           o.msg_json->>'transferReason' AS transfer_reason,
           COALESCE((o.msg_json->>'hallucinationBlocked')::boolean, false) AS hallucination_blocked,
           CASE WHEN o.prev_msg_json->>'role' = 'user' THEN o.prev_msg_json->>'content' ELSE NULL END AS user_question
         FROM ordered o
         LEFT JOIN whatsapp_customers wc ON wc.id = o.session_id
         WHERE o.msg_json->>'role' = 'assistant'
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT 20`
      ),
    ]);

    const settingsMap = {};
    for (const row of settingsRes.rows) {
      settingsMap[row.key] = row.value;
    }

    const activeProductsRows = productsRes.rows;
    const categorySet = new Set(activeProductsRows.map(p => p.categoria || "General"));
    const withTechnicalSpecs = activeProductsRows.filter(
      p => Boolean(p.technical_summary) || Boolean(p.technical_features) || Boolean(p.description)
    ).length;

    const productsSample = activeProductsRows.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || "",
      categoria: p.categoria || "General",
      price_bcv: p.price_bcv,
      stock: p.stock ?? null,
      is_coming_soon: Boolean(p.is_coming_soon),
      technical_summary: p.technical_summary || "",
      has_features: Boolean(p.technical_features),
      has_description: Boolean(p.description),
    }));

    const custRow = customersRes.rows[0] || {};
    const statRow = agentStatsRes.rows[0] || {};

    return {
      success: true,
      superAgentEnabled: settingsMap.whatsapp_super_agent_enabled === "true",
      globalBotEnabled: settingsMap.global_bot_enabled !== "false",
      instructions: settingsMap.ai_custom_instructions || "",
      inventoryStats: {
        activeProducts: activeProductsRows.length,
        categoriesCount: categorySet.size,
        withTechnicalSpecs,
        productsSample,
      },
      monthlyQuota: {
        monthMessagesSent: quotaRes.rows[0]?.sent_count || 0,
        freeTierLimit: 1000,
      },
      agentMetrics: {
        totalCustomers: custRow.total_customers || 0,
        activeAgentChats: custRow.active_agent_chats || 0,
        pendingHumanAdvisor: custRow.pending_human_advisor || 0,
        superAgentReplies: statRow.super_agent_replies || 0,
        buyIntentTransfers: statRow.buy_intent_transfers || 0,
        hallucinationsBlocked: statRow.hallucinations_blocked || 0,
      },
      recentActivity: recentRes.rows.map(r => ({
        ...r,
        matched_products: Array.isArray(r.matched_products) ? r.matched_products : [],
      })),
    };
  } catch (error) {
    console.error("Error fetching agent dashboard data:", error);
    return {
      success: false,
      error: error.message,
      superAgentEnabled: false,
      globalBotEnabled: true,
      instructions: "",
      inventoryStats: { activeProducts: 0, categoriesCount: 0, withTechnicalSpecs: 0, productsSample: [] },
      monthlyQuota: { monthMessagesSent: 0, freeTierLimit: 1000 },
      agentMetrics: {
        totalCustomers: 0,
        activeAgentChats: 0,
        pendingHumanAdvisor: 0,
        superAgentReplies: 0,
        buyIntentTransfers: 0,
        hallucinationsBlocked: 0,
      },
      recentActivity: [],
    };
  }
}
