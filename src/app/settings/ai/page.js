"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Zap,
  Save,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Power,
  Activity,
  Database,
  Flame,
  MessageSquare,
  RefreshCw,
  Send,
  PlusCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  Bot,
  PackageCheck,
} from "lucide-react";
import {
  getAgentDashboardData,
  toggleSuperAgentStatus,
  updateAiInstructions,
} from "./actions";
import { useToast } from "@/components/Toast";

const WA_SIMULATOR_SESSION_ID = "simulador-wa-admin";

const QUICK_TEST_PROMPTS = [
  "¿Cuánto cuesta el sofá Caterpillar?",
  "¿Qué medidas tiene el colchón Queen?",
  "¿Dónde están ubicados en Margarita?",
  "¿Aceptan Cashea?",
  "Lo quiero comprar, pásame los datos de pago",
];

function getActionBadgeStyle(actionTag, transferred, hallucinationBlocked) {
  if (hallucinationBlocked) {
    return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
  }
  if (transferred && actionTag?.includes("Compra")) {
    return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  }
  if (transferred) {
    return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
  }
  if (actionTag?.includes("Precio")) {
    return { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" };
  }
  if (actionTag?.includes("Tienda") || actionTag?.includes("Margarita")) {
    return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  }
  return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
}

export default function AgenteDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeTab, setActiveTab] = useState("monitor");
  const [inventorySearch, setInventorySearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  // Simulador WhatsApp
  const [simMessages, setSimMessages] = useState([]);
  const [simInput, setSimInput] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simResetting, setSimResetting] = useState(false);
  const simScrollRef = useRef(null);

  const { addToast } = useToast();

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await getAgentDashboardData();
      setDashboard(data);
      if (!instructionsDirty) {
        setInstructions(data.instructions || "");
      }
      setLastUpdated(
        new Date().toLocaleTimeString("es-VE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (e) {
      console.error("Error cargando panel Agente:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [instructionsDirty]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getAgentDashboardData();
        if (!active) return;
        setDashboard(data);
        setInstructions(data.instructions || "");
        setLastUpdated(
          new Date().toLocaleTimeString("es-VE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch (e) {
        console.error("Error cargando panel Agente:", e);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-refresco cada 10s en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    if (simScrollRef.current) {
      simScrollRef.current.scrollTop = simScrollRef.current.scrollHeight;
    }
  }, [simMessages]);

  const handleToggleAgent = async () => {
    if (!dashboard || isToggling) return;
    const nextState = !dashboard.superAgentEnabled;
    setIsToggling(true);
    const res = await toggleSuperAgentStatus(nextState);
    if (res.success) {
      setDashboard(prev => ({ ...prev, superAgentEnabled: nextState }));
      addToast(
        nextState
          ? "Super Agente Vendedor ENCENDIDO 🟢"
          : "Super Agente APAGADO — Modo Fijo Margarita activo ⚪",
        "success"
      );
    } else {
      addToast("No se pudo cambiar el estado del Agente", "error");
    }
    setIsToggling(false);
  };

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    const result = await updateAiInstructions(instructions);
    if (result.success) {
      setInstructionsDirty(false);
      addToast("Instrucciones del Agente actualizadas 🧠✨", "success");
    } else {
      addToast("Error al guardar las instrucciones", "error");
    }
    setIsSavingRules(false);
  };

  const sendSimulatorMessage = async (textToSend) => {
    const clean = (textToSend || "").trim();
    if (!clean || simLoading) return;

    setSimInput("");
    setSimMessages(prev => [...prev, { role: "user", content: clean }]);
    setSimLoading(true);

    try {
      const res = await fetch("/api/test-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "whatsapp",
          sessionId: WA_SIMULATOR_SESSION_ID,
          customerName: "Prueba Margarita",
          message: clean,
        }),
      });
      const data = await res.json();
      if (data.success && data.bot_response) {
        const bot = data.bot_response;
        if (bot.ignored) {
          setSimMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content:
                "⏸️ Este chat de prueba ya fue transferido a un asesor humano (ai_enabled = false). Haz clic en 'Reiniciar Prueba' para iniciar una conversación nueva.",
              actionTag: "⏸️ Chat en Asesor",
              transferred: true,
            },
          ]);
        } else {
          setSimMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: bot.text || "",
              imageUrls: bot.imageUrls || [],
              actionTag: bot.actionTag || "✅ Respuesta",
              transferred: Boolean(bot.transferred),
              transferReason: bot.transferReason || null,
              hallucinationBlocked: Boolean(bot.hallucinationBlocked),
              matchedProducts: bot.matchedProducts || [],
            },
          ]);
        }
      } else {
        setSimMessages(prev => [
          ...prev,
          { role: "assistant", content: "❌ Error procesando la prueba del agente." },
        ]);
      }
    } catch (e) {
      setSimMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Error de conexión con el servidor." },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleResetSimulator = async () => {
    if (simResetting) return;
    setSimResetting(true);
    try {
      await fetch("/api/whatsapp/delete-chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: WA_SIMULATOR_SESSION_ID }),
      });
      setSimMessages([]);
      setSimInput("");
      addToast("Conversación de prueba reiniciada", "success");
    } catch {
      addToast("No se pudo reiniciar la prueba", "error");
    } finally {
      setSimResetting(false);
    }
  };

  if (isLoading || !dashboard) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "#64748b", fontWeight: 600 }}>
        Cargando Panel de Monitorización del Agente...
      </div>
    );
  }

  const {
    superAgentEnabled,
    globalBotEnabled,
    inventoryStats,
    monthlyQuota,
    agentMetrics,
    recentActivity,
  } = dashboard;

  const quotaPct = Math.min(
    100,
    Math.round((monthlyQuota.monthMessagesSent / monthlyQuota.freeTierLimit) * 100)
  );
  const quotaColor =
    quotaPct >= 95 ? "#ef4444" : quotaPct >= 70 ? "#f59e0b" : "#10b981";

  const filteredProducts = (inventoryStats.productsSample || []).filter(p => {
    if (!inventorySearch.trim()) return true;
    const q = inventorySearch.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      (p.categoria || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      {/* ENCABEZADO PRINCIPAL + INTERRUPTOR MAESTRO ON/OFF */}
      <header
        style={{
          marginBottom: "1.75rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              color: "var(--primary)",
              marginBottom: "0.35rem",
            }}
          >
            <Zap size={20} fill="currentColor" />
            <span
              style={{
                fontWeight: 800,
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              Centro de Control y Monitorización IA
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "2.35rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
              Agente
            </h1>

            {/* BOTÓN INTERRUPTOR ON / OFF AL LADO DEL TÍTULO */}
            <button
              onClick={handleToggleAgent}
              disabled={isToggling}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.55rem 1.15rem",
                borderRadius: "999px",
                border: `2px solid ${superAgentEnabled ? "#10b981" : "#cbd5e1"}`,
                background: superAgentEnabled
                  ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                  : "#f8fafc",
                color: superAgentEnabled ? "#065f46" : "#475569",
                cursor: isToggling ? "not-allowed" : "pointer",
                boxShadow: superAgentEnabled
                  ? "0 4px 14px rgba(16, 185, 129, 0.2)"
                  : "0 2px 6px rgba(15, 23, 42, 0.06)",
                transition: "all 0.25s ease",
                opacity: isToggling ? 0.65 : 1,
              }}
              title={
                superAgentEnabled
                  ? "Apagar Super Agente (volver a Modo Fijo Margarita)"
                  : "Encender Super Agente Vendedor IA"
              }
            >
              <span
                style={{
                  width: "42px",
                  height: "24px",
                  borderRadius: "999px",
                  background: superAgentEnabled ? "#10b981" : "#94a3b8",
                  position: "relative",
                  display: "inline-block",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    position: "absolute",
                    top: "3px",
                    left: superAgentEnabled ? "21px" : "3px",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  }}
                />
              </span>
              <Power size={16} />
              <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                {superAgentEnabled
                  ? "SUPER AGENTE ACTIVO (ON)"
                  : "MODO FIJO MARGARITA (OFF)"}
              </span>
            </button>
          </div>

          <p style={{ margin: "0.5rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            {superAgentEnabled
              ? "El Super Agente Vendedor está respondiendo dudas frecuentes con datos reales de la BD y transfiere al detectar intención real de compra."
              : "El Super Agente está apagado: WhatsApp responde con el flujo fijo gratuito de bienvenida a la tienda de Margarita + regalo y luego pasa a asesor."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {lastUpdated && (
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>
              Actualizado: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.6rem 1rem",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? "spin" : ""} />
            Refrescar Monitor
          </button>
        </div>
      </header>

      {/* ALERTA SI BREAKER GLOBAL ESTÁ APAGADO */}
      {!globalBotEnabled && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            borderRadius: "16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          <AlertTriangle size={20} />
          <span>
            Atención: El interruptor global de WhatsApp (<code>global_bot_enabled</code>) está apagado. Ninguna respuesta automática saldrá hasta reactivarlo.
          </span>
        </div>
      )}

      {/* 4 TARJETAS KPI DE MONITORIZACIÓN */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.15rem",
          marginBottom: "1.75rem",
        }}
      >
        {/* KPI 1: Cuota Mensual Meta */}
        <div
          className="card glass"
          style={{
            padding: "1.25rem",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Cuota Mensual Gratis (24h)
            </span>
            <MessageSquare size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
            {monthlyQuota.monthMessagesSent}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#94a3b8" }}>
              / {monthlyQuota.freeTierLimit}
            </span>
          </div>
          <div
            style={{
              height: "7px",
              background: "#f1f5f9",
              borderRadius: "999px",
              overflow: "hidden",
              marginTop: "0.65rem",
            }}
          >
            <div
              style={{
                width: `${quotaPct}%`,
                height: "100%",
                background: quotaColor,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.45rem" }}>
            {quotaPct}% usado este mes ($0 en plantillas)
          </div>
        </div>

        {/* KPI 2: Inventario sincronizado */}
        <div
          className="card glass"
          style={{
            padding: "1.25rem",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Base de Datos Sincronizada
            </span>
            <Database size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
            {inventoryStats.activeProducts}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}>
              productos
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.4rem" }}>
            {inventoryStats.categoriesCount} categorías · {inventoryStats.withTechnicalSpecs} con ficha/medidas
          </div>
          <div
            style={{
              marginTop: "0.55rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#065f46",
              background: "#ecfdf5",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
            }}
          >
            <ShieldCheck size={13} /> Escudo Anti-Alucinación Activo
          </div>
        </div>

        {/* KPI 3: Intenciones reales de compra */}
        <div
          className="card glass"
          style={{
            padding: "1.25rem",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Intenciones de Compra
            </span>
            <Flame size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
            {agentMetrics.buyIntentTransfers}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ea580c" }}>
              listos p/ cerrar
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.4rem" }}>
            {agentMetrics.pendingHumanAdvisor} chats totales esperando asesor
          </div>
          <Link
            href="/whatsapp?alert=true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--primary)",
              textDecoration: "none",
            }}
          >
            Ver alertas de asesor <ExternalLink size={12} />
          </Link>
        </div>

        {/* KPI 4: Actividad Super Agente y Bloqueos */}
        <div
          className="card glass"
          style={{
            padding: "1.25rem",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Actividad Super Agente
            </span>
            <Activity size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
            {agentMetrics.superAgentReplies}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}>
              respuestas
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.4rem" }}>
            {agentMetrics.activeAgentChats} de {agentMetrics.totalCustomers} chats con bot activo
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginTop: "0.45rem" }}>
            🛡️ Alucinaciones bloqueadas: {agentMetrics.hallucinationsBlocked}
          </div>
        </div>
      </div>

      {/* PESTAÑAS DEL PANEL */}
      <div
        style={{
          display: "flex",
          gap: "0.65rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "0.85rem",
        }}
      >
        {[
          { id: "monitor", label: "📡 Monitor en Vivo", count: recentActivity.length },
          { id: "simulator", label: "🧪 Simulador de Pruebas" },
          { id: "inventory", label: "📦 Inventario Leído (BD)", count: inventoryStats.activeProducts },
          { id: "rules", label: "🧠 Instrucciones Maestras" },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.65rem 1.15rem",
                borderRadius: "12px",
                border: isActive ? "1.5px solid var(--primary)" : "1px solid #e2e8f0",
                background: isActive ? "rgba(4, 119, 191, 0.08)" : "#ffffff",
                color: isActive ? "var(--primary)" : "#475569",
                fontWeight: 800,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  style={{
                    background: isActive ? "var(--primary)" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#475569",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "999px",
                    fontSize: "0.72rem",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONITOR EN VIVO */}
      {activeTab === "monitor" && (
        <div
          className="card glass"
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                Últimas Decisiones y Respuestas en WhatsApp
              </h2>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Audita qué preguntó cada cliente, qué respondió el sistema y cuándo transfirió por intención real de compra.
              </p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
              No hay respuestas registradas todavía.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recentActivity.map(item => {
                const badgeLabel =
                  item.action_tag ||
                  (item.agent_version === "super_agent_v2"
                    ? "✅ Respuesta Super Agente"
                    : "📍 Respuesta Flujo Fijo");
                const badgeStyle = getActionBadgeStyle(
                  badgeLabel,
                  item.transferred,
                  item.hallucination_blocked
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "1.1rem 1.25rem",
                      borderRadius: "16px",
                      border: item.requires_human ? "1.5px solid #fed7aa" : "1px solid #e2e8f0",
                      background: item.requires_human ? "#fffcf9" : "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <strong style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                          {item.customer_name}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          +{item.session_id} · {item.timestamp_fmt}
                        </span>
                        <span
                          style={{
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.65rem",
                            borderRadius: "999px",
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {badgeLabel}
                        </span>
                        {item.requires_human && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              background: "#fef2f2",
                              color: "#b91c1c",
                            }}
                          >
                            🚨 Esperando Asesor
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/whatsapp/${item.session_id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          color: "#0f172a",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Abrir Chat <ExternalLink size={13} />
                      </Link>
                    </div>

                    {item.user_question && (
                      <div
                        style={{
                          fontSize: "0.84rem",
                          color: "#334155",
                          background: "#f8fafc",
                          padding: "0.55rem 0.85rem",
                          borderRadius: "10px",
                          borderLeft: "3px solid #94a3b8",
                        }}
                      >
                        <strong style={{ color: "#475569" }}>Cliente preguntó:</strong>{" "}
                        {item.user_question}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: "0.86rem",
                        color: "#0f172a",
                        background: "#f0f9ff",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "10px",
                        borderLeft: "3px solid var(--primary)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                      }}
                    >
                      <strong style={{ color: "var(--primary)" }}>Respuesta enviada:</strong>{" "}
                      {item.agent_reply}
                    </div>

                    {item.matched_products && item.matched_products.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
                          Productos BD consultados:
                        </span>
                        {item.matched_products.map((prod, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: "#f1f5f9",
                              color: "#1e293b",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "6px",
                            }}
                          >
                            {prod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SIMULADOR DEL SUPER AGENTE WHATSAPP */}
      {activeTab === "simulator" && (
        <div
          className="card glass"
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Bot size={20} color="var(--primary)" /> Simulador del Super Agente Vendedor (WhatsApp)
              </h2>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Prueba en vivo sin gastar mensajes de Meta ni afectar clientes reales. Consulta directo tu base de datos de producción.
              </p>
            </div>
            <button
              onClick={handleResetSimulator}
              disabled={simResetting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <PlusCircle size={15} />
              {simResetting ? "Reiniciando..." : "Reiniciar Prueba"}
            </button>
          </div>

          {/* Botones de prueba rápida */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            {QUICK_TEST_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendSimulatorMessage(q)}
                disabled={simLoading}
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  padding: "0.4rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  cursor: simLoading ? "not-allowed" : "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Área de chat */}
          <div
            ref={simScrollRef}
            style={{
              height: "380px",
              overflowY: "auto",
              background: "#f8fafc",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {simMessages.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: "5rem", color: "#94a3b8", fontSize: "0.9rem" }}>
                Escribe una pregunta o pulsa uno de los botones rápidos arriba para probar al Super Agente.
              </div>
            ) : (
              simMessages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "0.8rem 1rem",
                    borderRadius: "14px",
                    background: m.role === "user" ? "var(--primary)" : "#ffffff",
                    color: m.role === "user" ? "#ffffff" : "#0f172a",
                    border: m.role === "assistant" ? "1px solid #e2e8f0" : "none",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    whiteSpace: "pre-wrap",
                    fontSize: "0.88rem",
                    lineHeight: 1.45,
                  }}
                >
                  {m.role === "assistant" && m.actionTag && (
                    <div style={{ marginBottom: "0.45rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          background: m.transferred ? "#fff7ed" : "#ecfdf5",
                          color: m.transferred ? "#c2410c" : "#065f46",
                          border: `1px solid ${m.transferred ? "#fed7aa" : "#a7f3d0"}`,
                        }}
                      >
                        {m.actionTag}
                      </span>
                      {m.hallucinationBlocked && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            background: "#fef2f2",
                            color: "#991b1b",
                          }}
                        >
                          🛡️ Alucinación Bloqueada
                        </span>
                      )}
                    </div>
                  )}
                  <div>{m.content}</div>
                  {m.imageUrls &&
                    m.imageUrls.map((url, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={url}
                        alt="Producto"
                        style={{ maxWidth: "240px", borderRadius: "10px", marginTop: "0.5rem", display: "block" }}
                      />
                    ))}
                </div>
              ))
            )}
            {simLoading && (
              <div style={{ alignSelf: "flex-start", fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
                El Super Agente está consultando la base de datos...
              </div>
            )}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              sendSimulatorMessage(simInput);
            }}
            style={{ display: "flex", gap: "0.65rem" }}
          >
            <input
              type="text"
              value={simInput}
              onChange={e => setSimInput(e.target.value)}
              placeholder="Ej: ¿Qué precio tiene el sofá Caterpillar y cuánto mide?"
              style={{
                flex: 1,
                padding: "0.8rem 1rem",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={simLoading}
              className="btn-primary"
              style={{
                padding: "0 1.25rem",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                fontWeight: 700,
              }}
            >
              <Send size={16} /> Probar
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: VISOR DE INVENTARIO LEÍDO POR EL AGENTE */}
      {activeTab === "inventory" && (
        <div
          className="card glass"
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PackageCheck size={20} color="#0284c7" /> Catálogo Real Inyectado al Super Agente
              </h2>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Estos son exactamente los nombres, precios y fichas técnicas que el agente tiene autorizados. Todo dato fuera de esta tabla está bloqueado.
              </p>
            </div>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search
                size={15}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              />
              <input
                type="text"
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                placeholder="Buscar producto o categoría..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.9rem 0.55rem 2.2rem",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "0.7rem" }}>Producto</th>
                  <th style={{ padding: "0.7rem" }}>Categoría</th>
                  <th style={{ padding: "0.7rem" }}>Precio BCV</th>
                  <th style={{ padding: "0.7rem" }}>Stock</th>
                  <th style={{ padding: "0.7rem" }}>Ficha / Medidas en BD</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 0.7rem", fontWeight: 700, color: "#0f172a" }}>
                      {prod.name}
                      {prod.code && (
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>
                          Código: {prod.code}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.7rem", color: "#475569" }}>{prod.categoria}</td>
                    <td style={{ padding: "0.75rem 0.7rem", fontWeight: 800, color: "#065f46" }}>
                      ${prod.price_bcv}
                    </td>
                    <td style={{ padding: "0.75rem 0.7rem" }}>
                      {prod.is_coming_soon ? (
                        <span style={{ color: "#d97706", fontWeight: 700 }}>Preventa</span>
                      ) : (
                        <span>{prod.stock ?? "—"}</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.7rem", color: "#475569", maxWidth: "360px" }}>
                      {prod.technical_summary ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#0f172a" }}>
                          <CheckCircle2 size={14} color="#10b981" /> {prod.technical_summary.slice(0, 90)}
                          {prod.technical_summary.length > 90 ? "..." : ""}
                        </span>
                      ) : prod.has_features || prod.has_description ? (
                        <span style={{ color: "#0284c7", fontWeight: 600 }}>✓ Con descripción / atributos</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>⚠ Sin ficha técnica cargada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INSTRUCCIONES MAESTRAS */}
      {activeTab === "rules" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
          <div className="card glass" style={{ padding: "1.75rem", borderRadius: "20px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={19} color="var(--primary)" /> Instrucciones Maestras del Agente
              </h2>
              <button
                onClick={handleSaveRules}
                disabled={isSavingRules}
                className="btn-primary"
                style={{ padding: "0.6rem 1.35rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Save size={17} />
                {isSavingRules ? "Guardando..." : "Guardar Reglas"}
              </button>
            </div>

            <textarea
              value={instructions}
              onChange={e => {
                setInstructions(e.target.value);
                setInstructionsDirty(true);
              }}
              placeholder="Ej: Promociones vigentes, condiciones de Cashea, mensajes clave para Margarita..."
              style={{
                width: "100%",
                minHeight: "380px",
                padding: "1.25rem",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ padding: "1.35rem", background: "rgba(16, 185, 129, 0.06)", borderRadius: "18px", border: "1px solid rgba(16, 185, 129, 0.18)" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#065f46", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={18} /> Seguridad Anti-Alucinación
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#065f46", margin: 0, lineHeight: "1.5" }}>
                Estas reglas son <strong>internas</strong>. El Super Agente valida cada precio en <code>$</code> contra PostgreSQL antes de responder al cliente.
              </p>
            </div>

            <div style={{ padding: "1.35rem", background: "rgba(245, 158, 11, 0.06)", borderRadius: "18px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#92400e", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={18} /> Importante
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#92400e", margin: 0, lineHeight: "1.5" }}>
                Si agregas un precio especial o promoción aquí, inclúyelo con su símbolo <code>$</code> exacto para que el escudo anti-alucinación también lo autorice.
              </p>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
