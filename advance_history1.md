# 🚀 Bitácora de Avances - Practiiko AI (04/05/2026 y 05/05/2026)

## 🛠️ Estabilización Crítica de Catálogo y Persistencia (05/05/2026)

Hoy nos enfocamos en garantizar una arquitectura robusta para la persistencia de datos y el renderizado en vivo del catálogo, eliminando "ghost bugs" en la comunicación entre el formulario, la base de datos y el cliente público.

### 1. Refactorización "A Prueba de Balas" del Formulario
- **Campos Ocultos (Hidden Inputs)**: Se implementaron inputs ocultos dedicados (ej. `images_json`, `tags_json`) para datos complejos. Esto asegura que el 100% de la información (etiquetas, variantes, multimedia) viaje al servidor intacta, incluso con conexiones inestables.
- **Sincronización de Estado React**: Se restauraron los atributos `name` en checkboxes (`is_featured`, `is_promotion`) para recuperar el mapeo del estado visual, implementando lectura dual (`on` / `true`) en las Server Actions.

### 2. Blindaje de Consultas SQL (Server Actions)
- **Alineación de Parámetros**: Se corrigieron las Server Actions de Creación y Edición de productos para incluir todos los campos obligatorios (como `price_valid_until`) y mapear correctamente la cantidad exacta de parámetros `$1...$17`.
- **Inmunidad a Valores Nulos**: Se actualizó `ProductGallery.jsx` con funciones `COALESCE(p.tags, '[]'::jsonb)` previniendo errores 500 en el servidor causados por productos antiguos o campos vacíos al verificar etiquetas como "Best Seller".

### 3. "Túnel de Medios API" (Solución a Imágenes 404 en Standalone)
- **Bypass de Next.js Standalone**: Al estar en Easypanel, Next.js "congela" su carpeta `public` al hacer el *build*. Las imágenes nuevas subidas al volumen persistente daban 404.
- **Ruta Dinámica**: Se creó la API route `/api/media/[...path]/route.js` que utiliza *Web Streams* (`Readable.toWeb(stream)`) para servir imágenes directamente del disco duro en tiempo real.
- **Reescritura Transparente**: Se configuró `next.config.mjs` (rewrites) para redirigir cualquier imagen vieja `/uploads/products/...` al nuevo sistema `/api/media/...`, salvando el inventario actual sin necesidad de resubidas.

### 4. Estabilidad del Lado del Cliente (Landing & Catálogo)
- **Corrección de Referencias**: Eliminado el bug crítico `ReferenceError: filteredProducts is not defined` en `ProductGalleryClient.jsx` asegurando que la landing y la galería se muestren estables.
- **Caché en Tiempo Real**: Se configuró la Landing (`app/page.js`) con `export const dynamic = 'force-dynamic'` garantizando que cualquier cambio de precio o imagen hecho por un administrador se refleje de forma inmediata para el usuario final.

---Hoy se completó una optimización integral del cerebro de la IA y de la interfaz de gestión de productos, elevando el sistema a un nivel de asesoría de lujo y alta conversión.

## 🧠 Optimización del Agente Virtual (`agent.js`)

### 1. Personalización y Tono
- **Regla de Oro de Brevedad**: Implementada la "Brevedad Militar" (máx. 20 palabras, Respuesta + Pregunta corta).
- **Personalización por Nombre**: La IA ahora usa el nombre del cliente detectado para generar cercanía.
- **Eslogan Oficial**: Restaurado el cierre premium: *"Es lujo, es simple, es Practiiko 💎"*.

### 2. Estrategia de Ventas y Precios
- **Gancho Margarita**: Se configuró para dar el `Precio BCV` primero y usar el `Precio Cash` (Divisas/Zelle) como gancho de descuento.
- **Diferenciación Técnica**: Regla estricta para no confundir "Sofá" con "Sofá Cama".
- **Cashea**: Integrada la lógica de cuotas y la **Promoción de Madres** (inicial desde 20%, hasta 12 cuotas).
- **Estandarización**: Sincronizados los nombres de los campos de la DB (`price_bcv`, `price_cash`) con las etiquetas que lee la IA.

