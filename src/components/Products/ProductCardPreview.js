"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Heart, Eye, ShoppingBag, Info, ChevronRight, X } from "lucide-react";

export default function ProductCardPreview({ product }) {
  const [activeBadge, setActiveBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const carouselRef = useRef(null);
  const scrollTimeout = useRef(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (carouselRef.current) {
      const targetScroll = modalImageIdx * carouselRef.current.clientWidth;
      if (Math.abs(carouselRef.current.scrollLeft - targetScroll) > 10) {
        carouselRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [modalImageIdx]);

  // Default values to prevent errors
  const name = product?.name || "SOFÁ MODULAR ZEN";
  const mainImage = product?.images?.[0] || product?.main_image || "https://placehold.co/600x600/e2e8f0/64748b?text=Foto+1x1";
  const price = product?.price_bcv || 0;
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

  let parsedColors = [];
  if (Array.isArray(product?.colors)) {
    parsedColors = product.colors;
  } else if (typeof product?.colors === 'string') {
    try { parsedColors = JSON.parse(product.colors); } catch(e) { parsedColors = []; }
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '380px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '24px',
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
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'white', overflow: 'hidden', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
        <img 
          src={mainImage} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          {/* CTA COMPRAR: DESTACADO */}
          <a
            href={`https://wa.me/584248948664?text=${encodeURIComponent(`Hola, vengo de la pagina web y me interesa el modelo: ${product?.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'linear-gradient(to right, #25D366, #128C7E)',
              color: 'white',
              padding: '14px 4px',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 10px rgba(37,211,102,0.2)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(37,211,102,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(37,211,102,0.2)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Comprar
          </a>
          
          {/* CTA PRIMARIO: DETALLES */}
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              background: '#F28705',
              color: 'white',
              border: 'none',
              padding: '14px 4px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.6875rem',
              lineHeight: 1.2,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 8px 16px rgba(242,135,5,0.3)',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 20px rgba(242,135,5,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(242,135,5,0.3)';
            }}
          >
            Transformar mi espacio
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
            
            <style>{`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            
            {/* Contenido (2 columnas) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', gap: '32px', flexDirection: 'row', flexWrap: 'wrap' }}>
              
              {/* Columna Izquierda: Galería */}
              <div style={{ flex: '1 1 50%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Galería: Thumbnails + Imagen Principal */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Thumbnails verticales */}
                  {rawImages && rawImages.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '64px', flexShrink: 0, maxHeight: '380px', overflowY: 'auto' }}
                         className="no-scrollbar">
                      {rawImages.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`${name} thumb ${i}`}
                          onClick={() => setModalImageIdx(i)}
                          style={{
                            width: '100%',
                            aspectRatio: '1/1',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: modalImageIdx === i ? '2px solid #F28705' : '2px solid transparent',
                            boxShadow: modalImageIdx === i ? '0 2px 8px rgba(242,135,5,0.3)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Imagen Principal — Carrusel deslizable */}
                  <div
                    ref={carouselRef}
                    className="no-scrollbar"
                    style={{ flex: 1, background: 'white', borderRadius: '12px', overflowX: 'auto', display: 'flex', scrollSnapType: 'x mandatory', aspectRatio: '4/3', position: 'relative', border: '1px solid #f1f5f9' }}
                    onScroll={(e) => {
                      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                      scrollTimeout.current = setTimeout(() => {
                        const el = e.target;
                        const idx = Math.round(el.scrollLeft / el.clientWidth);
                        if (idx !== modalImageIdx) setModalImageIdx(idx);
                      }, 50);
                    }}
                  >
                    {rawImages && rawImages.length > 0 ? rawImages.map((img, i) => (
                      <div key={i} style={{ flex: 'none', width: '100%', height: '100%', position: 'relative', scrollSnapAlign: 'center' }}>
                        <img src={img} alt={`${name} ${i}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )) : (
                      <div style={{ flex: 'none', width: '100%', height: '100%', position: 'relative', scrollSnapAlign: 'center' }}>
                        <img src={mainImage} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* COLORES (Si existen) - Debajo de la imagen principal */}
                {parsedColors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Elige tu color</p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {parsedColors.map((color, idx) => {
                        let linkedIdx = 0;
                        if (color.image_url && rawImages) {
                          const exactIdx = rawImages.findIndex(img => img === color.image_url);
                          if (exactIdx !== -1) linkedIdx = exactIdx;
                        }
                        const isSelected = modalImageIdx === linkedIdx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setModalImageIdx(linkedIdx)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              backgroundColor: color.hex,
                              border: isSelected ? '3px solid #F28705' : '3px solid white',
                              boxShadow: isSelected
                                ? '0 0 0 2px #F28705, 0 4px 8px rgba(0,0,0,0.15)'
                                : '0 0 0 2px #cbd5e1, 0 4px 6px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s ease',
                              transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                            }} />
                            <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#F28705' : '#64748b', textAlign: 'center', maxWidth: '52px', lineHeight: 1.2 }}>
                              {color.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
