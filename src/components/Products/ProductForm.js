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
import ProductCardPreview from "./ProductCardPreview";

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
    technical_summary: initialData.technical_summary || "",
    badge_text: initialData.badge_text || "",
    show_badge: initialData.show_badge !== undefined ? initialData.show_badge : true,
    likes_count: initialData.likes_count || 0,
    views_count: initialData.views_count || 0,
    sales_count: initialData.sales_count || 0,
    price_valid_until: initialData.price_valid_until ? new Date(initialData.price_valid_until).toISOString().split('T')[0] : ""
  });

  const [interactiveBadges, setInteractiveBadges] = useState(
    initialData.interactive_badges || [
      { title: "Garantía", text: "5 años de garantía sobre defectos estructurales." },
      { title: "Cuidado", text: "Fundas lavables en máquina con agua fría." }
    ]
  );

  const [isFlipped, setIsFlipped] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
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
    
    if (name === "is_featured" || name === "is_promotion" || name === "is_new" || name === "is_clearance" || name === "is_coming_soon" || name === "show_badge") {
        setFormValues(prev => ({ ...prev, [name]: checked }));
    }
    
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
    formData.append("interactive_badges_json", JSON.stringify(interactiveBadges));
    
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
          <label className="label">Descripción Detallada (Gestor Original)</label>
          <textarea 
            name="description" 
            className="input-field" 
            style={{ minHeight: '100px', resize: 'vertical', borderRadius: '12px' }} 
            value={formValues.description} 
            placeholder="Describe materiales, estilo y dimensiones..."
            onChange={handleInputChange}
          ></textarea>
        </div>

        {/* SECCIÓN NUEVA: EXPERIENCIA PRACTIIKO (Copywriting) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Tag size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Textos Experiencia Practiiko</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="label">Resumen Técnico (Debajo del Título)</label>
            <input 
              name="technical_summary" type="text" className="input-field" 
              value={formValues.technical_summary} placeholder="Ej: Espuma de alta densidad / Tela premium" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Texto del Badge Flotante</label>
            <input 
              name="badge_text" type="text" className="input-field" 
              value={formValues.badge_text} placeholder="Ej: Diseño Inteligente: Llega a tu puerta" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <div className="checkbox-wrapper" style={{ margin: 0 }}>
              <input type="checkbox" name="show_badge" checked={formValues.show_badge} onChange={handleInputChange} id="show_badge" />
              <div className="checkbox-custom"></div>
            </div>
            <label htmlFor="show_badge" className="label" style={{ margin: 0, cursor: 'pointer' }}>Activar Medalla Flotante</label>
          </div>
        </div>

        {/* BENEFICIOS INTERACTIVOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', marginTop: '1.5rem' }}>
          <Tag size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Beneficios Interactivos (Garantía, Cuidado, etc.)</h2>
        </div>
        
        {interactiveBadges.map((badge, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'end' }}>
            <div className="form-group">
              <label className="label">Título (Ej: Garantía)</label>
              <input 
                type="text" className="input-field" 
                value={badge.title} 
                onChange={(e) => {
                  const newBadges = [...interactiveBadges];
                  newBadges[idx].title = e.target.value;
                  setInteractiveBadges(newBadges);
                }}
              />
            </div>
            <div className="form-group">
              <label className="label">Descripción</label>
              <input 
                type="text" className="input-field" 
                value={badge.text} 
                onChange={(e) => {
                  const newBadges = [...interactiveBadges];
                  newBadges[idx].text = e.target.value;
                  setInteractiveBadges(newBadges);
                }}
              />
            </div>
            <button 
              type="button" 
              onClick={() => setInteractiveBadges(interactiveBadges.filter((_, i) => i !== idx))}
              style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', padding: '12px', cursor: 'pointer', marginBottom: '0.5rem' }}
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          onClick={() => setInteractiveBadges([...interactiveBadges, { title: "", text: "" }])}
          style={{ background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Añadir Beneficio
        </button>

        {/* SECCIÓN NUEVA: ESTADÍSTICAS (Social Proof) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Eye size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Estadísticas (Social Proof)</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="form-group">
            <label className="label">Cantidad de Vistas</label>
            <input 
              name="views_count" type="number" className="input-field" 
              value={formValues.views_count} placeholder="Ej: 1500" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Cantidad de Likes</label>
            <input 
              name="likes_count" type="number" className="input-field" 
              value={formValues.likes_count} placeholder="Ej: 450" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Cantidad de Ventas</label>
            <input 
              name="sales_count" type="number" className="input-field" 
              value={formValues.sales_count} placeholder="Ej: 45" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
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
            <span>VISTA PREVIA DE TARJETA WEB</span>
          </div>
        </div>

        <ProductCardPreview 
          product={{
            ...formValues,
            images: media.images.length > 0 ? [media.localPreviews[media.images[0]] || media.images[0]] : [],
            main_image: mediaList[0]?.url,
            price_cash: getPreviewPrice(),
            interactive_badges: interactiveBadges,
            likes_count: formValues.likes_count,
            views_count: formValues.views_count,
            sales_count: formValues.sales_count
          }}
        />
      </div>
      
      {/* MODAL DE VISTA PREVIA (PANTALLA COMPLETA) */}
      {isPreviewModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div 
            style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10000, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }} 
            onClick={() => setIsPreviewModalOpen(false)}
          >
            <span className="material-symbols-outlined" style={{ color: 'white' }}>close</span>
          </div>
          <div style={{ width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {mediaList[activeIndex]?.type === 'video' ? (
              <video src={mediaList[activeIndex].url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto' }} />
            ) : (
              <img src={mediaList[activeIndex]?.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto' }} />
            )}
            
            {mediaList.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .flip-card-container {
          width: 100%;
          height: 460px;
          perspective: 1500px;
          cursor: pointer;
          transition: height 0.7s ease-in-out;
        }

        .flip-card-container.is-flipped {
          height: 540px;
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