### 3. Inteligencia de Origen (Embudo de Ventas)
- **Instagram vs WhatsApp**:
    - **Instagram**: Objetivo de conversión. El bot responde dudas y redirige obligatoriamente al WhatsApp oficial (`wa.me/584248948664`).
    - **WhatsApp**: Objetivo de cierre. Atención detallada y gestión de pedidos.
- **Campaña de Palabras Clave**: Manejo inteligente de palabras como "MAMÁ" para entregar info de producto sin soltar el precio hasta saber la ciudad.

### 4. Robustez de Datos y Entendimiento Contextual (06/05/2026)
- **Memoria LangChain Nativa**: Se reestructuró la inyección del historial. Ahora el bot recibe una cadena real de mensajes (`HumanMessage` y `AIMessage`) en lugar de un bloque de texto estático, lo que aumenta drásticamente su razonamiento y empatía.
- **Búsqueda Multi-Término Estricta**: La base de datos ahora extrae todas las palabras clave del usuario (ej: "sofá" y "azul") y realiza una búsqueda filtrada (`AND`).
- **Anticeguera (Fallback)**: Si no hay coincidencias exactas, el bot recibe automáticamente 20 productos variados para tener siempre opciones que ofrecer y no quedarse "en blanco".
- **Blindaje de Precios por Ubicación**: El bot tiene prohibido físicamente filtrar precios a usuarios fuera de Margarita. Si el cliente no está en la isla, la base de datos inyecta una etiqueta `[OCULTO]` en lugar del precio real, forzando la redirección al asesor humano vía WhatsApp.

### 5. Actitud de Vendedor (Persuasión)
- **Manejo de Objeciones**: Si el cliente pide un color agotado, el bot ya no despacha con un simple "no hay". Ahora aplica persuasión, ofreciendo los colores disponibles y argumentando de forma elegante cómo estos combinan con el espacio aportando lujo.

## 🎨 Mejoras en UI/UX (Panel Administrativo)

### 1. Gestión de Productos
- **Vista de Previsualización (VIEW)**: Refactorización de `ProductForm.js` a un diseño de doble panel. Ahora puedes ver cómo quedará la tarjeta del producto en la Landing Page en tiempo real mientras editas.
- **Media Thumbnails**: Mejoras en la visualización de imágenes cargadas en el formulario.

### 2. Sistema Global
- **Notificaciones (Toasts)**: Se centraron los avisos en la parte superior de la pantalla (`top-center`) para una mejor visibilidad y estética premium.

---
**Estado Actual**: Sistema operativo, estratégico y listo para el despliegue. 💎🚀

## 🛡️ Fortalecimiento de Identidad y Alertas de Venta (15/05/2026)

Hoy hemos unificado la identidad visual entre la web y el panel, además de dotar al sistema de una capacidad de reacción inmediata ante oportunidades de venta.

### 1. Unificación de Marca (Branding)
- **Sincronización de Logo**: Se migró el `logo.webp` oficial de la web al Panel de Autogestión. Se optimizó el CSS del login y la sidebar para eliminar espacios en blanco heredados del logo antiguo, logrando una interfaz más limpia y profesional.
- **Seguridad de Activos**: Se actualizó el `proxy.js` para permitir la entrega del nuevo logo sin intercepciones de autenticación.

### 2. Estándar "Pro Max" en Monitoreo
- **Optimización de Espacios**: Se rediseñó la vista de Monitoreo WhatsApp para usar una cuadrícula dinámica de `minmax(300px, 1fr)`, eliminando las restricciones de ancho (`maxWidth`) anteriores. Ahora el panel aprovecha el 100% de la pantalla, permitiendo supervisar más chats simultáneamente.
- **Consistencia UI**: Se aplicó el mismo estilo de encabezado con iconos en gradiente de Instagram a la sección de WhatsApp.

