import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { MessageSquare, MessageCircle, Clock, User, ChevronRight, Settings, Activity, Trash2 } from "lucide-react";
import BotSimulator from "@/components/Instagram/BotSimulator";
import AutoRefresh from "@/components/Common/AutoRefresh";

import DeleteChatButton from "@/components/Common/DeleteChatButton";
import BotPauseToggle from "@/components/Common/BotPauseToggle";

async function getConversations() {
  try {
    const res = await query(`
      SELECT 
        session_id, 
        MAX(created_at) as last_message,
        to_char(MAX(created_at) AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY, HH12:MI AM') as last_message_fmt,
        COUNT(*) as total_messages,
        (SELECT full_name FROM instagram_customers WHERE id = session_id LIMIT 1) as full_name,
        (SELECT ai_enabled FROM instagram_customers WHERE id = session_id LIMIT 1) as ai_enabled,
        (SELECT source FROM instagram_messages m2 WHERE m2.session_id = instagram_messages.session_id ORDER BY created_at DESC LIMIT 1) as latest_source
      FROM instagram_messages
      WHERE session_id != 'practiiko'
      GROUP BY session_id
      ORDER BY last_message DESC
      LIMIT 100
    `);
    return res.rows;
  } catch (e) {
    console.error("Error fetching conversations:", e);
    return [];
  }
}

export default async function InstagramMonitoringPage() {
  const conversations = await getConversations();

  return (
    <div>
      <AutoRefresh interval={5000} />
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}>
              <MessageCircle color="white" size={24} />
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Monitoreo Instagram</h1>
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem' }}>
            Supervisa las conversaciones en tiempo real entre tus clientes y el Agente Virtual de Practiiko.
          </p>
        </div>
      </header>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {conversations.length === 0 ? (
          <div className="card glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <MessageSquare size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No hay conversaciones activas</h3>
            <p style={{ color: 'var(--muted-foreground)' }}>Las charlas de Instagram aparecerán aquí una vez que el Webhook esté configurado.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.session_id} className="card glass conversation-card" style={{ 
                padding: '1.5rem', 
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.3s ease',
                background: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid #f0f0f0',
                position: 'relative'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                  <Link href={`/instagram/${conv.session_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, var(--primary) 0%, #035a91 100%)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white',
                      flexShrink: 0
                    }}>
                      <User size={24} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        color: '#1a1a1a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {conv.full_name || (conv.session_id.startsWith('test-') || conv.session_id.startsWith('simul') ? conv.session_id : `Cliente: ${conv.session_id.substring(0, 10)}...`)}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <Clock size={12} /> {conv.last_message_fmt}
                      </div>
                    </div>
                  </Link>

                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 10
                    }}
                  >
                    <BotPauseToggle id={conv.session_id} platform="instagram" initialStatus={conv.ai_enabled ?? true} />
                    <DeleteChatButton sessionId={conv.session_id} platform="instagram" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                  <div style={{ 
                    background: 'rgba(4, 119, 191, 0.1)', 
                    color: 'var(--primary)', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '8px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800
                  }}>
                    {conv.total_messages} MSG
                  </div>
                  {conv.latest_source === 'comment' && (
                    <span style={{ fontSize: '0.6rem', background: '#F28705', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>Comentario</span>
                  )}
                  {conv.latest_source === 'dm' && (
                    <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>Mensaje</span>
                  )}
                </div>
                
                <Link href={`/instagram/${conv.session_id}`} style={{ 
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f5f5f5',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  color: 'var(--primary)', 
                  fontSize: '0.85rem', 
                  fontWeight: 600 
                }}>
                  Ver conversación completa
                  <ChevronRight size={18} />
                </Link>
              </div>
          ))
        )}
      </div>

      <BotSimulator />
    </div>
  );
}
