"use client";

import { useState, useEffect, useCallback } from "react";
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
  
  // Estados para nuevos campos
  const [tags, setTags] = useState(initialData.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState(
    Array.isArray(initialData.features) ? initialData.features.join(", ") : ""
  );
  const [pricingMatrix, setPricingMatrix] = useState(initialData.pricing_matrix || []);
  
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
    pseudonimo: initialData.pseudonimo || "",
    price_valid_until: initialData.price_valid_until ? new Date(initialData.price_valid_until).toISOString().split('T')[0] : ""
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Actualizar el nombre de la categoría para el preview
  useEffect(() => {
    if (formValues.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === parseInt(formValues.category_id));
      if (cat) setFormValues(prev => ({ ...prev, category_name: cat.name }));
    }
  }, [categories, formValues.category_id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Validación de exclusividad para estados especiales
    const exclusiveFlags = ["is_new", "is_promotion", "is_clearance"];
    if (type === "checkbox" && checked && exclusiveFlags.includes(name)) {
      const activeExclusive = exclusiveFlags.filter(f => f !== name && formValues[f]);
      if (activeExclusive.length > 0) {
        addToast("Solo puedes seleccionar un estado principal (Nuevo, Promoción o Liquidación) a la vez.", "error");
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

  // Helpers para Tags
  const addTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Helpers para Matrix
  const addMatrixRow = () => {
    setPricingMatrix([...pricingMatrix, { variant: "", price: 0 }]);
  };

  const updateMatrixRow = (index, field, value) => {
    const newMatrix = [...pricingMatrix];
    newMatrix[index][field] = field === 'price' ? parseFloat(value) : value;
    setPricingMatrix(newMatrix);
  };

  const removeMatrixRow = (index) => {
    setPricingMatrix(pricingMatrix.filter((_, i) => i !== index));
  };

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
    if (pricingMatrix.length > 0) {
      const matrixPrices = pricingMatrix.map(m => m.price).filter(p => p > 0);
      if (matrixPrices.length > 0) return Math.min(...matrixPrices);
    }
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
        <input type="hidden" name="tags_json" value={JSON.stringify(tags)} />
        <input type="hidden" name="features_json" value={JSON.stringify(featuresInput.split(",").map(f => f.trim()).filter(f => f))} />
        <input type="hidden" name="pricing_matrix_json" value={JSON.stringify(pricingMatrix)} />

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

        {/* SECCIÓN 2: TAGS Y FEATURES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Tag size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Etiquetas y Atributos</h2>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="label">Etiquetas (Ej: Nuevo, Oferta)</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input 
              type="text" className="input-field" 
              value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              placeholder="Escribe y presiona Enter..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              style={{ borderRadius: '12px' }}
            />
            <button type="button" onClick={addTag} className="btn-primary" style={{ padding: '0 1.5rem', borderRadius: '12px' }}>
              <Plus size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {tags.map(tag => (
              <span key={tag} style={{ 
                background: 'rgba(4, 119, 191, 0.05)', 
                color: 'var(--primary)', 
                padding: '0.4rem 0.8rem', 
                borderRadius: '10px', 
                fontSize: '0.75rem', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid rgba(4, 119, 191, 0.1)'
              }}>
                {tag}
                <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
              </span>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="label">Características (separadas por coma)</label>
          <input 
            type="text" className="input-field" 
            value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)}
            placeholder="Ej: Madera de Roble, Tela Anti-manchas, 3 Plazas"
            style={{ borderRadius: '12px' }}
          />
        </div>

        {/* SECCIÓN 3: PRECIOS */}
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

        {/* SECCIÓN 4: MATRIZ DE VARIANTES */}
        <div style={{ marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <label className="label" style={{ fontWeight: 800, marginBottom: '1rem', display: 'block' }}>Variantes de Producto (Medidas / Telas)</label>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.5rem' }}>Variante (Nombre)</th>
                <th style={{ padding: '0.5rem' }}>Precio ($)</th>
                <th style={{ padding: '0.5rem', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {pricingMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.4rem' }}>
                    <input 
                      type="text" className="input-field" value={row.variant} 
                      onChange={(e) => updateMatrixRow(idx, 'variant', e.target.value)}
                      placeholder="Ej: King Size / Tela Velvet"
                      style={{ fontSize: '0.85rem', borderRadius: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '0.4rem' }}>
                    <input 
                      type="number" className="input-field" value={row.price} 
                      onChange={(e) => updateMatrixRow(idx, 'price', e.target.value)}
                      placeholder="0.00"
                      style={{ fontSize: '0.85rem', borderRadius: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '0.4rem' }}>
                    <button type="button" onClick={() => removeMatrixRow(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addMatrixRow} className="btn-outline" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', borderStyle: 'dashed', borderRadius: '12px' }}>
            <Plus size={16} /> Añadir Variante
          </button>
        </div>

        {/* SECCIÓN 5: CATEGORIZACIÓN Y ESTADOS */}
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
            Lo más Vendido
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
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="flip-card-inner">
            
            {/* FRONT SIDE (ESTILO MARCA) */}
            <div className="flip-card-front" style={{ 
              background: '#F28705', 
              borderRadius: '40px', 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              {/* Media Preview Container */}
              <div style={{ 
                width: '100%', 
                aspectRatio: '4/5', 
                background: 'white', 
                borderRadius: '32px', 
                position: 'relative',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}>
                {/* Badges Preview */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {formValues.is_new && (
                    <span style={{ background: '#0477BF', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nuevo</span>
                  )}
                  {formValues.is_promotion && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Promoción</span>
                  )}
                  {formValues.is_clearance && (
                    <span style={{ background: '#1e293b', color: 'white', fontSize: '8px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Liquidación</span>
                  )}
                </div>

                {media.images.length > 0 ? (
                  <img 
                    src={media.localPreviews[media.images[0]] || media.images[0]} 
                    alt="Main" 
                    style={{ width: '85%', height: '85%', objectFit: 'contain' }} 
                  />
                ) : (
                  <div style={{ opacity: 0.2 }}>
                    <Package size={64} color="#000" strokeWidth={1} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                   <div style={{ fontSize: '9px', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{formValues.category_name || "Muebles"}</div>
                </div>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  color: 'white', 
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
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      ${getPreviewPrice().toLocaleString()}
                    </span>
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ref.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                   <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ver Características</span>
                   <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
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
               <div style={{ marginBottom: '1.5rem' }}>
                 <div style={{ 
                   width: '50px', 
                   height: '50px', 
                   background: 'rgba(255,255,255,0.2)', 
                   borderRadius: '50%', 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   marginBottom: '1rem',
                   margin: '0 auto'
                 }}>
                   <Box size={24} />
                 </div>
                 <p style={{ fontSize: '9px', fontWeight: 900, opacity: 0.6, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Más información</p>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{formValues.name}</h3>
               </div>

               <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                 <p style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.6, opacity: 0.9 }}>
                   {formValues.description || "Esta pieza exclusiva de Practiiko combina ergonomía de vanguardia con un diseño minimalista pensado para espacios modernos."}
                 </p>
               </div>

               <div style={{ marginTop: '2rem', width: '100%' }}>
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '100px', 
                    background: '#F28705', 
                    fontSize: '10px', 
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    boxShadow: '0 10px 20px rgba(242, 135, 5, 0.2)'
                  }}>
                    Comprar Ahora
                  </div>
                  <p style={{ fontSize: '8px', opacity: 0.4, marginTop: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Toca para volver</p>
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
      `}</style>
    </div>
  );
}

