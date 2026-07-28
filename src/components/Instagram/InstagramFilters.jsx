"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, AlertCircle, X, Filter } from "lucide-react";

export default function InstagramFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [alertOnly, setAlertOnly] = useState(searchParams.get("alert") === "true");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const initialRender = useRef(true);

  const updateUrl = (q, src, alert, from, to) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (src) params.set("source", src);
    if (alert) params.set("alert", "true");
    if (from) params.set("startDate", from);
    if (to) params.set("endDate", to);
    params.set("page", "1");

    router.push(`/instagram?${params.toString()}`);
  };

  // Debounce solo para la búsqueda por texto (evita peticiones por cada tecla)
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      updateUrl(search, source, alertOnly, startDate, endDate);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Manejadores inmediatos para cambios de controles (select, toggle, fecha)
  const handleSourceChange = (newSource) => {
    setSource(newSource);
    updateUrl(search, newSource, alertOnly, startDate, endDate);
  };

  const handleAlertToggle = () => {
    const newAlert = !alertOnly;
    setAlertOnly(newAlert);
    updateUrl(search, source, newAlert, startDate, endDate);
  };

  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    updateUrl(search, source, alertOnly, newStart, endDate);
  };

  const handleEndDateChange = (newEnd) => {
    setEndDate(newEnd);
    updateUrl(search, source, alertOnly, startDate, newEnd);
  };

  const clearFilters = () => {
    setSearch("");
    setSource("");
    setAlertOnly(false);
    setStartDate("");
    setEndDate("");
    router.push("/instagram");
  };

  const hasActiveFilters = Boolean(search || source || alertOnly || startDate || endDate);

  return (
    <div className="card glass" style={{
      padding: '1.25rem 1.5rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      background: 'white',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      border: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a', fontWeight: 700, fontSize: '0.95rem' }}>
          <Filter size={18} color="var(--primary)" />
          Filtros de Búsqueda
        </div>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.8rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={14} />
            Limpiar Filtros
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* Input de Búsqueda de Usuario / Nombre */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Usuario o nombre..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem 0.65rem 2.4rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              outline: 'none',
              fontSize: '0.875rem',
              color: '#1f2937',
              backgroundColor: '#fafafa'
            }}
          />
        </div>

        {/* Dropdown de Origen (DM vs Comentario) */}
        <div style={{ position: 'relative', width: '100%' }}>
          <select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              outline: 'none',
              fontSize: '0.875rem',
              color: source ? '#1f2937' : '#6b7280',
              backgroundColor: '#fafafa',
              cursor: 'pointer'
            }}
          >
            <option value="">💬 / 📝 Todos los Orígenes</option>
            <option value="dm">💬 Solo Mensajes (DMs)</option>
            <option value="comment">📝 Solo Comentarios</option>
          </select>
        </div>

        {/* Toggle Requiere Asesor */}
        <button 
          onClick={handleAlertToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            border: alertOnly ? '1px solid #ef4444' : '1px solid #e5e7eb',
            background: alertOnly ? 'rgba(239, 68, 68, 0.1)' : '#fafafa',
            color: alertOnly ? '#ef4444' : '#4b5563',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertCircle size={18} />
          {alertOnly ? "🚨 Requiere Asesor" : "Requiere Asesor"}
        </button>

        {/* Selector Rango Fecha Desde */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Desde:</span>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#1f2937',
              backgroundColor: '#fafafa'
            }}
          />
        </div>

        {/* Selector Rango Fecha Hasta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Hasta:</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#1f2937',
              backgroundColor: '#fafafa'
            }}
          />
        </div>
      </div>
    </div>
  );
}
