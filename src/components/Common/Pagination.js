"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ totalPages, currentPage }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage);
    router.push(`?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
      <button 
        onClick={() => handlePageChange(currentPage - 1)} 
        disabled={currentPage <= 1}
        style={{ 
          padding: '0.5rem 1rem', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0', 
          background: currentPage <= 1 ? '#f8fafc' : 'white', 
          color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontWeight: 600,
          transition: 'all 0.2s'
        }}
      >
        <ChevronLeft size={18} /> Anterior
      </button>
      
      <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>
        Página {currentPage} de {totalPages}
      </span>
      
      <button 
        onClick={() => handlePageChange(currentPage + 1)} 
        disabled={currentPage >= totalPages}
        style={{ 
          padding: '0.5rem 1rem', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0', 
          background: currentPage >= totalPages ? '#f8fafc' : 'white', 
          color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontWeight: 600,
          transition: 'all 0.2s'
        }}
      >
        Siguiente <ChevronRight size={18} />
      </button>
    </div>
  );
}
