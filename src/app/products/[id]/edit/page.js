import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/Products/ProductForm";

async function getProduct(id) {
    try {
        const res = await query("SELECT * FROM products WHERE id = $1", [id]);
        const product = res.rows[0];
        if (product) {
            const imagesRes = await query("SELECT url FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC", [id]);
            product.images = imagesRes.rows.map(r => r.url);
        }
        return product;
    } catch (e) {
        console.error("Error fetching product:", e);
        return null;
    }
}

async function getCategories() {
    try {
        const res = await query("SELECT id, name FROM categories ORDER BY name ASC");
        return res.rows;
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

export default async function EditProductPage({ params }) {
    const { id } = await params;
    const product = await getProduct(id);
    const categories = await getCategories();

    if (!product) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Producto no encontrado</div>;
    }

    async function updateProduct(formData) {
        "use server";
        
        const name = formData.get("name");
        const code = formData.get("code");
        const description = formData.get("description");
        const price_bcv = parseFloat(formData.get("price_bcv") || 0);
        const price_cash = parseFloat(formData.get("price_cash") || 0);
        const stock = parseInt(formData.get("stock") || 0);
        const category_id = formData.get("category_id");
        const status = formData.get("status");
        
        // Datos de medios
        const images = JSON.parse(formData.get("images") || "[]");
        const video_url = formData.get("video_url") || null;

        try {
            // 1. Actualizar datos base
            await query(`
                UPDATE products 
                SET name = $1, code = $2, description = $3, price_bcv = $4, price_cash = $5, stock = $6, category_id = $7, status = $8, video_url = $9
                WHERE id = $10
            `, [name, code, description, price_bcv, price_cash, stock, category_id, status, video_url, id]);

            // 2. Sincronizar imágenes (Borrar y re-insertar para mantener orden)
            await query("DELETE FROM product_images WHERE product_id = $1", [id]);
            
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    await query(`
                        INSERT INTO product_images (product_id, url, is_main, sort_order)
                        VALUES ($1, $2, $3, $4)
                    `, [id, images[i], i === 0, i]);
                }
            }

            revalidatePath("/products");
            revalidatePath(`/products/${id}/edit`);
            return { success: true };
        } catch (e) {
            console.error("Error updating product with media:", e);
            return { success: false, error: e.message };
        }
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ 
                marginBottom: '3rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem' 
            }}>
                <Link 
                    href="/products" 
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: 'var(--muted-foreground)', 
                        textDecoration: 'none', 
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        transition: 'color 0.2s'
                    }}
                >
                    <ArrowLeft size={16} />
                    Volver a la lista de productos
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: 'var(--gradient-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 16px rgba(4, 119, 191, 0.2)'
                    }}>
                        <ArrowLeft size={24} style={{ transform: 'rotate(90deg)' }} />
                    </div>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        fontWeight: 800, 
                        letterSpacing: '-0.02em',
                        color: 'var(--foreground)'
                    }}>
                        Editar <span style={{ color: 'var(--primary)' }}>Producto</span>
                    </h1>
                </div>
            </header>

            <ProductForm categories={categories} initialData={product} onSubmitAction={updateProduct} />
        </div>
    );
}
