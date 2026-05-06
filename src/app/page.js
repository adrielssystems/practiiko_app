import { query } from "@/lib/db";
import { 
  Package, 
  TrendingUp, 
  MessageCircle, 
  MessageSquare, 
  Activity, 
  Clock, 
  ChevronRight, 
  Plus,
  Zap,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import AutoRefresh from "@/components/Common/AutoRefresh";
import GlobalBotBreaker from "@/components/Common/GlobalBotBreaker";

export const dynamic = "force-dynamic";

async function getDetailedStats() {
  try {
    // Totales
    const productsRes = await query("SELECT COUNT(*) FROM products");
    const igMessagesRes = await query("SELECT COUNT(*) FROM instagram_messages");
    const waMessagesRes = await query("SELECT COUNT(*) FROM whatsapp_messages");
    const customersRes = await query("SELECT COUNT(*) FROM instagram_customers");
    const waCustomersRes = await query("SELECT COUNT(*) FROM whatsapp_customers");
    
    // Actividad reciente Instagram
    const recentIg = await query(`
      SELECT 
        session_id, 
        message::json->>'content' as content, 
        to_char(created_at AT TIME ZONE 'America/Caracas', 'HH12:MI AM') as time
      FROM instagram_messages 
      WHERE message::json->>'role' = 'user'
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    // Actividad reciente WhatsApp
    const recentWa = await query(`
      SELECT 
        session_id, 
        message::json->>'content' as content, 
        to_char(created_at AT TIME ZONE 'America/Caracas', 'HH12:MI AM') as time
      FROM whatsapp_messages 
      WHERE message::json->>'role' = 'user'
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    // Status del Webhook (últimas 12h)
    const lastWebhookRes = await query("SELECT created_at FROM webhook_logs ORDER BY created_at DESC LIMIT 1");
    const lastSignal = lastWebhookRes.rows[0]?.created_at;
    const isOnline = lastSignal ? (new Date() - new Date(lastSignal)) < (12 * 60 * 60 * 1000) : false;

    // Estado del Breaker Global
    const globalRes = await query("SELECT value FROM app_settings WHERE key = 'global_bot_enabled'");
    const globalEnabled = globalRes.rows.length > 0 ? globalRes.rows[0].value === 'true' : true;

    return {
      products: parseInt(productsRes.rows[0]?.count || 0),
      igMessages: parseInt(igMessagesRes.rows[0]?.count || 0),
      waMessages: parseInt(waMessagesRes.rows[0]?.count || 0),
      totalCustomers: parseInt(customersRes.rows[0]?.count || 0) + parseInt(waCustomersRes.rows[0]?.count || 0),
      status: isOnline ? 'ACTIVO' : 'STANDBY',
      recentIg: recentIg.rows,
      recentWa: recentWa.rows,
      globalEnabled
    };
  } catch (e) {
    console.error("Dashboard error:", e);
    return { products: 0, igMessages: 0, waMessages: 0, totalCustomers: 0, status: 'Error', recentIg: [], recentWa: [], globalEnabled: true };
  }
}

export default async function OverviewPage() {
  const data = await getDetailedStats();

  const cardStyle = {
    background: 'white',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    borderRadius: '20px',
    padding: '1.25rem',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ padding: '0 0.5rem' }}>
      <AutoRefresh interval={10000} />
      
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
            <Zap size={14} fill="currentColor" />
            <span style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.65rem', textTransform: 'uppercase' }}>Sistema Operativo</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: '#0f172a' }}>Overview</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <GlobalBotBreaker initialEnabled={data.globalEnabled} />
          
          <div style={{ 
            background: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Webhook</p>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: data.status === 'ACTIVO' ? '#10b981' : '#f59e0b' }}>
                {data.status}
              </p>
            </div>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: data.status === 'ACTIVO' ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 10px ${data.status === 'ACTIVO' ? '#10b981' : '#f59e0b'}`
            }}></div>
          </div>
        </div>
      </header>

      {/* METRICS GRID */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Metric 1: Products */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '10px' }}>
              <Package size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.1rem', textTransform: 'uppercase' }}>Catálogo</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{data.products}</p>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>Listos para venta</p>
        </div>

        {/* Metric 2: Instagram */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#fdf2f8', color: '#be185d', borderRadius: '10px' }}>
              <MessageCircle size={20} />
            </div>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#fdf2f8', color: '#be185d', padding: '2px 8px', borderRadius: '20px' }}>IG FEED</span>
          </div>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.1rem', textTransform: 'uppercase' }}>Interacciones</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{data.igMessages.toLocaleString()}</p>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>Mensajes y comentarios</p>
        </div>

        {/* Metric 3: WhatsApp */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#f0fdf4', color: '#15803d', borderRadius: '10px' }}>
              <Smartphone size={20} />
            </div>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '20px' }}>WHA</span>
          </div>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.1rem', textTransform: 'uppercase' }}>WhatsApp</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{data.waMessages.toLocaleString()}</p>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>Conversaciones</p>
        </div>

        {/* Metric 4: Customers */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#fff7ed', color: '#c2410c', borderRadius: '10px' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.1rem', textTransform: 'uppercase' }}>Audiencia</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{data.totalCustomers}</p>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>Registrados</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.25rem' }}>
        {/* LEFT COLUMN: ACTIVITY FEED */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--primary)" /> Última Actividad
            </h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {/* WhatsApp Activity */}
            <div style={{ ...cardStyle, borderRadius: '16px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#128C7E', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MessageSquare size={14} /> Recientes WhatsApp
              </h4>
              {data.recentWa.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {data.recentWa.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{msg.session_id}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content}</p>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>{msg.time}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin actividad.</p>}
            </div>

            {/* Instagram Activity */}
            <div style={{ ...cardStyle, borderRadius: '16px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#be185d', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MessageCircle size={14} /> Recientes Instagram
              </h4>
              {data.recentIg.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {data.recentIg.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{msg.session_id}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content}</p>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>{msg.time}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin actividad.</p>}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: QUICK ACTIONS & HEALTH */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} color="#38bdf8" /> Acciones Rápidas
            </h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Link href="/products" style={{ 
                background: '#38bdf8', 
                color: '#0f172a', 
                padding: '0.65rem', 
                borderRadius: '10px', 
                fontWeight: 800, 
                fontSize: '0.75rem', 
                textAlign: 'center',
                textDecoration: 'none',
                boxShadow: '0 4px 10px rgba(56, 189, 248, 0.2)'
              }}>
                Nuevo Producto
              </Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Link href="/whatsapp" style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  color: 'white', 
                  padding: '0.65rem', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '0.7rem', 
                  textAlign: 'center',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  WhatsApp
                </Link>
                <Link href="/instagram" style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  color: 'white', 
                  padding: '0.65rem', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '0.7rem', 
                  textAlign: 'center',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  Instagram
                </Link>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="#10b981" /> Sistema
            </h3>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'grid', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base de Datos</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>OK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Webhooks</span>
                <span style={{ color: data.status === 'ACTIVO' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>OK</span>
              </div>
          </div>
        </section>
      </div>
    </div>
  );
}