### 3. Automatización de Alertas Críticas (Ventas & Soporte)
- **Detección de Intenciones (Agent.js)**: 
    - **🔥 Intención de Compra**: El bot ahora identifica automáticamente palabras clave de cierre (pagar, transferencia, quiero el modelo, etc.).
    - **🚨 Solicitud Humana**: Detección proactiva de peticiones de asistencia humana (asesor, persona, hablar con alguien).
- **Flujo de Notificación**: 
    - Al detectar estas intenciones, el bot se pausa automáticamente para ese cliente y marca la conversación como `Requires Human`.
    - Se envían alertas automáticas al administrador principal y se dejó preparada la conexión para grupos de ventas mediante la variable `NOTIFICATIONS_GROUP_ID`.
- **Feedback Visual "Alert-Flash"**: Las tarjetas de los clientes que requieren atención ahora **titilan en rojo neón** en el panel de monitoreo, asegurando que ninguna oportunidad de venta pase desapercibida.

---
**Estado Actual (Anterior)**: Identidad visual unificada y sistema de ventas automatizado con alertas de alta prioridad. 💎🚀

## 🌟 Experiencia Inmersiva de Catálogo, Menú Lateral Retráctil y Optimización del Embudo de Ventas (17/05/2026)

Hoy hemos completado una serie de mejoras críticas de diseño, interactividad de catálogo, optimización de formularios y robustez en la integración de redes sociales para Practiiko.

### 1. Panel de Control Administrativo Premium & Responsive (`practiiko_app`)
- **Menú Lateral Retráctil**: Refactorizamos por completo el diseño de la barra lateral (`Sidebar`) del panel administrativo para hacerla colapsable.
- **Botón Deslizante Flotante**: Diseñamos un botón de alternancia en forma de chevron flotante con estética premium de "vidrio esmerilado" (glassmorphism) y animaciones de resplandor (glow) al pasar el cursor, optimizando el espacio de trabajo en pantallas pequeñas.
- **Ajuste Automático de Layout**: El panel de contenido principal se expande y contrae dinámicamente de forma fluida al colapsar el menú lateral.

### 2. Simplificación del Formulario de Productos (Compatibilidad Asegurada)
- **Eliminación de Campos Redundantes**: Removimos las secciones complejas e innecesarias de "Etiquetas y Atributos", "Características separadas por comas" y la tabla de "Variantes de Producto" del formulario visual ([ProductForm.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/components/Products/ProductForm.js)) para hacer la creación de productos ágil y sencilla.
- **Compatibilidad SQL intacta**: Para evitar migraciones de base de datos o fallos en las Server Actions, inyectamos campos ocultos (`tags_json`, `features_json`, `pricing_matrix_json`) devolviendo arreglos vacíos (`"[]"`), previniendo errores de base de datos sin afectar el backend.

### 3. Carrusel Multimedia Unificado (Imágenes + Auto-reproducción de Video)
- **Storefront E-commerce (`practiiko_web`)**:
    - **Carrusel Multimedios Inteligente**: Refactorizamos [ProductCard.jsx](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_web/src/components/ProductCard.jsx) para integrar hasta 5 imágenes del producto y el video promocional en un solo carrusel unificado.
    - **Autoplay & Pause de Video**: Implementamos un efecto sincronizado con React Refs. El video se auto-reproduce (con mute y loop) instantáneamente al llegar a su diapositiva y se detiene por completo al pasar a otra imagen, garantizando que no haya reproducción fantasma de fondo.
    - **Navegación Táctil e Indicadores**: Añadimos flechas de navegación flotantes y puntos indicadores inteligentes (con ícono de reproducción `▶` para el video).
    - **Protección del Efecto 3D**: Aislamos la propagación de clics (`e.stopPropagation()`) en los controles del carrusel para evitar que al navegar entre imágenes se dispare accidentalmente la rotación 3D de la tarjeta.
    - **Subconsultas de Alto Rendimiento**: Refactorizamos la base de datos en [catalogo/page.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_web/src/app/catalogo/page.js) y [ProductGallery.jsx](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_web/src/components/ProductGallery.jsx) mediante subconsultas `json_agg` en PostgreSQL, cargando todas las imágenes asociadas ordenadas por prioridad en una sola consulta de altísimo rendimiento en lugar de solo la imagen principal.
