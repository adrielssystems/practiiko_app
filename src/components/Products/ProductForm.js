"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Save, Eye, Package, Tag, CreditCard, ChevronLeft, 
  LayoutDashboard, Layers, Box, Plus, X, ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MediaUpload from "./MediaUpload";
import { useToast } from "@/components/Toast";

export default function ProductForm({ categories, onSubmitAction, initialData = {} }) {
  const router = useRouter();
  const { addToast } = useToast();
  
  const [media, setMedia] = useState({ 
    images: initialData.images || [], 
    video: initialData.video_url || null,
    localPreviews: {}
  });
  
  // Estado para la previsualización en tiempo real
  const [formValues, setFormValues] = useState({
    name: initialData.name || "",
    code: initialData.code || "",
    price_bcv: initialData.price_bcv || "",
    price_cash: initialData.price_cash || "",
    category_id: initialData.category_id || "",
    category_name: "",
    description: initialData.description || "",
    status: initialData.status || "active",
    is_featured: initialData.is_featured || false,
    is_promotion: initialData.is_promotion || false,
    is_new: initialData.is_new || false,
    is_clearance: initialData.is_clearance || false,
    is_coming_soon: initialData.is_coming_soon || false,
    pseudonimo: initialData.pseudonimo || "",
    price_valid_until: initialData.price_valid_until ? new Date(initialData.price_valid_until).toISOString().split('T')[0] : ""
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const previewVideoRef = useRef(null);

  // Unificar imágenes y video en una sola lista para el preview del carrusel
  const mediaList = [];
  if (media.images.length > 0) {
    media.images.forEach(img => {
      mediaList.push({ type: "image", url: media.localPreviews[img] || img });
    });
  }
  if (media.video) {
    mediaList.push({ type: "video", url: media.localPreviews[media.video] || media.video });
  }
  if (mediaList.length === 0) {
    mediaList.push({ type: "image", url: "/hero-sofa.png" });
  }

  // Reiniciar index cuando cambian las imágenes o el video
  useEffect(() => {
    setActiveIndex(0);
  }, [media.images, media.video]);

  // Autoplay del video al seleccionarse, y pausa al salirse
  useEffect(() => {
    if (mediaList[activeIndex]?.type === "video") {
      if (previewVideoRef.current) {
        previewVideoRef.current.currentTime = 0;
        previewVideoRef.current.play().catch(err => console.log("Preview video auto-play blocked/failed:", err));
      }
    } else {
      if (previewVideoRef.current) {
        previewVideoRef.current.pause();
      }
    }
  }, [activeIndex, mediaList]);

  const handleNext = (e) => {
    e.stopPropagation(); // Evitar que la tarjeta gire
    setActiveIndex(prev => (prev + 1) % mediaList.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation(); // Evitar que la tarjeta gire
    setActiveIndex(prev => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleDotClick = (e, index) => {
    e.stopPropagation(); // Evitar que la tarjeta gire
    setActiveIndex(index);
  };

  const handleFlip = (e) => {
    // Si es un botón del carrusel o controles de la tarjeta, no girar
    if (e.target.closest('button')) return;
    setIsFlipped(!isFlipped);
  };

  // Actualizar el nombre de la categoría para el preview
  useEffect(() => {
    if (formValues.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === parseInt(formValues.category_id));
      if (cat) setFormValues(prev => ({ ...prev, category_name: cat.name }));
    }
  }, [categories, formValues.category_id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Validación de exclusividad para estados especiales (máximo 2 a la vez)
    const exclusiveFlags = ["is_new", "is_promotion", "is_clearance", "is_coming_soon"];
    if (type === "checkbox" && checked && exclusiveFlags.includes(name)) {
      const activeCount = exclusiveFlags.filter(f => f !== name && formValues[f]).length;
      if (activeCount >= 2) {
        addToast("Solo puedes seleccionar un máximo de dos estados principales (Nuevo, Promoción, Liquidación o Próximamente) a la vez.", "error");
        return; // No procesar el cambio
      }
    }

    const val = type === "checkbox" ? checked : value;
    setFormValues(prev => ({ ...prev, [name]: val }));

    if (name === "category_id") {
      const cat = categories.find(c => c.id === parseInt(value));
      setFormValues(prev => ({ ...prev, category_name: cat ? cat.name : "" }));
    }
  };

  const handleMediaChange = useCallback((newMedia) => {
    setMedia(newMedia);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- VERIFICATION PROTOCOL ---
    if (!formValues.name || !formValues.category_id || !formValues.price_bcv) {
      addToast("Campos requeridos faltantes: Nombre, Categoría y Precio BCV.", "error");
      return;
    }

    setIsSaving(true);

    const formData = new FormData(e.target);
    
    try {
      const result = await onSubmitAction(formData);
      
      if (result && result.success) {
        addToast(initialData.id ? "Cambios guardados con éxito 💎" : "Producto publicado con éxito 🚀", "success");
        router.push("/products");
      } else {
        throw new Error(result?.error || "Error desconocido en el servidor");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      addToast(`Error: ${error.message}`, "error");
      setIsSaving(false);
    }
  };

  // Cálculo del precio de previsualización (el menor de la matriz o el base)
  const getPreviewPrice = () => {
    const basePrice = parseFloat(formValues.price_bcv) || 0;
    return basePrice;
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 400px', 
      gap: '2.5rem', 
      alignItems: 'start',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <form onSubmit={handleSubmit} className="card glass" style={{ 
        padding: '2.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
      }}>
        
        {/* CAMPOS OCULTOS PARA DATOS COMPLEJOS (JSON) */}
        <input type="hidden" name="images_json" value={JSON.stringify(media.images)} />
        <input type="hidden" name="tags_json" value="[]" />
        <input type="hidden" name="features_json" value="[]" />
        <input type="hidden" name="pricing_matrix_json" value="[]" />

        {/* SECCIÓN 1: BÁSICO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Box size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Información Básica</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="label">Nombre del Producto</label>
            <input 
              name="name" type="text" required className="input-field" 
              value={formValues.name} placeholder="Ej: Sofá Modular Premium" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Pseudónimo (Alias para IA)</label>
            <input 
              name="pseudonimo" type="text" className="input-field" 
              value={formValues.pseudonimo} placeholder="Ej: Nube Modular" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px', borderColor: 'var(--primary)' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Código (SKU)</label>
            <input 
              name="code" type="text" required className="input-field" 
              value={formValues.code} placeholder="Ej: SOFA-001" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="label">Descripción Detallada</label>
          <textarea 
            name="description" 
            className="input-field" 
            style={{ minHeight: '100px', resize: 'vertical', borderRadius: '12px' }} 
            value={formValues.description} 
            placeholder="Describe materiales, estilo y dimensiones..."
            onChange={handleInputChange}
          ></textarea>
        </div>

        {/* SECCIÓN 2: PRECIOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <CreditCard size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Precios e Inventario</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="label">Precio BCV ($)</label>
            <div style={{ position: 'relative' }}>
              <input 
                name="price_bcv" type="number" step="0.01" required className="input-field" 
                value={formValues.price_bcv} placeholder="0.00" 
                onChange={handleInputChange}
                style={{ paddingLeft: '2.5rem', borderRadius: '12px' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>$</span>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Precio Cash ($)</label>
            <div style={{ position: 'relative' }}>
              <input 
                name="price_cash" type="number" step="0.01" required className="input-field" 
                value={formValues.price_cash} placeholder="0.00" 
                onChange={handleInputChange}
                style={{ paddingLeft: '2.5rem', borderRadius: '12px', borderColor: 'rgba(242, 135, 5, 0.3)' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)', fontWeight: 700 }}>$</span>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Stock Total</label>
            <input 
              name="stock" type="number" required className="input-field" 
              defaultValue={initialData.stock} placeholder="0"
              style={{ borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* SECCIÓN 3: CATEGORIZACIÓN Y ESTADOS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="label">Categoría Principal</label>
            <select 
              name="category_id" className="input-field" required 
              value={formValues.category_id} onChange={handleInputChange}
              style={{ borderRadius: '12px', cursor: 'pointer' }}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estado del Producto</label>
            <select 
              name="status" className="input-field" 
              value={formValues.status} onChange={handleInputChange}
              style={{ borderRadius: '12px', cursor: 'pointer' }}
            >
              <option value="active">Activo (En Catálogo)</option>
              <option value="draft">Borrador (Oculto)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
            <input 
              name="is_featured" type="checkbox" 
              checked={formValues.is_featured} onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            Best Sellers
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#0477BF' }}>
            <input 
              name="is_new" type="checkbox" 
              checked={formValues.is_new} onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            Nuevo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}>
            <input 
              name="is_promotion" type="checkbox" 
              checked={formValues.is_promotion} onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            En Promoción
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6b7280' }}>
            <input 
              name="is_clearance" type="checkbox" 
              checked={formValues.is_clearance} onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            Liquidación
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#7c3aed' }}>
            <input 
              name="is_coming_soon" type="checkbox" 
              checked={formValues.is_coming_soon} onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            Próximamente
          </label>
        </div>

        <MediaUpload onMediaChange={handleMediaChange} initialMedia={{ images: media.images, video: media.video }} />

        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          paddingTop: '2.5rem', 
          marginTop: '2rem',
          borderTop: '1px solid #f1f5f9' 
        }}>
          <Link href="/products" className="btn-outline" style={{ borderRadius: '14px', padding: '0.8rem 2rem', textDecoration: 'none' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSaving} className="btn-primary" style={{ 
            padding: '0.8rem 2.5rem', 
            borderRadius: '14px', 
            fontWeight: 800,
            boxShadow: '0 10px 20px rgba(4, 119, 191, 0.15)'
          }}>
            {isSaving ? "Guardando..." : (initialData.id ? 'Guardar Cambios' : 'Publicar Producto')}
          </button>
        </div>
      </form>

      {/* PANEL DERECHO: PREVIEW PROFESIONAL */}
      <div style={{ position: 'sticky', top: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 900, fontSize: '0.85rem' }}>
            <Eye size={18} />
            <span>VISTA PREVIA EN VIVO (Toca para girar)</span>
          </div>
        </div>

        <div 
          className={`flip-card-container ${isFlipped ? 'is-flipped' : ''}`}
          onClick={handleFlip}
        >
          <div className="flip-card-inner">
            
            {/* FRONT SIDE (ESTILO MARCA) */}
            <div className="flip-card-front" style={{ 
               background: 'white', 
               borderRadius: '40px', 
               display: 'flex', 
               flexDirection: 'column',
               border: '2px solid rgba(242, 135, 5, 0.2)',
               boxShadow: '0 15px 40px rgba(242, 135, 5, 0.04)',
               overflow: 'hidden'
             }}>
              {/* Media Preview Container */}
              <div 
                className="group-media-preview"
                style={{ 
                  width: '100%', 
                  flex: 1, 
                  minHeight: '200px',
                  background: '#f9fafb', 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid #f3f4f6',
                  overflow: 'hidden'
                }}
              >
                {/* Badges Preview */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {formValues.is_new && (
                    <span style={{ background: '#0477BF', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nuevo</span>
                  )}
                  {formValues.is_promotion && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Promoción</span>
                  )}
                  {formValues.is_clearance && (
                    <span style={{ background: '#1e293b', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Liquidación</span>
                  )}
                  {formValues.is_coming_soon && (
                    <span style={{ background: '#7c3aed', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Próximamente</span>
                  )}
                </div>

                {/* Renderizado de Media (Imágenes / Video) */}
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {mediaList.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        transition: 'opacity 0.5s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: idx === activeIndex ? 1 : 0,
                        zIndex: idx === activeIndex ? 10 : 0,
                        pointerEvents: idx === activeIndex ? 'auto' : 'none'
                      }}
                    >
                      {item.type === 'video' ? (
                        <video 
                          ref={previewVideoRef}
                          src={item.url}
                          muted 
                          playsInline
                          loop
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img 
                          alt={`${formValues.name} - ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          src={item.url}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Flechas de Navegación del Carrusel */}
                {mediaList.length > 1 && (
                  <>
                    <button 
                      type="button"
                      onClick={handlePrev}
                      className="carousel-btn-preview"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.4)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 30,
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      title="Anterior"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                    </button>
                    <button 
                      type="button"
                      onClick={handleNext}
                      className="carousel-btn-preview"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.4)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 30,
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      title="Siguiente"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                    </button>
                  </>
                )}

                {/* Puntos de Navegación del Carrusel (Dots) */}
                {mediaList.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '6px',
                    zIndex: 30,
                    background: 'rgba(0,0,0,0.35)',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    {mediaList.map((item, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={(e) => handleDotClick(e, idx)}
                        style={{
                          height: '6px',
                          borderRadius: '100px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          transition: 'all 0.3s',
                          width: idx === activeIndex ? '16px' : '6px',
                          background: idx === activeIndex ? '#F28705' : 'rgba(255,255,255,0.6)'
                        }}
                        title={item.type === 'video' ? 'Ver Video' : `Ver Imagen ${idx + 1}`}
                      >
                        {item.type === 'video' && idx === activeIndex && (
                          <span style={{ position: 'absolute', fontSize: '6px', fontWeight: 900, color: 'white' }}>▶</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', padding: '1.25rem 1.5rem 1.5rem 1.5rem', height: '170px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                   <div style={{ fontSize: '9px', color: '#0477BF', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{formValues.category_name || "Muebles"}</div>
                </div>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  color: '#111827', 
                  lineHeight: '1.2',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {formValues.name || "Nombre del Producto"}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0477BF', lineHeight: 1 }}>
                      ${getPreviewPrice().toLocaleString()}
                    </span>
                    <span style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ref.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(242, 135, 5, 0.1)' }}>
                   <span style={{ fontSize: '9px', color: '#6b7280', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ver Características</span>
                   <div className="sync-btn-preview" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(242, 135, 5, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F28705', transition: 'all 0.5s' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync_alt</span>
                   </div>
                </div>
              </div>
            </div>

            {/* BACK SIDE (ESTILO MARCA) */}
            <div className="flip-card-back" style={{ 
              background: '#0477BF', 
              color: 'white', 
              borderRadius: '40px', 
              padding: '2.5rem', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
               <div style={{ marginTop: '0.5rem', marginBottom: '1rem', position: 'relative', flexShrink: 0 }}>
                 <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.2)', filter: 'blur(24px)', borderRadius: '50%', transform: 'scale(1.5)' }}></div>
                 <img 
                   src="/logo-p.jpeg" 
                   alt="Practiiko Logo" 
                   style={{ width: '4rem', height: '4rem', objectFit: 'contain', position: 'relative', zIndex: 10, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
                 />
               </div>
               
               <div style={{ flexShrink: 0 }}>
                 <p style={{ fontSize: '9px', fontWeight: 900, opacity: 0.6, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Más información</p>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.75rem 0', lineHeight: 1.2 }}>{formValues.name || "Nombre del Producto"}</h3>
               </div>

               <div className="description-scroll-preview" style={{ flex: 1, width: '100%', margin: '0.75rem 0', overflowY: 'auto', paddingRight: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <p style={{ 
                   fontWeight: 500, 
                   lineHeight: 1.6, 
                   opacity: 0.9, 
                   textAlign: 'center',
                   fontSize: (formValues.description || "").length > 250 
                     ? '0.75rem' 
                     : (formValues.description || "").length > 120 
                       ? '13px' 
                       : '0.875rem'
                 }}>
                   {formValues.description || "Esta pieza exclusiva de Practiiko combina ergonomía de vanguardia con un diseño minimalista pensado para espacios modernos."}
                 </p>
               </div>

               <div style={{ marginTop: '1rem', width: '100%', flexShrink: 0 }}>
                  <div style={{ 
                    padding: '0.65rem', 
                    borderRadius: '100px', 
                    background: '#F28705', 
                    fontSize: '11px', 
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    boxShadow: '0 10px 20px rgba(242, 135, 5, 0.2)',
                    display: 'inline-block',
                    width: 'auto',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    Comprar Ahora
                  </div>
                  <p style={{ fontSize: '8px', opacity: 0.4, margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Toca para volver</p>
               </div>
               
               <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.1, pointerEvents: 'none' }}>
                 <img src="/logo-white.png" alt="" style={{ height: '2.5rem', width: 'auto', filter: 'grayscale(100%)' }} />
               </div>
            </div>

          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .flip-card-container {
          width: 100%;
          height: 520px;
          perspective: 1500px;
          cursor: pointer;
          transition: height 0.7s ease-in-out;
        }

        .flip-card-container.is-flipped {
          height: 600px;
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: left;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          box-shadow: 0 30px 60px rgba(0,0,0,0.1);
          border-radius: 32px;
        }

        .flip-card-container.is-flipped .flip-card-inner {
          transform: rotateY(180deg);
        }

        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 32px;
          overflow: hidden;
        }

        .flip-card-back {
          transform: rotateY(180deg);
          box-shadow: inset 0 0 100px rgba(0,0,0,0.1);
        }

        .carousel-btn-preview {
          opacity: 0;
          transition: all 0.3s ease !important;
        }

        .group-media-preview:hover .carousel-btn-preview {
          opacity: 1;
        }

        .carousel-btn-preview:hover {
          background: rgba(0, 0, 0, 0.7) !important;
          scale: 1.1;
        }

        .flip-card-container:hover .sync-btn-preview {
          background-color: #F28705 !important;
          color: white !important;
        }

        .description-scroll-preview {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
        }
        .description-scroll-preview::-webkit-scrollbar {
          width: 4px;
        }
        .description-scroll-preview::-webkit-scrollbar-track {
          background: transparent;
        }
        .description-scroll-preview::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.25);
          border-radius: 4px;
        }
        .description-scroll-preview::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
