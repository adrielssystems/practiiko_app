'use client';

import { Trash2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function DeleteChatButton({ sessionId, platform = 'instagram' }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleInitialClick = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    setShowConfirm(true);
  };

  const cancelDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const executeDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
    setIsDeleting(true);

    try {
      const endpoint = platform === 'whatsapp' ? "/api/whatsapp/delete-chat" : "/api/instagram/delete-chat";
      
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (res.ok) {
        addToast("Conversación eliminada con éxito", "success");
        router.refresh();
      } else {
        const data = await res.json();
        addToast(`Error: ${data.error || 'No se pudo borrar'}`, "error");
      }
    } catch (error) {
      addToast("Error de conexión", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleInitialClick}
        disabled={isDeleting}
        title="Borrar conversación"
        style={{ 
          background: 'none', 
          border: 'none', 
          color: isDeleting ? '#ccc' : '#ff4d4d', 
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          padding: '0.5rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          pointerEvents: 'auto'
        }}
        onMouseOver={e => !isDeleting && (e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)')}
        onMouseOut={e => e.currentTarget.style.background = 'none'}
      >
        <Trash2 size={18} />
      </button>

      {showConfirm && mounted && createPortal(
        <div 
          onClick={cancelDelete}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '24px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ background: '#fff1f0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ff4d4d' }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#1a1a1a', fontWeight: 800 }}>¿Borrar conversación?</h3>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', lineHeight: '1.5' }}>
              Estás a punto de eliminar permanentemente el historial con <strong>{sessionId}</strong>. Esta acción no se puede deshacer.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={cancelDelete}
                style={{
                  padding: '0.8rem',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#f5f5f5',
                  color: '#1a1a1a',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e5e5e5'}
                onMouseOut={e => e.currentTarget.style.background = '#f5f5f5'}
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                style={{
                  padding: '0.8rem',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#ff4d4d',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#ff3333'}
                onMouseOut={e => e.currentTarget.style.background = '#ff4d4d'}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
