"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function BotPauseToggle({ id, platform, initialStatus = true }) {
  const [isEnabled, setIsEnabled] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setIsEnabled(initialStatus);
  }, [initialStatus]);

  const toggleBot = async (e) => {
    e.preventDefault(); // Evitar navegación del Link padre
    e.stopPropagation();
    
    setIsLoading(true);
    const newStatus = !isEnabled;

    try {
      const res = await fetch('/api/settings/bot-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, platform, enabled: newStatus })
      });

      if (res.ok) {
        setIsEnabled(newStatus);
        addToast(
          newStatus ? "IA Reactivada para este cliente" : "IA Pausada. Ahora tienes el control manual.",
          newStatus ? "success" : "warning"
        );
      } else {
        throw new Error("Error al cambiar estado");
      }
    } catch (error) {
      addToast("Error al conectar con el servidor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBot}
      disabled={isLoading}
      title={isEnabled ? "Pausar respuestas automáticas" : "Reactivar respuestas automáticas"}
      style={{
        background: isEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        color: isEnabled ? '#22c55e' : '#ef4444',
        border: 'none',
        borderRadius: '10px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: 'inset 0 0 0 1px currentColor'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isEnabled ? (
        <Pause size={16} fill="currentColor" />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
    </button>
  );
}
