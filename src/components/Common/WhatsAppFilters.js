"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, AlertCircle, X } from "lucide-react";

export default function WhatsAppFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [alertOnly, setAlertOnly] = useState(searchParams.get("alert") === "true");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(search, alertOnly);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, alertOnly]);

  const updateUrl = (q, alert) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (alert) params.set("alert", "true");
    router.push(`/whatsapp?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setAlertOnly(false);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
      <div style={{ 
        position: 'relative', 
        flex: 1, 
        minWidth: '250px',
        maxWidth: '400px'
      }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
        <input 
          type="text" 
          placeholder="Buscar por número..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.5rem',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            outline: 'none',
            fontSize: '0.9rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}
        />
      </div>

      <button 
        onClick={() => setAlertOnly(!alertOnly)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          border: alertOnly ? '1px solid #ef4444' : '1px solid #e9ecef',
          background: alertOnly ? 'rgba(239, 68, 68, 0.1)' : 'white',
          color: alertOnly ? '#ef4444' : '#6c757d',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}
      >
        <AlertCircle size={18} />
        Requiere Asesor
      </button>

      {(search || alertOnly) && (
        <button 
          onClick={clearFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: '#adb5bd',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <X size={14} />
          Limpiar
        </button>
      )}
    </div>
  );
}
