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
        const pseudonimo = formData.get("pseudonimo") || null;
        
        // Datos de medios
        const images = JSON.parse(formData.get("images_json") || "[]");
        const video_url = formData.get("video_url") || null;

        // Nuevos campos (parsear strings de FormData)
        const tags = formData.get("tags_json") || "[]";
        const features = formData.get("features_json") || "[]";
        const pricing_matrix = formData.get("pricing_matrix_json") || "[]";
        
        // Campos Experiencia Practiiko
        const technical_summary = formData.get("technical_summary") || null;
        const badge_text = formData.get("badge_text") || null;
        
        // Métricas de Social Proof
        const likes_count = parseInt(formData.get("likes_count") || 0);
        const views_count = parseInt(formData.get("views_count") || 0);
        const sales_count = parseInt(formData.get("sales_count") || 0);
        
         // Manejar checkbox: puede venir como 'on' (nativo) o 'true' (manual)
        const is_featured = formData.get("is_featured") === "on" || String(formData.get("is_featured")) === "true";
        const is_promotion = formData.get("is_promotion") === "on" || String(formData.get("is_promotion")) === "true";
        const is_new = formData.get("is_new") === "on" || String(formData.get("is_new")) === "true";
        const is_clearance = formData.get("is_clearance") === "on" || String(formData.get("is_clearance")) === "true";
        const is_coming_soon = formData.get("is_coming_soon") === "on" || String(formData.get("is_coming_soon")) === "true";
        const show_badge = formData.get("show_badge") === "on" || String(formData.get("show_badge")) === "true";

        const price_valid_until = formData.get("price_valid_until") || null;

        // Interactive Badges and Colors
        const interactive_badges = formData.get("interactive_badges_json") || "[]";
        const colors = formData.get("colors_json") || "[]";

        try {
            const catIdNum = category_id ? parseInt(category_id) : null;
            const stockNum = stock ? parseInt(stock) : 0;

            console.log(`DEBUG: Updating product ${id}`, { images, tags, is_featured, is_coming_soon });

            // 1. Actualizar datos base
            const updateRes = await query(`
                UPDATE products 
                SET name = $1, code = $2, description = $3, price_bcv = $4, price_cash = $5, 
                    stock = $6, category_id = $7, status = $8, video_url = $9,
                    tags = $10, features = $11, pricing_matrix = $12, 
                    is_featured = $13, is_promotion = $14, price_valid_until = $15,
                    pseudonimo = $16, is_new = $17, is_clearance = $18, is_coming_soon = $19,
                    technical_summary = $20, badge_text = $21, show_badge = $22,
                    interactive_badges = $23, likes_count = $24, views_count = $25, sales_count = $26, colors = $27
                WHERE id = $28
                RETURNING id
            `, [
                name, code, description, price_bcv, price_cash, 
                stockNum, catIdNum, status, video_url,
                tags, features, pricing_matrix,
                is_featured, is_promotion, price_valid_until,
                pseudonimo, is_new, is_clearance, is_coming_soon,
                technical_summary, badge_text, show_badge,
                interactive_badges, likes_count, views_count, sales_count, colors, id
            ]);

            if (updateRes.rowCount === 0) {
                return { success: false, error: "No se encontró el producto para actualizar" };
            }

            // 2. Sincronizar imágenes
            await query("DELETE FROM product_images WHERE product_id = $1", [id]);
            
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    await query(`
                        INSERT INTO product_images (product_id, url, is_main, sort_order)
                        VALUES ($1, $2, $3, $4)
                    `, [id, images[i], i === 0, i]);
                }
            }

            // REVALIDACIÓN CRÍTICA
            revalidatePath("/products");
            revalidatePath(`/products/${id}/edit`);
            revalidatePath("/");
            revalidatePath("/catalogo");
            
            return { success: true };
        } catch (e) {
            console.error("Error updating product:", e);
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
