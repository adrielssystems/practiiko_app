import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft, User, Bot, Clock } from "lucide-react";
import AutoRefresh from "@/components/Common/AutoRefresh";
import BotPauseToggle from "@/components/Common/BotPauseToggle";
import ManualReplyInput from "@/components/Common/ManualReplyInput";

function renderMessageWithLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#0477BF',
            textDecoration: 'underline',
            fontWeight: 700,
            wordBreak: 'break-all'
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

async function getChatHistory(sessionId) {
  try {
    const res = await query(`
      SELECT *, to_char(created_at AT TIME ZONE 'America/Caracas', 'HH12:MI AM') as time_fmt 
      FROM instagram_messages 
      WHERE session_id = $1 
      ORDER BY created_at ASC
    `, [sessionId]);
    
    return res.rows.map(row => ({
      id: row.id,
      timestamp: row.created_at,
      ...row.message
    }));
  } catch (e) {
    console.error("Error fetching history:", e);
    return [];
  }
}

export default async function InstagramDetailPage({ params }) {
  const { id } = await params;
  
  // Obtener datos del cliente
  const customerRes = await query("SELECT full_name, ai_enabled FROM instagram_customers WHERE id = $1", [id]);
  const customer = customerRes.rows[0];
  const customerName = customer?.full_name || id;

  const history = await getChatHistory(id);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AutoRefresh interval={5000} />
      <header style={{ marginBottom: '2rem' }}>
        <Link href="/instagram" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          Volver al monitoreo
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Chat: {customerName}</h1>
          <BotPauseToggle id={id} platform="instagram" initialStatus={customer?.ai_enabled ?? true} />
        </div>
      </header>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '2rem', 
        background: 'white', 
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>No hay mensajes en esta conversación.</p>
        ) : (
          history.map((msg, index) => {
            const isBot = msg.role === 'assistant' || msg.role === 'ai';
            return (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: isBot ? 'flex-start' : 'flex-end',
                width: '100%'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.25rem',
                  flexDirection: isBot ? 'row' : 'row-reverse'
                }}>
                  {isBot ? <Bot size={14} color="#F28705" /> : <User size={14} color="#0477BF" />}
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>
                    {isBot ? (msg.manual ? 'MANUAL (TÚ)' : 'AGENTE VIRTUAL') : 'CLIENTE'}
                  </span>
                </div>
                
                <div style={{ 
                  maxWidth: '85%',
                  padding: '1rem',
                  borderRadius: isBot ? '2px 16px 16px 16px' : '16px 2px 16px 16px',
                  background: isBot ? 'rgba(242, 135, 5, 0.05)' : 'rgba(4, 119, 191, 0.05)',
                  border: `1px solid ${isBot ? 'rgba(242, 135, 5, 0.1)' : 'rgba(4, 119, 191, 0.1)'}`,
                  color: 'var(--foreground)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {renderMessageWithLinks(msg.content)}
                </div>
                
                <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                   {msg.time_fmt}
                </span>
              </div>
            );
          })
        )}
      </div>
      <ManualReplyInput id={id} platform="instagram" />
    </div>
  );
}
