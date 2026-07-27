'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ManualReplyInput({ id, platform }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const endpoint = platform === 'whatsapp' ? '/api/whatsapp/send' : '/api/instagram/send';
      const body = platform === 'whatsapp' ? { to: id, text } : { recipientId: id, text };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.success) {
        setText('');
        // Forzamos un refresco leve o simplemente esperamos al AutoRefresh
        // window.location.reload(); 
      } else {
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : (data.error?.message || data.error?.error?.message || data.metaError?.error?.message || 'Error rechazado por la API de Instagram/Meta');
        alert('Error al enviar mensaje: ' + errorMsg);
      }
    } catch (error) {
      console.error("Error manual send:", error);
      alert('Error de conexión al enviar.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} style={{ 
      display: 'flex', 
      gap: '0.75rem', 
      padding: '1.25rem', 
      background: 'white', 
      borderTop: '1px solid #f0f0f0',
      marginTop: 'auto',
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px'
    }}>
      <input 
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={sending ? "Enviando..." : "Escribe una respuesta manual..."}
        disabled={sending}
        style={{ 
          flex: 1, 
          padding: '0.8rem 1.2rem', 
          borderRadius: '12px', 
          border: '1px solid #e0e0e0',
          outline: 'none',
          fontSize: '0.95rem',
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => e.target.style.borderColor = platform === 'whatsapp' ? '#25D366' : '#F28705'}
        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
      />
      <button 
        type="submit"
        disabled={!text.trim() || sending}
        style={{ 
          background: platform === 'whatsapp' ? '#25D366' : '#F28705',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: (sending || !text.trim()) ? 'not-allowed' : 'pointer',
          opacity: (sending || !text.trim()) ? 0.6 : 1,
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
      </button>
    </form>
  );
}
