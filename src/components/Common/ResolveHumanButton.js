"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

export default function ResolveHumanButton({ id }) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const handleResolve = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/resolve-human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        addToast("Marcado como atendido 💎", "success");
        router.refresh();
      } else {
        throw new Error("Error en respuesta");
      }
    } catch (e) {
      addToast("Error al resolver la solicitud", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleResolve}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '0.8rem',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        transition: 'all 0.2s ease',
        opacity: isLoading ? 0.7 : 1
      }}
      onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = 'scale(1.05)' }}
      onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.transform = 'scale(1)' }}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
      Marcar como Atendido
    </button>
  );
}
