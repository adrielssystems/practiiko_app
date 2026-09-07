"use client";
import { useState } from "react";
import { Power, PowerOff } from "lucide-react";

export default function GlobalBotBreaker({ initialEnabled }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const toggleBot = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/global-pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled })
      });
      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleBot}
      disabled={loading}
      style={{
        background: enabled ? '#ecfdf5' : '#fef2f2',
        color: enabled ? '#065f46' : '#991b1b',
        border: `1px solid ${enabled ? '#a7f3d0' : '#fecaca'}`,
        padding: '0.4rem 0.75rem',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
        opacity: loading ? 0.6 : 1
      }}
      title={enabled ? "Pausar bot globalmente" : "Activar bot globalmente"}
    >
      <span style={{
        display: 'inline-block',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: enabled ? '#10b981' : '#ef4444',
        boxShadow: `0 0 6px ${enabled ? '#10b981' : '#ef4444'}`
      }}></span>
      {enabled ? <Power size={13} /> : <PowerOff size={13} />}
      <span>{enabled ? 'IA Activa' : 'IA Apagada'}</span>
    </button>
  );
}
