import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, Search, Filter, Package, Calendar, Edit } from "lucide-react";
import DeleteProductButton from "@/components/Products/DeleteProductButton";
import ProductFilterBar from "@/components/Products/ProductFilterBar";

async function getCategories() {
  try {
    const res = await query("SELECT id, name FROM categories ORDER BY name ASC");
    return res.rows;
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

async function getProducts(searchQuery, categoryId) {
  try {
    let sql = `
      SELECT p.*, c.name as category_name,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_main DESC, sort_order ASC LIMIT 1) as main_image
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    if (searchQuery) {
      sql += ` AND (p.name ILIKE $${params.length + 1} OR p.code ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1}) `;
      params.push(`%${searchQuery}%`);
    }

    if (categoryId && categoryId !== "all") {
      sql += ` AND p.category_id = $${params.length + 1} `;
      params.push(parseInt(categoryId));
    }
    
    sql += ` ORDER BY p.created_at DESC `;
    
    const res = await query(sql, params);
    return res.rows;
  } catch (e) {
    console.error("Error fetching products:", e);
    return [];
  }
}

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const search = params.search || "";
  const categoryId = params.category || "all";
  
  const [products, categories] = await Promise.all([
    getProducts(search, categoryId),
    getCategories()
  ]);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Productos</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Gestiona el catálogo de productos de tu tienda.</p>
        </div>
        <Link href="/products/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={20} />
          Nuevo Producto
        </Link>
      </header>

      {/* FILTROS Y BÚSQUEDA AUTOMÁTICOS */}
      <ProductFilterBar 
        categories={categories}
        initialCategory={categoryId}
        initialSearch={search}
      />

      <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.02)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Producto</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Categoría</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Precio (BCV)</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Precio (Cash)</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Creado</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Stock</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--muted-foreground)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    No se encontraron productos. {search || categoryId !== 'all' ? 'Prueba con otros filtros.' : 'Comienza creando uno nuevo.'}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row">
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', background: 'var(--muted)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                          {product.main_image ? (
                            <img 
                              src={product.main_image} 
                              alt={product.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                              <Package size={20} />
                            </div>
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{product.code}</span>
                            {product.pseudonimo && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(242, 135, 5, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                {product.pseudonimo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className="badge" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--foreground)' }}>
                        {product.category_name || 'Sin categoría'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>BCV: </span>
                          <strong style={{ color: '#0477BF' }}>${parseFloat(product.price_bcv || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Cash: </span>
                          <strong style={{ color: '#10b981' }}>${parseFloat(product.price_cash || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</strong>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={14} />
                        {new Date(product.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700 }}>
                      <span style={{ color: product.stock <= 0 ? 'var(--destructive)' : 'inherit' }}>
                        {product.stock}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Link href={`/products/${product.id}/edit`} className="nav-link" style={{ padding: '0.5rem' }}>
                          <Edit size={18} />
                        </Link>
                        <DeleteProductButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
