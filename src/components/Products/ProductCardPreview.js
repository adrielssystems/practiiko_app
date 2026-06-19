"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Heart, Eye, ShoppingBag, Info, ChevronRight, X } from "lucide-react";

export default function ProductCardPreview({ product }) {
  const [activeBadge, setActiveBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
  const interactiveBadges = Array.isArray(product?.interactive_badges) ? product.interactive_badges : [
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
          style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply', padding: '16px', boxSizing: 'border-box' }}
        />
        
        {/* LIFESTYLE BADGE (MEDALLA DORADA) */}
        {product?.show_badge !== false && badgeText && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '86px',
            height: '86px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE77A 0%, #E5B13A 50%, #B88012 100%)',
            border: '2px solid #FFDF73',
            boxShadow: '0 6px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            zIndex: 20
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 900,
              color: '#3E2723',
              lineHeight: 1.1,
              textAlign: 'center',
              textShadow: '0 1px 1px rgba(255,255,255,0.4)'
            }}>
              {badgeText}
            </span>
          </div>
        )}

        {/* STATUS TAGS (TOP RIGHT) */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 20, alignItems: 'flex-end' }}>
          {product?.is_featured && <span style={{ background: '#0f172a', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Sellers</span>}
          {product?.is_new && <span style={{ background: '#0477BF', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nuevo</span>}
          {product?.is_promotion && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Promoción</span>}
          {product?.is_clearance && <span style={{ background: '#6b7280', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liquidación</span>}
          {product?.is_coming_soon && <span style={{ background: '#7c3aed', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximamente</span>}
        </div>

        {/* SOCIAL STATS OVERLAY (Bottom of image) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 16px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 900, letterSpacing: '0.025em', color: '#F28705', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={14} color="currentColor" /> {views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShoppingBag size={14} color="currentColor" /> {sales}
            </span>
          </div>
          <button style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '100px', padding: '0 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', color: '#F28705', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))', cursor: 'pointer', transition: 'background 0.2s' }}
          onClick={() => {}}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
          >
            <Heart size={14} color="currentColor" />
            <span style={{ fontSize: '12px', fontWeight: 900 }}>{likes}</span>
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
          {interactiveBadges.map((badge, idx) => (
            <button 
              key={idx}
              onMouseEnter={() => setActiveBadge(idx)}
              onMouseLeave={() => setActiveBadge(null)}
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
          
          {/* POPOVER TOOLTIP */}
          {activeBadge !== null && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              zIndex: 30,
              background: '#0f172a',
              color: 'white',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              width: '100%',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{interactiveBadges[activeBadge].title}</strong>
              </div>
              <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.4 }}>{interactiveBadges[activeBadge].text}</p>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginTop: '8px' }}>
          {/* CTA SECUNDARIO: WHATSAPP */}
          <button style={{
            background: 'white',
            border: '2px solid #F28705',
            color: '#F28705',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}>
            Comprar
          </button>
          
          <button style={{
            background: '#F28705',
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
            boxShadow: '0 8px 16px rgba(242, 135, 5, 0.3)'
          }}
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(242, 135, 5, 0.4)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(242, 135, 5, 0.3)' }}>
            Transformar mi espacio <ChevronRight size={16} />
          </button>
        </div>

      </div>

      {/* MODAL DEL PRODUCTO (SIMULADO EN EL GESTOR) */}
      {isModalOpen && mounted && createPortal(
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Header / Cerrar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0 16px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            
            {/* Contenido (2 columnas) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', gap: '32px', flexDirection: 'row', flexWrap: 'wrap' }}>
              
              {/* Columna Izquierda: Galería */}
              <div style={{ flex: '1 1 50%', minWidth: '300px', display: 'flex', gap: '16px' }}>
                {/* Thumbnails (verticales) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '80px', flexShrink: 0, maxHeight: '400px', overflowY: 'auto' }}>
                  <img 
                    src={mainImage} 
                    alt={name} 
                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', border: '2px solid #F28705', cursor: 'pointer' }} 
                  />
                </div>
                
                {/* Imagen Principal */}
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                  <img src={mainImage} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
              </div>

              {/* Columna Derecha: Detalles */}
              <div style={{ flex: '1 1 40%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: '0 0 8px 0', lineHeight: 1.2 }}>
                    {name}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, margin: 0 }}>
                    {technicalSummary}
                  </p>
                </div>
                
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#F28705', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <small style={{ fontSize: '1.25rem', verticalAlign: 'top', opacity: 0.8, marginRight: '4px' }}>Ref</small>
                  {parseFloat(price).toLocaleString('es-VE')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Detalles Adicionales</h4>
                    <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {product?.description || "Consulta con nuestro asesor para conocer las opciones de color, dimensiones exactas y tiempos de entrega."}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <button style={{ width: '100%', background: '#F28705', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(242, 135, 5, 0.3)' }}>
                    ¡Comprar por WhatsApp! <ShoppingBag size={18} />
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '12px', fontWeight: 500 }}>Asesoramiento personalizado e inmediato</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
