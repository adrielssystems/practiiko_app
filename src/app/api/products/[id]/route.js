import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const productRes = await query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [id]
    );

    if (productRes.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRes.rows[0];

    // Get images
    const imagesRes = await query(
      "SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC",
      [id]
    );

    product.images = imagesRes.rows.map(img => img.url);

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      code,
      slug, 
      description, 
      price_bcv, 
      price_cash,
      category_id, 
      status, 
      stock, 
      images 
    } = body;

    // 1. Update Product
    await query(
      `UPDATE products 
       SET name = $1, code = $2, slug = $3, description = $4, price_bcv = $5, price_cash = $6, category_id = $7, status = $8, stock = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [name, code, slug, description, price_bcv, price_cash, category_id || null, status, stock, id]
    );

    // 2. Update Images
    await query("DELETE FROM product_images WHERE product_id = $1", [id]);

    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await query(
          `INSERT INTO product_images (product_id, url, sort_order, is_main) 
           VALUES ($1, $2, $3, $4)`,
          [id, images[i], i, i === 0]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Eliminar imágenes relacionadas primero (para evitar errores de clave foránea)
    await query("DELETE FROM product_images WHERE product_id = $1", [id]);

    // 2. Eliminar el producto
    await query("DELETE FROM products WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
