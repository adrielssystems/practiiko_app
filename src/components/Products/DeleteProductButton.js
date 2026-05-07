'use client';

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProductButton({ productId, productName }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${productName}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar el producto");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error de conexión al intentar eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="nav-link" 
      style={{ 
        padding: '0.5rem', 
        border: 'none', 
        background: 'transparent', 
        cursor: isDeleting ? 'not-allowed' : 'pointer', 
        color: 'var(--destructive)',
        opacity: isDeleting ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Eliminar producto"
    >
      <Trash2 size={18} />
    </button>
  );
}
