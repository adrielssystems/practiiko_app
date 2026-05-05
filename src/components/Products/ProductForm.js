"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Eye, Package, Tag, CreditCard, ChevronLeft, LayoutDashboard, Layers, Box } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MediaUpload from "./MediaUpload";
import { useToast } from "@/components/Toast";

export default function ProductForm({ categories, onSubmitAction, initialData = {} }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [media, setMedia] = useState({ 
    images: initialData.images || [], 
    video: initialData.video_url || null 
  });
  
  // Estado para la previsualización en tiempo real
  const [formValues, setFormValues] = useState({
    name: initialData.name || "",
    code: initialData.code || "",
    price_bcv: initialData.price_bcv || "",
    price_cash: initialData.price_cash || "",
    category_name: "",
    description: initialData.description || "",
    status: initialData.status || "active"
  });

  const [isSaving, setIsSaving] = useState(false);

  // Actualizar el nombre de la categoría para el preview
  useEffect(() => {
    if (initialData.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === parseInt(initialData.category_id));
      if (cat) setFormValues(prev => ({ ...prev, category_name: cat.name }));
    }
  }, [categories, initialData.category_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));

    if (name === "category_id") {
      const cat = categories.find(c => c.id === parseInt(value));
      setFormValues(prev => ({ ...prev, category_name: cat ? cat.name : "" }));
    }
  };

  // FIX: Uso de useCallback para evitar el bucle infinito con MediaUpload
  const handleMediaChange = useCallback((newMedia) => {
    setMedia(newMedia);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.target);
    formData.append("images", JSON.stringify(media.images));
    formData.append("video_url", media.video || "");

    try {
      const result = await onSubmitAction(formData);
      
      if (result && result.success) {
        addToast(initialData.id ? "Cambios guardados con éxito" : "Producto creado con éxito", "success");
        // Redirección manual después del éxito
        router.push("/products");
      } else {
        throw new Error(result?.error || "Error desconocido en el servidor");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      addToast("Error al guardar el producto. Revisa los datos.", "error");
      setIsSaving(false);
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 380px', 
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Box size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Información Básica</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="label">Nombre del Producto</label>
            <input 
              name="name" type="text" required className="input-field" 
              defaultValue={initialData.name} placeholder="Ej: Sofá Modular Premium" 
              onChange={handleInputChange}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label className="label">Código (SKU)</label>
            <input 
              name="code" type="text" required className="input-field" 
              defaultValue={initialData.code} placeholder="Ej: SOFA-001" 
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
            style={{ minHeight: '120px', resize: 'vertical', borderRadius: '12px' }} 
            defaultValue={initialData.description} 
            placeholder="Describe las características principales, materiales y estilo..."
            onChange={handleInputChange}
          ></textarea>
        </div>

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
                defaultValue={initialData.price_bcv} placeholder="0.00" 
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
                defaultValue={initialData.price_cash} placeholder="0.00" 
                onChange={handleInputChange}
                style={{ paddingLeft: '2.5rem', borderRadius: '12px', borderColor: 'rgba(242, 135, 5, 0.3)' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)', fontWeight: 700 }}>$</span>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Stock Disponible</label>
            <input 
              name="stock" type="number" required className="input-field" 
              defaultValue={initialData.stock} placeholder="0"
              style={{ borderRadius: '12px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Layers size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Categorización</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="form-group">
            <label className="label">Categoría</label>
            <select 
              name="category_id" className="input-field" required 
              defaultValue={initialData.category_id} onChange={handleInputChange}
              style={{ borderRadius: '12px', cursor: 'pointer' }}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estado de Publicación</label>
            <select 
              name="status" className="input-field" 
              defaultValue={initialData.status}
              style={{ borderRadius: '12px', cursor: 'pointer' }}
              onChange={handleInputChange}
            >
              <option value="active">Activo (Visible)</option>
              <option value="draft">Borrador (Oculto)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem', padding: '2rem', background: 'rgba(4, 119, 191, 0.02)', borderRadius: '20px', border: '1px dashed rgba(4, 119, 191, 0.2)' }}>
          <MediaUpload onMediaChange={handleMediaChange} initialMedia={{ images: media.images, video: media.video }} />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          paddingTop: '2rem', 
          borderTop: '1px solid #f1f5f9' 
        }}>
          <Link href="/products" className="btn-outline" style={{ 
            padding: '0.875rem 2rem', 
            borderRadius: '14px', 
            color: '#64748b', 
            textDecoration: 'none', 
            fontWeight: 700,
            fontSize: '0.9rem',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s'
          }}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSaving} className="btn-primary" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.875rem 2.5rem', 
            borderRadius: '14px', 
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: '0 10px 20px rgba(4, 119, 191, 0.15)'
          }}>
            {isSaving ? (
              <>
                <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{initialData.id ? 'Guardar Cambios' : 'Publicar Producto'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* PANEL DERECHO: PREVIEW (VIEW) */}
      <div style={{ position: 'sticky', top: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1.5rem', 
          padding: '0 0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem' }}>
            <Eye size={18} />
            <span>PREVIEW</span>
          </div>
          <div style={{ 
            padding: '0.4rem 0.75rem', 
            borderRadius: '10px', 
            background: formValues.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            color: formValues.status === 'active' ? '#10b981' : '#64748b',
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            {formValues.status === 'active' ? 'En Vivo' : 'Borrador'}
          </div>
        </div>

        <div className="card" style={{ 
          padding: 0, 
          overflow: 'hidden', 
          background: 'white', 
          borderRadius: '32px', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {/* Imagen de Portada */}
          <div style={{ width: '100%', height: '280px', background: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {media.images.length > 0 ? (
              <img src={media.images[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Package size={56} color="#e2e8f0" strokeWidth={1} />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', fontWeight: 600 }}>Sin imagen principal</p>
              </div>
            )}
            <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {formValues.category_name || "Categoría"}
            </div>
          </div>

          {/* Info del Producto */}
          <div style={{ padding: '2rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{formValues.code || "SKU-PRO-001"}</div>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800, lineHeight: '1.2' }}>{formValues.name || "Nombre del Producto"}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>${formValues.price_bcv || "0.00"}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>(Tasa BCV)</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(4, 119, 191, 0.04)', 
                padding: '0.75rem 1rem', 
                borderRadius: '16px', 
                border: '1px dashed var(--primary)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CreditCard size={16} color="var(--primary)" />
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>${formValues.price_cash || "0.00"}</span>
                </div>
                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Precio Especial</span>
              </div>
            </div>

            <button disabled style={{ 
              width: '100%', 
              marginTop: '2rem', 
              padding: '1rem', 
              borderRadius: '16px', 
              background: '#0f172a', 
              color: 'white', 
              border: 'none', 
              fontWeight: 800, 
              fontSize: '0.9rem', 
              cursor: 'not-allowed',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}>
              Comprar Ahora
            </button>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          borderRadius: '16px', 
          background: 'rgba(242, 135, 5, 0.05)', 
          border: '1px solid rgba(242, 135, 5, 0.1)',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <Tag size={18} color="var(--secondary)" />
          <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
            <strong>Tip Pro:</strong> El precio cash suele ser el mejor gancho para ventas rápidas por WhatsApp.
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