- **Espejo en Previsualización de Administración (`practiiko_app`)**:
    - Replicamos exactamente la misma lógica de carrusel, reproducción de video automática, indicadores de reproducción, flechas flotantes y protección de eventos en la tarjeta de previsualización interactiva de [ProductForm.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/components/Products/ProductForm.js) del panel de administración. El administrador puede ver de forma idéntica cómo se comportará la multimedia en la web antes de publicar.

### 4. Filtro Inteligente de Productos en Tiempo Real (Panel Administrativo)
- **Filtrado Automático al Instante**: Creamos el componente de cliente [ProductFilterBar.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/components/Products/ProductFilterBar.js), logrando que al seleccionar una categoría el filtro se aplique de manera inmediata y sin recargas toscas de pantalla.
- **Remoción del Botón "Filtrar"**: Eliminamos el botón "Filtrar" por completo, logrando una interfaz limpia de nivel empresarial.
- **Sincronización Bidireccional**: Vinculamos el buscador de texto y el selector de categorías a través de `URLSearchParams`. Ahora puedes buscar términos de texto dentro de una categoría específica sin perder la categoría seleccionada al buscar, o viceversa.

### 5. Blindaje del Asesor de Instagram contra Restricciones de Meta (Bypass WebP)
- **Análisis del Fallo**: Identificamos que Meta (Instagram/Facebook DM) rechaza envíos de imágenes en formato `.webp` con error `100 / Subcode 2534080` (Formato no soportado).
- **Conversión de Imagen en Tiempo Real**: Modificamos la función `sendInstagramImage()` en el Webhook de Instagram ([route.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/app/api/webhooks/instagram/route.js)) para renombrar extensiones `.webp` a `.jpeg` al vuelo al enviar DMs.
- **Servicio de Medios Dinámico**: Al solicitar el archivo `.jpeg`, nuestro servicio de entrega multimedia `/api/media/...` utiliza de forma transparente la librería Sharp para compilar el WebP original en un búfer JPEG de alta calidad en milisegundos.
- **Flujo de WhatsApp Intacto**: Este parche actúa únicamente sobre Instagram, preservando el flujo directo de WebP original en WhatsApp para mayor rapidez y ahorro de ancho de banda.

---
**Estado Actual**: Sistema administrativo altamente optimizado, catálogo multimedia interactivo y enriquecido con video autoplay, y automatización en Instagram y WhatsApp blindada y lista para la acción. 💎🚀

## 🤖 Descubrimiento Guiado y Auto-Takeover de Asesores (04/06/2026)

Hoy revolucionamos la forma en que la IA atiende a clientes indecisos y logramos una sincronización perfecta entre el bot y los asesores humanos en tiempo real.

### 1. Sistema de Descubrimiento Guiado (Guided Discovery)
- **Proactividad Comercial**: Se modificaron los cerebros de WhatsApp e Instagram (`prompts.js`). Cuando un cliente pide "precios" sin saber qué quiere, el bot ya no se limita a enviar el catálogo y esperar. Ahora asume el control haciendo una **pregunta de sondeo** (ej. *"¿estás buscando algo en particular como un sofá, un sofá cama o un colchón?"*).
- **Flexibilidad del Guardrail**: Se relajaron los sistemas Anti-Bucle (`instagramAgent.js`, `whatsappAgent.js`). Si el cliente responde a la guía de la IA (ej. dice "busco un sofá"), la IA busca en el inventario y muestra opciones sin disparar la transferencia a un humano por error. La transferencia solo ocurre si hay verdadera frustración o ceguera por parte del cliente.

