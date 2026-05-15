import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { MessageSquare, Clock, User, ChevronRight, Settings, Activity, Trash2, Smartphone } from "lucide-react";
import DeleteChatButton from "@/components/Common/DeleteChatButton";
import AutoRefresh from "@/components/Common/AutoRefresh";
import BotPauseToggle from "@/components/Common/BotPauseToggle";
import WhatsAppFilters from "@/components/Common/WhatsAppFilters";

async function getConversations(q, alertOnly) {
  try {
    let queryText = `
      SELECT 
        wm.session_id, 
        MAX(wm.created_at) as last_message,
        to_char(MAX(wm.created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY, HH12:MI AM') as last_message_fmt,
        COUNT(*) as total_messages,
        wc.full_name as push_name,
        wc.ai_enabled,
        wc.requires_human
      FROM whatsapp_messages wm
      LEFT JOIN whatsapp_customers wc ON wm.session_id = wc.id
      WHERE 1=1
    `;
    let queryParams = [];

    if (q) {
      queryParams.push(`%${q}%`);
      queryText += ` AND wm.session_id LIKE $${queryParams.length}`;
    }

    if (alertOnly) {
      queryText += ` AND wc.requires_human = true`;
    }

    queryText += `
      GROUP BY wm.session_id, wc.full_name, wc.ai_enabled, wc.requires_human
      ORDER BY last_message DESC
      LIMIT 50
    `;

    const res = await query(queryText, queryParams);
    return res.rows;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function WhatsAppPage({ searchParams }) {
  try {
    await query("ALTER TABLE whatsapp_customers ADD COLUMN IF NOT EXISTS requires_human BOOLEAN DEFAULT FALSE;");
  } catch(e) {}

  const params = await searchParams;
  const conversations = await getConversations(params?.q, params?.alert === 'true');

  return (
    <div>
      <AutoRefresh interval={5000} />
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'linear-gradient(45deg, #25D366 0%, #128C7E 100%)', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}>
              <Smartphone color="white" size={24} />
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Monitoreo WhatsApp</h1>
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem' }}>
            Supervisa las conversaciones de Evolution API en tiempo real.
          </p>
        </div>
      </header>

      <WhatsAppFilters />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {conversations.length === 0 ? (
          <div className="card glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <Smartphone size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ color: 'var(--muted-foreground)' }}>Las charlas de WhatsApp aparecerán aquí una vez que Evolution API esté conectada.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.session_id} className={`card glass conversation-card ${conv.requires_human ? 'flash-alert' : ''}`} style={{ 
                padding: '1.5rem', 
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.3s ease',
                background: 'white',
                boxShadow: conv.requires_human ? '0 0 20px rgba(239, 68, 68, 0.2)' : '0 4px 20px rgba(0,0,0,0.05)',
                border: conv.requires_human ? '2px solid #ef4444' : '1px solid #f0f0f0',
                position: 'relative',
                animation: conv.requires_human ? 'pulseBorderRed 2s infinite' : 'none'
              }}>
                {conv.requires_human && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    background: '#ef4444',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 20,
                    animation: 'pulseRed 2s infinite'
                  }}>
                    🚨 REQUIERE ASESOR
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                  <Link href={`/whatsapp/${conv.session_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
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
                        {conv.push_name || `+${conv.session_id}`}
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
                    <BotPauseToggle id={conv.session_id} platform="whatsapp" initialStatus={conv.ai_enabled ?? true} />
                    <DeleteChatButton sessionId={conv.session_id} platform="whatsapp" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem', marginTop: 'auto' }}>
                  <div style={{ 
                    background: 'rgba(37, 211, 102, 0.1)', 
                    color: '#128C7E', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '6px', 
                    fontSize: '0.65rem', 
                    fontWeight: 800
                  }}>
                    {conv.total_messages} MSG
                  </div>
                  <span style={{ fontSize: '0.6rem', background: '#25D366', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>WhatsApp</span>
                </div>
                
                <Link href={`/whatsapp/${conv.session_id}`} style={{ 
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f5f5f5',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  color: '#128C7E', 
                  fontSize: '0.85rem', 
                  fontWeight: 600 
                }}>
                  Ver chat completo
                  <ChevronRight size={18} />
                </Link>
              </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes pulseBorderRed {
          0% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { border-color: #fca5a5; box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.2); }
          100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        }
      `}</style>
    </div>
  );
}
