"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Film, Loader2, Maximize2 } from "lucide-react";
import { useToast } from "@/components/Toast";

function CircularProgress({ progress = 0, size = 54, strokeWidth = 5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(4, 119, 191, 0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>
        {progress}%
      </span>
    </div>
  );
}

export default function MediaUpload({ onMediaChange, initialMedia = { images: [], videos: [] } }) {
  const { addToast } = useToast();
  const [images, setImages] = useState(initialMedia.images || []);
  const [videos, setVideos] = useState(initialMedia.videos || []);
  const [localPreviews, setLocalPreviews] = useState({});
  const [localSpecs, setLocalSpecs] = useState({});
  
  // Estados para barra / círculo de progreso de subida en tiempo real
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingItem, setUploadingItem] = useState(null);

  // Estado para modal de previsualización amplia
  const [expandedMedia, setExpandedMedia] = useState(null);

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

  const localPreviewsRef = useRef(localPreviews);
  useEffect(() => {
    localPreviewsRef.current = localPreviews;
  }, [localPreviews]);

  // Limpiar URLs locales al desmontar para evitar fugas de memoria
  useEffect(() => {
    return () => {
      Object.values(localPreviewsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Sincronizar con el padre cada vez que cambie algo localmente
  useEffect(() => {
    onMediaChange({ images, videos, localPreviews });
  }, [images, videos, localPreviews, onMediaChange]);

  // Función de subida mediante XMLHttpRequest para obtener porcentaje de avance real
  const uploadFileWithProgress = useCallback((file, isVideo, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `/api/products/upload?type=${isVideo ? 'video' : 'image'}&filename=${encodeURIComponent(file.name)}`;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error("Respuesta de servidor inválida"));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || 'Error en el servidor al subir'));
          } catch (e) {
            reject(new Error('Error en el servidor al subir'));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Error de red al subir archivo. Verifica tu conexión."));
      xhr.ontimeout = () => reject(new Error("Tiempo de espera agotado durante la subida."));

      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const isVideo = file.type.startsWith('video/');
      
      // Validaciones locales con Toast
      if (isVideo && videos.length >= 2) {
        addToast("Solo se permiten hasta 2 videos por producto.", "error");
        continue;
      }
      if (!isVideo && images.length >= 10) {
        addToast("Máximo 10 imágenes permitidas.", "error");
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadingItem({ name: file.name, isVideo });

      // Crear URL local inmediata para preview resiliente e instantánea
      const localUrl = URL.createObjectURL(file);

      try {
        const data = await uploadFileWithProgress(file, isVideo, (percent) => {
          setUploadProgress(percent);
        });

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
            setImages(prev => [...prev, data.url]);
            addToast("Imagen optimizada y subida", "success");
          } else {
            setLocalSpecs(prev => ({
              ...prev,
              [data.url]: { size: sizeStr }
            }));
            setVideos(prev => [...prev, data.url]);
            addToast("Video subido con éxito 🎬", "success");
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
        addToast(err.message || "Error al subir archivo.", "error");
        URL.revokeObjectURL(localUrl); // Limpiar si falla
      } finally {
        setIsUploading(false);
        setUploadingItem(null);
        setUploadProgress(0);
      }
    }
  }, [images, videos, addToast, uploadFileWithProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi']
    },
    disabled: isUploading
  });

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    addToast("Imagen eliminada", "success");
  };

  const removeVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
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
        
        {/* OVERLAY DE PROGRESO DE SUBIDA */}
        {isUploading && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'rgba(255,255,255,0.92)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10 
          }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <CircularProgress progress={uploadProgress} size={64} strokeWidth={6} />
              <div>
                <p style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9rem', margin: 0 }}>
                  Subiendo {uploadingItem?.isVideo ? 'Video' : 'Imagen'}...
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
                  {uploadProgress < 100 ? `${uploadProgress}% completado` : 'Procesando en servidor...'}
                </p>
              </div>
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
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Soporta imágenes (WebP, JPG) y Video (MP4, MOV)</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f1f5f9', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>MAX 10 FOTOS</span>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f1f5f9', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>MAX 2 VIDEOS</span>
          </div>
        </div>
      </div>

      {/* MINIATURAS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1.25rem' }}>
        
        {/* CARD PLACEHOLDER DE SUBIDA EN PROGRESO */}
        {isUploading && uploadingItem && (
          <div style={{
            width: '130px',
            height: '130px',
            borderRadius: '16px',
            border: '2px dashed var(--primary)',
            background: 'rgba(4, 119, 191, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(4, 119, 191, 0.1)',
            animation: 'pulse 1.5s infinite'
          }}>
            <CircularProgress progress={uploadProgress} size={48} strokeWidth={4} />
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {uploadingItem.isVideo ? 'SUBIENDO VIDEO' : 'SUBIENDO FOTO'}
            </span>
          </div>
        )}

        {/* IMÁGENES */}
        {images.map((url, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
            <div style={{ 
              width: '130px', 
              height: '130px', 
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
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img src={localPreviews[url] || url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              
              {/* BOTÓN EXPANDIR PREVIEW */}
              <button 
                type="button"
                onClick={() => setExpandedMedia({ type: 'image', url: localPreviews[url] || url })}
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
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
                title="Ampliar vista previa"
              >
                <Maximize2 size={12} color="#0f172a" />
              </button>

              {/* BOTÓN ELIMINAR */}
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
                title="Eliminar imagen"
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

        {/* VIDEOS INTERACTIVOS (REPRODUCTOR COMPLETO Y REPRODUCIBLE DIRECTAMENTE) */}
        {videos.map((vid, index) => {
          const videoSrc = localPreviews[vid] || vid;
          return (
            <div key={`vid-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
              <div style={{ 
                width: '130px', 
                height: '130px', 
                position: 'relative', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '2px solid #0f172a', 
                background: '#000000',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* REPRODUCTOR DE VIDEO HTML5 TOTALMENTE INTERACTIVO */}
                <video 
                  src={videoSrc} 
                  controls 
                  playsInline 
                  preload="metadata"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    backgroundColor: '#000000'
                  }} 
                />

                {/* BOTÓN EXPANDIR PREVIEW COMPLETA */}
                <button 
                  type="button"
                  onClick={() => setExpandedMedia({ type: 'video', url: videoSrc })}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 5
                  }}
                  title="Reproducir en pantalla grande"
                >
                  <Maximize2 size={12} color="white" />
                </button>

                {/* BOTÓN ELIMINAR */}
                <button 
                  type="button"
                  onClick={() => removeVideo(index)}
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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 5
                  }}
                  title="Eliminar video"
                >
                  <X size={14} color="#ef4444" />
                </button>

                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  right: 0, 
                  background: 'rgba(15, 23, 42, 0.9)', 
                  color: 'white', 
                  fontSize: '9px', 
                  textAlign: 'center', 
                  padding: '3px 0', 
                  fontWeight: 900,
                  pointerEvents: 'none',
                  zIndex: 4
                }}>VIDEO {index + 1}</div>
              </div>

              {localSpecs[vid] && (
                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                  <div>{localSpecs[vid].size}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL PREVIEW AMPLIADA DE MEDIA */}
      {expandedMedia && (
        <div 
          onClick={() => setExpandedMedia(null)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 99999, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2rem' 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <button 
              onClick={() => setExpandedMedia(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <X size={20} />
            </button>
            {expandedMedia.type === 'video' ? (
              <video 
                src={expandedMedia.url} 
                controls 
                autoPlay 
                playsInline 
                style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
              />
            ) : (
              <img 
                src={expandedMedia.url} 
                alt="Expanded Preview" 
                style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
              />
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .icon-close { color: #ef4444; transition: color 0.2s; }
        button:hover .icon-close { color: white; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
