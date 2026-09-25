import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft, User, Smartphone, Clock } from "lucide-react";
import AutoRefresh from "@/components/Common/AutoRefresh";
import BotPauseToggle from "@/components/Common/BotPauseToggle";
import ManualReplyInput from "@/components/Common/ManualReplyInput";
import ResolveHumanButton from "@/components/Common/ResolveHumanButton";

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
            
            const isVideo = data.type === 'video' || (data.mediaUrl && data.mediaUrl.endsWith('.mp4'));
            const isAudio = data.type === 'audio' || (data.mediaUrl && data.mediaUrl.endsWith('.mp3'));
            const isTemplate = data.type === 'template' || data.isWelcomeTemplate;
            const isCarousel = data.type === 'carousel';

            return (
              <div key={idx} style={{ 
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: isCarousel ? '92%' : '80%',
                padding: '1rem 1.25rem',
                borderRadius: isBot ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
                background: isBot ? 'white' : '#25D366',
                color: isBot ? '#1a1a1a' : 'white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                position: 'relative'
              }}>
                {/* 1. Header con Imagen para Plantillas (Welcome) */}
                {isTemplate && data.imageUrl && (
                  <div style={{ marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img 
                      src={data.imageUrl} 
                      alt="Encabezado" 
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} 
                    />
                  </div>
                )}

                {/* 2. Reproductor de Video */}
                {isVideo && (
                  <div style={{ marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                    <video 
                      controls 
                      playsInline 
                      preload="metadata"
                      src={data.mediaUrl} 
                      style={{ width: '100%', maxHeight: '260px', display: 'block' }}
                    >
                      Tu navegador no soporta el reproductor de video.
                    </video>
                  </div>
                )}

                {/* 3. Reproductor de Audio (Nota de Voz) */}
                {isAudio && (
                  <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      🎙️ Nota de voz enviada
                    </div>
                    <audio 
                      controls 
                      src={data.mediaUrl} 
                      style={{ width: '100%', height: '36px', outline: 'none' }}
                    >
                      Tu navegador no soporta audio.
                    </audio>
                  </div>
                )}

                {/* 4. Carrusel Horizontal de Tarjetas */}
                {isCarousel && data.cards && data.cards.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    overflowX: 'auto', 
                    paddingBottom: '0.5rem',
                    marginBottom: '0.5rem',
                    maxWidth: '100%'
                  }}>
                    {data.cards.map((card, cIdx) => (
                      <div key={cIdx} style={{
                        flex: '0 0 200px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {card.videoUrl && (
                          <div style={{ background: '#000', height: '140px' }}>
                            <video 
                              controls 
                              playsInline 
                              preload="metadata"
                              src={card.videoUrl} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        )}
                        <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                            {card.title}
                          </span>
                          {card.buttons && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {card.buttons.map((bName, bIdx) => (
                                <div key={bIdx} style={{
                                  background: '#fff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.72rem',
                                  textAlign: 'center',
                                  color: '#2563eb',
                                  fontWeight: 600
                                }}>
                                  {bName}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Texto del Mensaje */}
                <div style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderMessageWithLinks(data.content)}
                </div>

                {/* Botones de Respuesta Rápida (para plantillas como Welcome) */}
                {isTemplate && data.buttons && data.buttons.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {data.buttons.map((btnTitle, bIdx) => (
                      <div key={bIdx} style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        color: '#059669',
                        fontWeight: 700,
                        letterSpacing: '0.3px'
                      }}>
                        ↩ {btnTitle}
                      </div>
                    ))}
                  </div>
                )}

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
