# PRACTIIKO - HISTORIAL DE AVANCES Y MEMORIA PERSISTENTE (FASE ACTUAL)

## 📌 Contexto General del Proyecto
- **Repositorios activos:**
  - `practiiko_app`: Panel administrativo, gestión de productos, webhooks para WhatsApp (YCloud) e Instagram Graph API.
  - `practiiko_web`: Sitio web público de e-commerce y catálogo interactivo (Next.js).
- **Entorno de Producción:** Easypanel con contenedor PostgreSQL (administrable vía DbGate) y servicios Next.js.
- **Historial Previo:** Archivados en `advance_history.md` y `advance_history2.md`.

---

## 🚀 Cambios y Mejoras Recientes (28 de Septiembre de 2026)

### 1. Reestructuración de Categoría a "Velas Perladas"
- **Objetivo comercial:** Reemplazar el nombre genérico "Accesorios para el Hogar" por **"Velas Perladas"**.
- **Base de Datos (PostgreSQL en Easypanel / DbGate):**
  ```sql
  UPDATE categories 
  SET name = 'Velas Perladas', 
      slug = 'velas-perladas' 
  WHERE name ILIKE '%Accesorio%' OR slug ILIKE '%accesorio%';
  ```
- **Web (`practiiko_web/src/app/catalogo/page.js`):**
  - Se actualizó la función `getCategoryOrderIndex` para ordenar prioritariamente la categoría `"Velas Perladas"` (index 3).
  - Admite filtrado tanto por términos de vela como de accesorio para retrocompatibilidad.

### 2. Filtrado Automático por URL en Catálogo Web (`practiiko_web`)
- **Archivos:** `src/app/catalogo/page.js` y `src/components/CatalogClient.jsx`.
- **Funcionamiento:**
  - `CatalogoPage` recibe `searchParams` (`?categoria=velas-perladas`, `?categoria=sofas`, `?categoria=colchones` o ID numérico).
  - `CatalogClient` resuelve la categoría inicial analizando ID, slug o nombre.
  - Al abrirse el enlace, la pestaña correspondiente queda automáticamente seleccionada y filtra los productos de inmediato sin requerir clics del usuario.

### 3. Enrutamiento Contextual desde WhatsApp hacia el Catálogo
- **Archivo:** `practiiko_app/src/app/api/webhooks/whatsapp/route.js`.
- **Funcionamiento:**
  - Cuando el usuario pulsa **"Más Información"** en un carrusel interactivo, el webhook revisa los últimos mensajes de la sesión en base de datos.
  - Si estaba viendo `krrusel_a_v` (Velas) ➔ Envía `https://www.practiiko.com/catalogo?categoria=velas-perladas`.
  - Si estaba viendo `krrusel_a_c` (Colchones) ➔ Envía `https://www.practiiko.com/catalogo?categoria=colchones`.
  - Si estaba viendo `krrusel_a` (Sofás) ➔ Envía `https://www.practiiko.com/catalogo?categoria=sofas`.
  - Consultas generales ➔ Envía el catálogo principal `https://www.practiiko.com/catalogo`.

### 4. Deduplicación y Bloqueo Concurrente en WhatsApp Webhook
- **Incidencia detectada:** YCloud / Meta enviaban webhooks duplicados o el usuario pulsaba botones repetidamente en milisegundos, provocando que se enviaran secuencias duplicadas de Video + Audio + Carrusel.
- **Solución implementada:**
  - **Deduplicación por Message ID:** Se agregó `processedMessageIds` (Map en memoria con TTL de 60 segundos). Si el ID de mensaje ya fue procesado, se descarta con `duplicate_ignored`.
  - **Bloqueo en vuelo (`inFlightUsers`):** Se bloquea el número de teléfono mientras transcurre la secuencia de envíos y delays (6 segundos), evitando que solicitudes concurrentes envíen doble material.

### 5. Optimización de Costos y Control Post-Catálogo
- **Incidencia detectada:** Clientes que escribían expresiones coloquiales venezolanas o agradecimientos como *"ta fino"*, *"gracias"*, *"ok"* tras ver el catálogo provocaban que el bot cayera en el fallback y les reenviara la plantilla de bienvenida `welcome` (plantilla de marketing de Meta que genera cobro innecesario).
- **Solución implementada:**
  - Se añadió la regla **C) Post-Catálogo y Cortesía**: Detecta frases como *"ta fino"*, *"fino"*, *"gracias"*, *"chévere"*, *"bueno"*, *"excelente"*, *"ok"*, *"listo"*, *"me gusta"*, *"bellos"*.
  - En lugar de enviar una plantilla de marketing pagada, envía un mensaje de texto regular amigable:
    > *"¡Nos alegra mucho! 🎉 Si deseas ordenar algún modelo, consultar disponibilidad de colores o tiempos de entrega a tu ciudad, déjanos tu consulta por acá y con gusto uno de nuestros asesores te atenderá de inmediato. ✨"*
  - Marca `requires_human = true` y `ai_enabled = false` para que el equipo de ventas atienda al cliente de forma personalizada.

### 6. Prioridad Absoluta al Primer Contacto (Bienvenida)
- **Incidencia detectada:** Si un cliente nuevo escribía *"Hola más información"*, la palabra clave *"más información"* interceptaba el flujo y enviaba el catálogo en texto antes de que el usuario recibiera el saludo y el menú interactivo.
- **Solución implementada:**
  - El trigger de texto de *"Más Información"* ahora exige estrictamente que el asistente ya le haya respondido antes (`hasAssistantMsg === true`).
  - Todo nuevo cliente (`hasAssistantMsg === false`) o con saludo (*"Hola"*, *"menu"*, etc.) recibe siempre con máxima prioridad la plantilla interactiva de bienvenida `welcome` con su GIF y 3 botones principales.
