"use client";

import { useState, useEffect } from "react";
import { Zap, Save, Info, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { getAiInstructions, updateAiInstructions } from "./actions";
import { useToast } from "@/components/Toast";

export default function AiBrainPage() {
  const [instructions, setInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getAiInstructions();
      setInstructions(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateAiInstructions(instructions);
    if (result.success) {
      addToast("Cerebro IA actualizado correctamente 🧠✨", "success");
    } else {
      addToast("Error al guardar las instrucciones", "error");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="p-10 text-center">Cargando Cerebro IA...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          <Zap size={24} fill="currentColor" />
          <span style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.8rem', textTransform: 'uppercase' }}>Configuración Avanzada</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Cerebro IA</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Define las reglas maestras, el tono de voz y las políticas de venta que el bot debe seguir.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* EDITOR AREA */}
        <div className="card glass" style={{ padding: '2rem', borderRadius: '24px' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--primary)" /> Instrucciones Maestras
            </h2>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="btn-primary" 
              style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={18} />
              {isSaving ? "Guardando..." : "Guardar Reglas"}
            </button>
          </div>

          <textarea 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ej: Si el cliente es de Caracas, menciona que el envío es gratis. Nunca des descuentos de más del 10%..."
            style={{ 
              width: '100%', 
              minHeight: '450px', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              fontSize: '1rem', 
              lineHeight: '1.6',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* SIDEBAR TIPS */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} color="var(--primary)" /> Guía Rápida
            </h3>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'grid', gap: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>•</span>
                Usa lenguaje natural y claro.
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>•</span>
                Define el tono (ej: "Eres un asesor de lujo").
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>•</span>
                Pon reglas de envío por ciudad.
              </li>
              <li style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)' }}>•</span>
                Establece límites de negociación.
              </li>
            </ul>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065f46', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} /> Seguridad
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#065f46', margin: 0, lineHeight: '1.5' }}>
              Estas reglas son <strong>internas</strong>. El cliente nunca las verá directamente, pero el bot las usará para filtrar cada respuesta.
            </p>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#92400e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} /> Importante
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, lineHeight: '1.5' }}>
              Si una regla aquí contradice la base de datos de productos, la IA priorizará estas instrucciones manuales.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