### 2. Auto-Takeover Humano y Sincronización de Ecos (Webhooks)
- **Captura de Mensajes Salientes**: Los webhooks de Evolution API (WhatsApp) y Meta Graph API (Instagram) fueron reescritos para procesar los "ecos" (`fromMe` y `is_echo`).
- **Visibilidad Total en el Panel**: Ahora, cualquier mensaje que un asesor humano envíe desde su celular o PC (usando WhatsApp Business o Instagram DMs) se captura inmediatamente y se guarda en la base de datos con `role: assistant`. Las respuestas del equipo humano ya son 100% visibles en el Dashboard de Practiiko.
- **Pausa Automática Inteligente**: El sistema distingue entre un mensaje de la IA y uno de un humano (verificando marcas de tiempo exactas). Si detecta que un humano intervino, **apaga automáticamente la IA** (`ai_enabled = false`) para ese cliente, cediendo el control total al asesor sin que el bot interrumpa la venta.

### 3. Reactividad de Interfaz (Frontend)
- **Sincronización del Botón Pausa/Play**: Se mejoró el componente `BotPauseToggle.js` con un `useEffect` para escuchar cambios del servidor. Ahora, cuando el Auto-Takeover pausa al bot en segundo plano, el botón del dashboard cambia visualmente a "Pausa" en tiempo real sin requerir interacción manual.
- **Simulador de Instagram Mejorado**: Se añadió un botón de **"Nuevo Chat"** en el `BotSimulator.js` que se comunica con una nueva ruta backend (`delete-chat/route.js`) para purgar el historial de la base de datos, permitiendo realizar pruebas limpias y rápidas.

---
**Estado Actual (Anterior)**: Asistente proactivo con embudo de ventas conversacional guiado. Ecosistema híbrido IA/Humano operando en perfecta sincronía sin colisiones. 💎🚀

## 🚨 Alertas de WhatsApp para Transferencias de Instagram (15/06/2026)

Hoy hemos unificado el sistema de alertas de derivación para que los asesores reciban notificaciones en su canal de WhatsApp cuando ocurra una transferencia de control en los chats de Instagram, cerrando la brecha con el flujo ya existente en WhatsApp.

### 1. Notificación Unificada vía Evolution API
- **Reutilización de Credenciales**: Implementamos el uso de las variables de entorno de WhatsApp (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `NOTIFICATIONS_GROUP_ID`) dentro de `instagramAgent.js`.
- **Estructura del Mensaje de Alerta**: Cuando un bot de Instagram se pausa (por guardrail anti-bucle, petición explícita del cliente o comando `[TRANSFER]` de la IA), se envía una notificación detallada a WhatsApp:
  - Canal: `INSTAGRAM`.
  - Cliente: Nombre y `@username` del usuario (consultado en base de datos desde la tabla `instagram_customers`).
  - Mensaje exacto de entrada que causó la derivación.
  - Enlaces directos: Acceso al chat en el panel de control (`[baseUrl]/instagram/[sessionId]`) y enlace al perfil de Instagram del usuario.

### 2. Optimización en el Simulador de Pruebas (test-bot)
- **Bypass de Url Base**: Modificamos el endpoint del simulador (`src/app/api/test-bot/route.js`) para capturar el protocolo y host (`baseUrl`) desde los headers de la petición HTTP. De esta forma, las pruebas hechas desde el simulador de chat en el panel también generan alertas con enlaces directos correctos (sea en local o producción).

---
**Estado Actual**: Canal de Instagram totalmente integrado con el sistema de alertas de WhatsApp. Asistentes notificados al instante sobre derivaciones en ambos canales. 💎🚀
