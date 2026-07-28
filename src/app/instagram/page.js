import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { MessageSquare, MessageCircle, Clock, User, ChevronRight, Settings, Activity, Trash2 } from "lucide-react";
import BotSimulator from "@/components/Instagram/BotSimulator";
import AutoRefresh from "@/components/Common/AutoRefresh";

import DeleteChatButton from "@/components/Common/DeleteChatButton";
import BotPauseToggle from "@/components/Common/BotPauseToggle";
import Pagination from "@/components/Common/Pagination";
import InstagramFilters from "@/components/Instagram/InstagramFilters";

async function getConversations(filters = {}, page = 1) {
  const limit = 50;
  const offset = (page - 1) * limit;
  const { q, source, alertOnly, startDate, endDate } = filters;

  try {
    let queryText = `
      SELECT 
        im.session_id, 
        MAX(im.created_at) as last_message,
        to_char(MAX(im.created_at) AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY, HH12:MI AM') as last_message_fmt,
        COUNT(*) as total_messages,
        ic.full_name,
        ic.username,
        ic.ai_enabled,
        ic.requires_human,
        (SELECT source FROM instagram_messages m2 WHERE m2.session_id = im.session_id ORDER BY created_at DESC LIMIT 1) as latest_source,
        COUNT(*) OVER() as full_count
      FROM instagram_messages im
      LEFT JOIN instagram_customers ic ON im.session_id = ic.id
      WHERE im.session_id != 'practiiko'
    `;
    let queryParams = [];

    if (q) {
      queryParams.push(`%${q}%`);
      queryText += ` AND (im.session_id ILIKE $${queryParams.length} OR ic.full_name ILIKE $${queryParams.length} OR ic.username ILIKE $${queryParams.length})`;
    }

    if (alertOnly) {
      queryText += ` AND ic.requires_human = true`;
    }

    if (startDate) {
      queryParams.push(`${startDate} 00:00:00`);
      queryText += ` AND im.created_at >= $${queryParams.length}::timestamp`;
    }

    if (endDate) {
      queryParams.push(`${endDate} 23:59:59`);
      queryText += ` AND im.created_at <= $${queryParams.length}::timestamp`;
    }

    queryText += `
      GROUP BY im.session_id, ic.full_name, ic.username, ic.ai_enabled, ic.requires_human
    `;

    if (source) {
      queryParams.push(source);
      queryText += ` HAVING (SELECT source FROM instagram_messages m2 WHERE m2.session_id = im.session_id ORDER BY created_at DESC LIMIT 1) = $${queryParams.length}`;
    }

    queryText += `
      ORDER BY last_message DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const res = await query(queryText, queryParams);
    const conversations = res.rows;
    const totalCount = conversations.length > 0 ? parseInt(conversations[0].full_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { conversations, totalPages };
  } catch (e) {
    console.error("Error fetching conversations:", e);
    return { conversations: [], totalPages: 0 };
  }
}

export default async function InstagramMonitoringPage({ searchParams }) {
  try {
    await query("ALTER TABLE instagram_customers ADD COLUMN IF NOT EXISTS requires_human BOOLEAN DEFAULT FALSE;");
  } catch(e) {}

  const params = await searchParams;
  const currentPage = parseInt(params?.page) || 1;
  const filters = {
    q: params?.q,
    source: params?.source,
    alertOnly: params?.alert === 'true',
    startDate: params?.startDate,
    endDate: params?.endDate
  };

  const { conversations, totalPages } = await getConversations(filters, currentPage);

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

      <InstagramFilters />

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {conversations.length === 0 ? (
          <div className="card glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <MessageSquare size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No se encontraron conversaciones</h3>
            <p style={{ color: 'var(--muted-foreground)' }}>Prueba ajustando o limpiando los filtros de búsqueda.</p>
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
                        {conv.username ? `@${conv.username}` : (conv.full_name || (conv.session_id.startsWith('test-') || conv.session_id.startsWith('simul') ? conv.session_id : `Cliente: ${conv.session_id.substring(0, 10)}...`))}
                      </h4>
                      {conv.full_name && conv.username && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.full_name}
                        </div>
                      )}
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

      <Pagination totalPages={totalPages} currentPage={currentPage} />
      <BotSimulator />

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
