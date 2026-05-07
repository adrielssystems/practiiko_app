import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft, User, Smartphone, Clock } from "lucide-react";
import AutoRefresh from "@/components/Common/AutoRefresh";
import BotPauseToggle from "@/components/Common/BotPauseToggle";
import ManualReplyInput from "@/components/Common/ManualReplyInput";
import ResolveHumanButton from "@/components/Common/ResolveHumanButton";

async function getChatMessages(id) {
  try {
    const res = await query(
      "SELECT message, created_at, to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas', 'HH12:MI AM') as time_fmt FROM whatsapp_messages WHERE session_id = $1 ORDER BY created_at ASC",
      [id]
    );
    return res.rows;
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getCustomerInfo(id) {
  try {
    const res = await query("SELECT full_name, ai_enabled, requires_human FROM whatsapp_customers WHERE id = $1", [id]);
    return res.rows[0];
  } catch (e) {
    return null;
  }
}

export default async function WhatsAppChatPage({ params }) {
  const { id } = await params;
  const messages = await getChatMessages(id);
  const customer = await getCustomerInfo(id);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AutoRefresh interval={5000} />
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/whatsapp" style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={24} />
        </Link>
        <div style={{ 
          width: '45px', 
          height: '45px', 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <User size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {customer?.full_name || `+${id}`}
            {customer?.requires_human && (
              <span style={{ fontSize: '0.7rem', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                Requiere Asesor
              </span>
            )}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#25D366', fontWeight: 600 }}>WhatsApp Business</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {customer?.requires_human && <ResolveHumanButton id={id} />}
          <BotPauseToggle id={id} platform="whatsapp" initialStatus={customer?.ai_enabled ?? true} />
        </div>
      </header>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1.5rem', 
        background: '#f8f9fa', 
        borderRadius: '24px 24px 0 0',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: '4rem' }}>
            No hay mensajes en esta conversación.
          </div>
        ) : (
          messages.map((m, idx) => {
            const data = typeof m.message === 'string' ? JSON.parse(m.message) : m.message;
            const isBot = data.role === 'assistant';
            
            return (
              <div key={idx} style={{ 
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: '80%',
                padding: '1rem 1.25rem',
                borderRadius: isBot ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
                background: isBot ? 'white' : '#25D366',
                color: isBot ? '#1a1a1a' : 'white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                position: 'relative'
              }}>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {data.content}
                </div>
                <div style={{ 
                  fontSize: '0.65rem', 
                  marginTop: '0.4rem', 
                  opacity: 0.7, 
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.3rem'
                }}>
                  <Clock size={10} /> {m.time_fmt}
                </div>
                {isBot && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-10px', 
                    left: '0', 
                    fontSize: '0.6rem', 
                    fontWeight: 800, 
                    color: '#128C7E',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {data.manual ? 'Manual (Tú)' : 'Agente Virtual'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <ManualReplyInput id={id} platform="whatsapp" />
    </div>
  );
}
