"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function ProductFilterBar({ categories, initialCategory, initialSearch }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (value === "all") {
      current.delete("category");
    } else {
      current.set("category", value);
    }
    
    const query = current.toString();
    router.push(`/products${query ? `?${query}` : ""}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const searchVal = formData.get("search");
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (!searchVal) {
      current.delete("search");
    } else {
      current.set("search", searchVal);
    }
    
    const query = current.toString();
    router.push(`/products${query ? `?${query}` : ""}`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
      {/* Selector de Categorías (Auto-filtrado al cambiar) */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '300px' }}>
        <select 
          name="category"
          value={initialCategory}
          onChange={handleCategoryChange}
          className="input-field"
          style={{ width: 'auto', minWidth: '200px', cursor: 'pointer', borderRadius: '12px' }}
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Caja de Búsqueda */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input 
            type="text" 
            name="search"
            defaultValue={initialSearch}
            placeholder="Buscar..." 
            className="input-field" 
            style={{ paddingLeft: '2.5rem', borderRadius: '12px' }}
          />
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: '12px' }}>
          Buscar
        </button>
      </form>
    </div>
  );
}
