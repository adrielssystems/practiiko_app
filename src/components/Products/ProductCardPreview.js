"use client";
import React, { useState } from "react";
import { Heart, Eye, ShoppingBag, Info, ChevronRight, X } from "lucide-react";

export default function ProductCardPreview({ product }) {
  const [activeBadge, setActiveBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Default values to prevent errors
  const name = product?.name || "SOFÁ MODULAR ZEN";
  const mainImage = product?.images?.[0] || product?.main_image || "https://placehold.co/600x600/e2e8f0/64748b?text=Foto+1x1";
  const price = product?.price_cash || 0;
  const technicalSummary = product?.technical_summary || "Espuma de alta densidad / Tela premium antimanchas";
  const badgeText = product?.badge_text || "Diseño Inteligente: Llega a tu puerta";
  const likes = product?.likes_count || 0;
  const views = product?.views_count || 0;
  const sales = product?.sales_count || 0;
  
  // Example interactive badges if none provided
  const interactiveBadges = product?.interactive_badges || [
    { title: "Garantía", text: "5 años de garantía sobre defectos estructurales." },
    { title: "Cuidado", text: "Fundas lavables en máquina con agua fría." }
  ];

  return (
    <div style={{
      width: '100%',
      maxWidth: '380px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      border: '1px solid rgba(0,0,0,0.03)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 24px 48px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)';
    }}>
      
      {/* HEADER IMAGE SECTION (1x1) */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#f8fafc', overflow: 'hidden' }}>
        <img 
          src={mainImage} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {/* LIFESTYLE BADGE */}
        {badgeText && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(4px)',
            color: '#0f172a',
            padding: '8px 14px',
            borderRadius: '100px',
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></span>
            {badgeText}
          </div>
        )}

        {/* SOCIAL STATS OVERLAY (Bottom of image) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
          padding: '24px 16px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14}/> {views}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShoppingBag size={14}/> {sales}</span>
          </div>
          <button style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            borderRadius: '100px',
            padding: '0 12px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onClick={() => {}}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Heart size={16} />
            <span style={{ fontSize: '11px', fontWeight: 800 }}>{likes}</span>
          </button>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* TITLE & DESC */}
        <div>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 900, 
            textTransform: 'uppercase', 
            letterSpacing: '-0.02em', 
            color: '#0f172a',
            margin: '0 0 4px 0',
            lineHeight: 1.2
          }}>
            {name}
          </h2>
          <p style={{ 
            fontSize: '0.8rem', 
            color: '#64748b', 
            margin: 0,
            fontWeight: 500
          }}>
            {technicalSummary}
          </p>
        </div>

        {/* PRICE */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '4px' }}>
          <span style={{ 
            fontSize: '2rem', 
            fontWeight: 900, 
            color: '#d97706', // Naranja/Dorado elegante
            lineHeight: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.25)' // Sombra negra con desplazamiento derecho
          }}>
            <small style={{ fontSize: '1rem', verticalAlign: 'top', opacity: 0.8, marginRight: '4px', textShadow: 'none' }}>Ref</small>
            {parseFloat(price).toLocaleString('es-VE')}
          </span>
        </div>

        {/* INTERACTIVE BADGES */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {interactiveBadges.map((badge, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveBadge(activeBadge === idx ? null : idx)}
              style={{
                background: activeBadge === idx ? '#0f172a' : '#f1f5f9',
                color: activeBadge === idx ? 'white' : '#475569',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Info size={12} /> {badge.title}
            </button>
          ))}
        </div>

        {/* POPOVER TOOLTIP */}
        {activeBadge !== null && (
          <div style={{
            background: '#0f172a',
            color: 'white',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            position: 'relative',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{interactiveBadges[activeBadge].title}</strong>
              <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setActiveBadge(null)}/>
            </div>
            <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.4 }}>{interactiveBadges[activeBadge].text}</p>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginTop: '8px' }}>
          {/* CTA SECUNDARIO: WHATSAPP */}
          <button style={{
            background: 'white',
            border: '2px solid #0f172a',
            color: '#0f172a',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}>
            Comprar
          </button>
          
          <button style={{
            background: '#0f172a',
            border: 'none',
            color: 'white',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 8px 16px rgba(15, 23, 42, 0.2)'
          }}
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(15, 23, 42, 0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(15, 23, 42, 0.2)' }}>
            Transformar mi espacio <ChevronRight size={16} />
          </button>
        </div>

      </div>

      {/* MODAL DEL PRODUCTO (SIMULADO EN EL GESTOR) */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>{name}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
                <img src={mainImage} alt={name} style={{ width: '80%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '12px', flexShrink: 0, scrollSnapAlign: 'center', border: '1px solid #f1f5f9' }} />
              </div>
              
              <div>
                {product?.aspirational_copy && (
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', fontStyle: 'italic', borderLeft: '4px solid #34d399', paddingLeft: '12px', margin: '0 0 16px 0' }}>
                    "{product.aspirational_copy}"
                  </p>
                )}
                <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Descripción del Producto</h4>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {product?.description || "Sin descripción detallada."}
                </p>
              </div>
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>
                <small style={{ fontSize: '0.875rem', verticalAlign: 'top', opacity: 0.8, marginRight: '4px' }}>Ref</small>
                {parseFloat(price).toLocaleString('es-VE')}
              </span>
              <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                ¡Lo quiero!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
