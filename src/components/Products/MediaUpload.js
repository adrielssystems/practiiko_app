"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Film, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function MediaUpload({ onMediaChange, initialMedia = { images: [], video: null } }) {
  const { addToast } = useToast();
  const [images, setImages] = useState(initialMedia.images || []);
  const [video, setVideo] = useState(initialMedia.video || null);
  const [localPreviews, setLocalPreviews] = useState({});
  const [localSpecs, setLocalSpecs] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Obtener specs para imágenes existentes (ya subidas al servidor)
  useEffect(() => {
    images.forEach(url => {
      if (!localSpecs[url] && !localPreviews[url]) {
        const img = new window.Image();
        img.onload = async () => {
          let sizeStr = "N/A";
          try {
            const res = await fetch(url, { method: 'HEAD' });
            const bytes = res.headers.get('content-length');
            if (bytes) {
              const kb = bytes / 1024;
              sizeStr = kb > 1024 ? (kb/1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB';
            }
          } catch(e) {}
          
          setLocalSpecs(prev => ({
            ...prev,
            [url]: { w: img.naturalWidth, h: img.naturalHeight, size: sizeStr }
          }));
        };
        img.src = url;
      }
    });
  }, [images, localSpecs, localPreviews]);

  // Limpiar URLs locales al desmontar para evitar fugas de memoria
  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [localPreviews]);

  // Sincronizar con el padre cada vez que cambie algo localmente
  useEffect(() => {
    onMediaChange({ images, video, localPreviews });
  }, [images, video, localPreviews, onMediaChange]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsUploading(true);
    
    for (const file of acceptedFiles) {
      const isVideo = file.type.startsWith('video/');
      
      // Validaciones locales con Toast
      if (isVideo && video) {
        addToast("Solo se permite un video por producto.", "error");
        continue;
      }
      if (!isVideo && images.length >= 5) {
        addToast("Máximo 5 imágenes permitidas.", "error");
        continue;
      }

      // Crear URL local inmediata para preview resiliente
      const localUrl = URL.createObjectURL(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', isVideo ? 'video' : 'image');

      try {
        const res = await fetch('/api/products/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Error en el servidor al subir');
        
        const data = await res.json();

        if (data.url) {
          // Mapear la URL del servidor a la URL local para la preview
          setLocalPreviews(prev => ({ ...prev, [data.url]: localUrl }));

          const kb = file.size / 1024;
          const sizeStr = kb > 1024 ? (kb/1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB';

          if (!isVideo) {
            const img = new window.Image();
            img.onload = () => {
              setLocalSpecs(prev => ({
                ...prev,
                [data.url]: { w: img.naturalWidth, h: img.naturalHeight, size: sizeStr }
              }));
            };
            img.src = localUrl;
          } else {
            setLocalSpecs(prev => ({
              ...prev,
              [data.url]: { size: sizeStr }
            }));
          }

          if (isVideo) {
            setVideo(data.url);
            addToast("Video subido con éxito", "success");
          } else {
            setImages(prev => [...prev, data.url]);
            addToast("Imagen optimizada y subida", "success");
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
        addToast("Error al subir archivo. Verifica tu conexión.", "error");
        URL.revokeObjectURL(localUrl); // Limpiar si falla
      }
    }
    
    setIsUploading(false);
  }, [images, video, addToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov']
    },
    disabled: isUploading
  });

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    addToast("Imagen eliminada", "success");
  };

  const removeVideo = () => {
    setVideo(null);
    addToast("Video eliminado", "success");
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Upload size={18} color="var(--primary)" />
        <label className="label" style={{ margin: 0, display: 'block', fontWeight: 800, fontSize: '0.9rem' }}>Multimedia del Producto</label>
      </div>

      {/* ZONA DE ARRASTRE */}
      <div 
        {...getRootProps()} 
        style={{ 
          width: '100%',
          minHeight: '180px',
          border: `2px dashed ${isDragActive ? 'var(--primary)' : '#e2e8f0'}`,
          borderRadius: '20px',
          background: isDragActive ? 'rgba(4, 119, 191, 0.05)' : '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          padding: '2rem',
          marginBottom: '2rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDragActive ? '0 0 20px rgba(4, 119, 191, 0.1)' : 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          if (!isUploading) e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          if (!isUploading && !isDragActive) e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <input {...getInputProps()} />
        
        {isUploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
              <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>Subiendo y optimizando...</p>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', opacity: isUploading ? 0.3 : 1, transition: 'opacity 0.3s' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(4, 119, 191, 0.05)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: 'var(--primary)'
          }}>
            <Upload size={28} />
          </div>
          <p style={{ fontWeight: 800, margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e293b' }}>Arrastra tus archivos aquí</p>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Soporta imágenes (WebP, JPG) y Video (MP4)</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f1f5f9', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>MAX 5 FOTOS</span>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f1f5f9', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>1 VIDEO</span>
          </div>
        </div>
      </div>

      {/* MINIATURAS (CRÍTICO: Asegurar visualización) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 110px))', gap: '1.25rem' }}>
        
        {images.map((url, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
            <div style={{ 
              width: '110px', 
              height: '110px', 
              position: 'relative', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s',
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
            <img src={localPreviews[url] || url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <button 
              type="button"
              onClick={() => removeImage(index)}
              style={{ 
                position: 'absolute', 
                top: '6px', 
                right: '6px', 
                background: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(4px)',
                border: 'none', 
                borderRadius: '8px', 
                width: '24px', 
                height: '24px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              <X size={14} className="icon-close" />
            </button>
            {index === 0 && (
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                background: 'var(--primary)', 
                color: 'white', 
                fontSize: '9px', 
                textAlign: 'center', 
                padding: '4px 0', 
                fontWeight: 900,
                letterSpacing: '0.05em'
              }}>PORTADA</div>
            )}
            </div>
            
            {localSpecs[url] && (
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                {localSpecs[url].w && <div>{localSpecs[url].w} x {localSpecs[url].h} px</div>}
                <div>{localSpecs[url].size}</div>
              </div>
            )}
          </div>
        ))}

        {video && (
          <div style={{ 
            width: '110px', 
            height: '110px', 
            position: 'relative', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '2px solid #0f172a', 
            background: '#000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <video src={localPreviews[video] || video} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Film size={24} color="white" />
            </div>
            <button 
              type="button"
              onClick={removeVideo}
              style={{ 
                position: 'absolute', 
                top: '6px', 
                right: '6px', 
                background: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(4px)',
                border: 'none', 
                borderRadius: '8px', 
                width: '24px', 
                height: '24px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <X size={14} color="#ef4444" />
            </button>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              background: '#0f172a', 
              color: 'white', 
              fontSize: '9px', 
              textAlign: 'center', 
              padding: '4px 0', 
              fontWeight: 900 
            }}>VIDEO</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .icon-close { color: #ef4444; transition: color 0.2s; }
        button:hover .icon-close { color: white; }
      `}</style>
    </div>
  );
}
