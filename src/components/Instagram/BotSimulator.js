'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, RefreshCcw } from 'lucide-react';

export default function BotSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/test-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, testId: 'simulador-admin' }),
      });
      const data = await response.json();
      
      if (data.success) {
        const botText = typeof data.bot_response === 'string' 
          ? data.bot_response 
          : (data.bot_response?.text || '');
        const imageUrls = data.bot_response?.imageUrls || [];
        setMessages(prev => [...prev, { role: 'assistant', content: botText, imageUrls }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: No se pudo procesar la respuesta.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '2rem',
          background: 'var(--primary)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '50px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600,
          zIndex: 1000,
          transition: 'transform 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bot size={20} /> Probar Bot (Simulador)
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '1.5rem',
      right: '2rem',
      width: '400px',
      height: '550px',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1001,
      border: '1px solid var(--border)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1.25rem', 
        background: 'var(--primary)', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bot size={22} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Simulador Practiiko IA</h4>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Modo Pruebas (No gasta tokens IG)</span>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          padding: '1rem', 
          overflowY: 'auto', 
          background: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: '2rem', padding: '0 2rem' }}>
            <RefreshCcw size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>Escribe algo para ver cómo responde el bot según tu prompt actual.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '0.75rem 1rem',
            borderRadius: '15px',
            background: m.role === 'user' ? 'var(--primary)' : 'white',
            color: m.role === 'user' ? 'white' : 'black',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            fontSize: '0.9rem',
            border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div>{m.content}</div>
            {m.imageUrls && m.imageUrls.map((url, imgIdx) => (
              <img 
                key={imgIdx} 
                src={url} 
                alt="Product" 
                style={{ 
                  maxWidth: '100%', 
                  borderRadius: '10px', 
                  marginTop: '0.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }} 
              />
            ))}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', background: 'white', borderRadius: '15px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            El bot está pensando...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'white' }}>
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ej: ¿Qué sofás tienen?"
          style={{ 
            flex: 1, 
            padding: '0.75rem 1rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border)',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            width: '45px', 
            height: '45px', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
