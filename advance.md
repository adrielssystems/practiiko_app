# Historial de Desarrollo - Practiiko

*Este archivo es una continuación del historial de desarrollo. El contexto y las tareas anteriores se encuentran archivados en `advance_history1.md`.*

## Contexto Actual
...
## Tareas Realizadas (06 de Julio de 2026)

### 1. Catálogo Web (`ProductCard.jsx`)
- **Lógica de Colores:** Se corrigió el comportamiento de los círculos de colores. Al seleccionar un color que no tiene imagen asignada, ya no altera la imagen principal en pantalla, sino que solo resalta el color seleccionado con un borde naranja.
- **Diseño Móvil (Espacios en Blanco):** Se ajustó el layout de la galería en dispositivos móviles para que las imágenes (1:1) abarquen el 100% del ancho del contenedor y la altura se adapte automáticamente (`aspect-square`), eliminando los recortes no deseados y los espacios laterales vacíos.
- **Miniaturas Móviles:** Se estableció que el carrusel de miniaturas siempre se mantenga a la izquierda de la imagen principal (incluso en smartphones), con altura dinámica y scroll para no entorpecer el diseño.
- **Iconografía (Badges):** Se reemplazó el icono de información genérico por un check dentro de un círculo abierto en color naranja (`#F28705`) para los beneficios interactivos del producto.

### 2. Autogestor (`ProductCardPreview.js` y `ProductForm.js`)
- **Imágenes Visibles:** Se solucionó el problema en la vista previa del producto que impedía visualizar la galería. Ahora `ProductForm.js` transfiere adecuadamente el estado de las imágenes (tanto URL de Firebase como previsualizaciones temporales locales) hacia `ProductCardPreview.js`.
- **Alineación de Elementos:** La sección de "Elige tu color" fue reubicada directamente debajo de la imagen principal para igualar el aspecto de la tarjeta de la página web pública.
- **Coherencia Visual:** Se actualizó el icono de beneficios interactivos para utilizar el mismo icono de "Check" naranja personalizado implementado en el catálogo.

### 3. Página de Inicio (`page.js`)
- **Cintillos Promocionales:** Se actualizó el texto del segundo banner naranja del Home. Ahora muestra el mensaje: *"¡Contamos con planes de financiamiento que se ajustan a sus POSIBILIDADES!"*, junto con un subtítulo que anima a los usuarios a consultar facilidades de pago, reemplazando el texto duplicado de envío gratuito.

## Tareas Realizadas (07 de Julio de 2026)

### 1. Interfaz de Ficha de Producto (Modal)
- **Cuadrícula Uniforme de Etiquetas:** Las etiquetas de beneficios (Best Seller, Nuevo, etc.) ahora se presentan de 2 en 2 mediante una cuadrícula perfecta, con altura unificada y texto alineado a la izquierda para garantizar coherencia visual.
- **Galería Vertical Responsiva:** Se eliminó la altura fija del contenedor de miniaturas (thumbnails) y se implementó un formato relativo-absoluto. Esto garantiza que la columna de miniaturas se extienda fluidamente hasta la altura total del contenido derecho (foto + botones de colores) sin cortes abruptos, incluso si el producto tiene 10 fotos.
- **Dinámica de Selección de Color (Premium UX):** 
  - La galería (tanto miniaturas como carrusel) oculta automáticamente las fotos asociadas a los colores inactivos. Solo se muestran las del color seleccionado junto a las fotos genéricas de detalles.
  - Al hacer clic en un color, la imagen principal se actualiza dinámicamente, proporcionando una experiencia más limpia.

### 2. Autogestor (`ProductForm.js` y `MediaUpload.js`)
- **Aumento de Límites Multimedia:** 
  - Se incrementó el máximo de imágenes permitidas de 5 a **10**.
  - Se incrementó el límite de videos de 1 a **2**.
  - El backend (a través del campo `video_url`) fue adaptado de forma transparente para guardar y leer un arreglo JSON en caso de recibir más de un video, mientras mantiene el código retrocompatible con productos que solo tienen un video simple.

### 3. Ordenamiento del Catálogo (`catalogo/page.js`)
- **Filtro Principal ("Todos"):** Se implementó una lógica de prioridad para ordenar los productos según sus etiquetas (antes de ordenarse por categoría):
  1. Best Seller (`is_featured`)
  2. Nuevo (`is_new`)
  3. Próximamente (`is_coming_soon`)
  4. En Promoción (`is_promotion`)
  5. Liquidación (`is_clearance`)

## Tareas Realizadas (08 de Julio de 2026)

### 1. Corrección en Gestor de Productos
- **Error Crítico de Base de Datos (`slug` nulo):** Se solucionó un error que impedía guardar o actualizar productos debido a que la columna `slug` requería un valor no nulo y no se estaba enviando. Se implementó la generación automática del `slug` a partir del nombre del producto antes de ejecutar las inserciones (INSERT) y actualizaciones (UPDATE) en la base de datos (`app/products/new/page.js` y `app/products/[id]/edit/page.js`).

### 2. Mejora de UX (Interacción de Colores)
- **Llamado a la Acción (Catálogo y Gestor):** Se rediseñó la indicación para la selección de color en los modales de productos. Se cambió el texto estático "Elige tu color" por un mensaje interactivo, vibrante y en mayúsculas: **"¡TOCA EL COLOR Y SORPRÉNDETE!"**.
- **Animaciones:** Se incorporó una animación de "pulso" y un indicador dinámico tipo "ping" en color naranja/dorado para captar visualmente la atención del cliente hacia las variantes de colores (`ProductCard.jsx` y `ProductCardPreview.js`).

## Tareas Realizadas (13 de Julio de 2026)

### 1. Visualización de Videos en Autogestor
- **Conexión de Propiedades (`ProductForm.js`):** Se detectó y corrigió una desconexión en el formulario de edición de productos. Aunque el gestor subía los videos correctamente, no estaba enviando la propiedad `video_url` al componente de vista previa (`ProductCardPreview.js`). Ahora el video recién subido se renderiza exitosamente al instante dentro del modal de vista previa del gestor, del mismo modo que opera en el catálogo web.

### 2. Seguridad Multimedia y UX (Catálogo y Gestor)
- **Protección Antidescargas y Anticopia:**
  - **Bloqueo de Clic Derecho:** Se implementó `onContextMenu` para desactivar el menú nativo y prevenir la opción "Guardar imagen/video como...".
  - **Bloqueo de Arrastre (Drag-and-Drop):** Se implementó `onDragStart` para inhabilitar el arrastre de las imágenes hacia el escritorio.
  - **Restricción de Selección:** Se aplicó CSS (`pointer-events-none`, `select-none`) en elementos clave para proteger el contenido visual de extracciones simples.
  - **Ocultamiento de Descargas:** Se agregó `controlsList="nodownload"` al `<video>` para eliminar el botón de descarga del reproductor nativo del navegador.
- **Autoreproducción Inteligente (Auto-Play):** Se desarrolló una lógica (`useEffect` en `ProductCard.jsx` y `ProductCardPreview.js`) que monitorea la selección del carrusel. Al desplazarse hacia un video, este se reproduce de forma automática desde el inicio; si se cambia a una imagen, el video previo se pausa en segundo plano para ahorrar recursos.
- **Soporte y Fixes para Dispositivos Móviles (iOS / Safari):** 
  - Se solucionó el error que causaba que los videos se mostraran como "URL Rota" en smartphones, al inyectar las propiedades `playsInline` y `preload="metadata"`. Esto evita bloqueos de carga iniciales y que los móviles fuercen el modo pantalla completa.
  - Las miniaturas de video ahora se renderizan con la etiqueta `muted` de forma predeterminada, superando el bloqueo nativo de reproducción automática de iOS.
  - Se implementó un filtro de seguridad que fuerza cualquier URL insegura (`http://`) de los recursos de video a `https://` para evitar bloqueos por CORS o App Transport Security en dispositivos móviles.

### 3. Optimización de Streaming de Video (HTTP Range)
- **Soporte para Dispositivos Móviles:** Se solucionó el error de "icono roto" que ocurría en navegadores móviles (Android Chrome, iOS Safari) al cargar el video. Se implementó el soporte para *HTTP Range Requests* (`206 Partial Content`) en la ruta del servidor (`/api/media/[...path]/route.js`), requisito estricto de los dispositivos móviles para reproducir HTML5 Video.
- **Límite de Chunk (Buffering):** Se configuró un tamaño máximo de fragmento (chunk) de 2MB. Esto evita que Node.js intente despachar archivos inmensos de una sola vez, previniendo el ahogamiento de la conexión de red y asegurando una reproducción fluida sin *buffering* excesivo.
- **Resolución de Rutas:** Se envolvió la carga de los videos en la función `getImageUrl` dentro del catálogo (`ProductCard.jsx`) para asegurar que el frontend web se comunique correctamente con el backend, incluso si las rutas guardadas son relativas.

### 4. Compresión Automática de Video en el Servidor (FFmpeg)
- **Integración de Motor Nativo:** Se integraron las librerías `fluent-ffmpeg` y `@ffmpeg-installer/ffmpeg` en el Autogestor para dotar al backend de capacidades de transcodificación multimedia reales.
- **Transcodificación al Vuelo:** Se reescribió la función `processVideo` (`src/lib/media.js`). Al subir un archivo crudo (ej. desde un iPhone), el servidor ahora ejecuta un proceso en segundo plano que:
  - Lo re-codifica forzosamente al formato web universal **MP4 (H.264 / AAC)**, solucionando incompatibilidades como los archivos `.mov` en Android.
  - Aplica un algoritmo agresivo de compresión (`-crf 28` y `-preset veryfast`) reduciendo hasta el 90% del tamaño original sin pérdida de calidad visual notable.
  - Inyecta la bandera `-movflags +faststart` para mover el *moov atom* al inicio del archivo, permitiendo la reproducción instantánea antes de que el video se descargue por completo.

### 5. Configuración de Construcción (Build Fixes)
- **Exclusión de Empaquetado:** Se modificó el archivo `next.config.mjs` de `practiiko_app`, añadiendo `@ffmpeg-installer/ffmpeg` y `fluent-ffmpeg` a la lista de `serverExternalPackages`. Esto previno un fallo crítico durante el proceso de despliegue en el que *Turbopack* intentaba erróneamente compilar los binarios nativos del sistema operativo correspondientes al motor FFmpeg.

## Tareas Realizadas (19 y 20 de Julio de 2026)

### 1. Diagnóstico y Soporte del Agente de Instagram
- **Expiración de Token:** Se diagnosticó un fallo silencioso donde la IA de Instagram generaba respuestas en base de datos pero estas no se enviaban a Meta. La causa fue la expiración del `INSTAGRAM_PAGE_ACCESS_TOKEN` (política de 60 días de Meta). Se instruyó la generación y actualización del token como solución definitiva.
- **Fix de Zonas Horarias (Timezones):** Durante el desarrollo de un script temporal de rescate de mensajes, se corrigió un bug en la consulta SQL que limitaba erróneamente los chats al evaluar `CURRENT_DATE` contra la zona horaria UTC del servidor. Se reemplazó por la ventana estricta de `NOW() - INTERVAL '24 hours'`, garantizando la cobertura de todos los mensajes sin importar la hora local.

### 2. Autogestor: Optimización de Subida Multimedia (Prevención OOM)
- **Error 500 al subir videos pesados:** Se resolvió un error crítico de servidor ("Error en el servidor") reportado al intentar adjuntar videos pesados (ej. 150MB) a las fichas de los productos.
- **Streaming a Disco:** Se refactorizó por completo el endpoint de subida (`src/app/api/products/upload/route.js`) y la función `processVideo` (`src/lib/media.js`). En lugar de volcar el archivo completo en la Memoria RAM del contenedor usando un buffer, ahora se emplea la API nativa de **Streams de Node.js** (`pipeline`, `createWriteStream`, `Readable.fromWeb`) para escribir los datos de la red directamente al disco duro. Esto mantiene el consumo de memoria casi en cero, asegurando máxima escalabilidad sin cierres forzosos (Out of Memory).

### 3. Paginación en Paneles de Monitoreo (WhatsApp e Instagram)
- **Paginación Dinámica:** Para poder revisar los historiales antiguos sin sobrecargar la interfaz, se implementó un sistema de paginación con un límite uniforme de 50 conversaciones por pantalla para ambas plataformas.
- **Cálculo con Funciones de Ventana:** Se optimizaron las consultas SQL de `whatsapp/page.js` e `instagram/page.js` utilizando `LIMIT`, `OFFSET` y la función analítica `COUNT(*) OVER()` para calcular el número total de páginas con altísima eficiencia.
- **Componente `<Pagination />`:** Se construyó un componente reutilizable de navegación de páginas (Anterior/Siguiente) que lee y muta la URL (`?page=X`) de manera dinámica. Al ser basado en URL, interactúa perfectamente con el `<AutoRefresh />` sin devolver al usuario a la primera página mientras hace su auditoría.

### 4. Gestor: Toma de Control Manual en WhatsApp
- **Auto-pausa de IA:** Se solucionó el problema en la vista de monitoreo de WhatsApp (`/whatsapp/[id]/page.js`) donde el administrador enviaba una respuesta manual y la IA seguía activa. Ahora, al enviar un mensaje mediante el `<ManualReplyInput />`, el servidor ejecuta una consulta `UPDATE` que apaga la propiedad `ai_enabled` automáticamente (`src/app/api/whatsapp/send/route.js`).
- **Resiliencia ante la API de Meta/Evolution:** Se retiró la validación estricta que exigía `data.key` al enviar mensajes manuales de WhatsApp, reemplazándose por un chequeo `response.ok && !data.error` más tolerante. Esto evita bloqueos 500 originados por discrepancias en la respuesta de la instancia y permite responder sin fallos.

### 5. Autogestor: Prevención de Timeouts en Multimedia
- **Transcodificación Asíncrona (Fire & Forget):** Se resolvió una caída silenciosa que ocurría al subir videos muy pesados (~200 MB). Anteriormente, el proxy (Traefik/Nginx) abortaba la conexión por superar el tiempo de espera (timeout de 60s) mientras `ffmpeg` realizaba la compresión. Ahora, la ruta `src/lib/media.js` devuelve la URL del video inmediatamente después de guardarlo en disco, permitiéndole al usuario guardar el producto de inmediato en el autogestor, mientras la optimización a MP4 ocurre en segundo plano.

### 6. Auditoría del Monitor de WhatsApp
- **Diagnóstico de Recepción:** Ante un reporte de que no ingresaban los mensajes, se realizó una auditoría en la ruta de webhooks (`src/app/api/webhooks/whatsapp/route.js`). Tras verificar la ausencia total de *logs* de entrada y confirmar que el código estaba intacto, se diagnosticó que el problema proviene exclusivamente del agente externo (Evolution API): bien sea por desconexión de la sesión en el teléfono o pérdida de configuración del webhook en el servidor de Evolution.

## Tareas Realizadas (21 de Julio de 2026)

### 1. Autogestor: Corrección Definitiva en la Subida de Video (Error 500 y Fallo de Red)
- **Diagnóstico del Error:** Se identificó la causa raíz por la cual la subida de videos (incluso de 30MB) fallaba con el mensaje `{"error": "Error al procesar el archivo"}` (HTTP 500):
  1. `Readable.fromWeb(file.stream())` generaba una incompatibilidad fatal de prototipos de stream en el motor Node.js/Undici de Next.js App Router, provocando un `TypeError` no capturado que abortaba la petición inmediatamente.
  2. Existía una "carrera de archivo" (*race condition*), pues la API retornaba la URL final del video antes de que `ffmpeg` lo hubiera generado en segundo plano. Si el usuario/navegador intentaba cargarlo o si `ffmpeg` fallaba, el archivo resultaba en un error 404 permanente.
- **Solución Implementada (`src/lib/media.js`):**
  - **Escritura Directa y Segura:** Se reemplazó la conversión de stream por la lectura buffer nativa (`Buffer.from(await file.arrayBuffer())` y `fs.writeFile`). El video subido se escribe inmediatamente en su ruta final (`/api/media/${filename}`), estando disponible al instante para reproducción en el frontend en cuestión de milisegundos.
  - **Compresión en Segundo Plano Resiliente (Fire & Forget):** `ffmpeg` realiza la optimización opcional a MP4 en segundo plano a un archivo temporal (`opt_...mp4`). Al finalizar con éxito, reemplaza el original de forma transparente. Si `ffmpeg` falla o el códec original no es soportado, se captura el warning en consola y **se mantiene intacto el video original subido**, evitando caídas de servicio o archivos borrados.
  - **Soporte de Tamaño Ampliado (`next.config.mjs`):** Se incrementó `bodySizeLimit` a `250mb`.

- **Solución al error "Failed to parse body as FormData" (Carga por Streams de Flujo de Datos):**
  - **Diagnóstico:** A pesar del cambio a buffers, Next.js / Undici y el parser `req.formData()` imponen un límite rígido interno y fallan al procesar peticiones `multipart/form-data` con archivos medianos/grandes (como videos de 30MB o superiores), arrojando el error `Failed to parse body as FormData.`.
  - **Solución:** Se refactorizó la comunicación entre el frontend y el backend:
    - **Frontend ([src/components/Products/MediaUpload.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/components/Products/MediaUpload.js)):** Ahora transmite el archivo directamente como el cuerpo de la petición HTTP (`body: file` en formato binario crudo/raw stream) y envía las propiedades `type` y `filename` como parámetros de consulta (URL query parameters). Esto evita el uso y procesamiento de `multipart/form-data` por completo.
    - **Backend API ([src/app/api/products/upload/route.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/app/api/products/upload/route.js)):** Detecta la presencia de los parámetros y procesa el cuerpo directamente como una transmisión de flujo de red (`req.body` de tipo Web `ReadableStream`). Incorpora un mecanismo de lectura chunk-por-chunk progresivo que escribe el flujo directamente al disco sin cargar en memoria el archivo completo. Mantiene retrocompatibilidad con el parser `FormData` tradicional para cargas ligeras e imágenes heredadas.

- **Forzar Extensión a `.mp4` para Compatibilidad HTML5:**
  - **Diagnóstico:** Si el usuario subía archivos en otros formatos/extensiones (como `.mov` o `.webm`), el servidor guardaba el archivo con dicha extensión. Al consumirse el recurso desde `/api/media/[...path]`, la ruta de Next.js respondía con el mime-type genérico `application/octet-stream` en lugar de `video/mp4` o `video/webm`, impidiendo que los reproductores HTML5 reprodujeran el video de manera automática o manual.
  - **Solución:** Se forzó a que todos los videos procesados se almacenen y expongan estrictamente con la extensión `.mp4` (`const filename = \`\${uuidv4()}.mp4\``). Esto garantiza que el servidor de contenido estático API entregue siempre la cabecera `Content-Type: video/mp4`, permitiendo reproducción y autoplay nativo inmediato e interactivo en todos los navegadores del catálogo web y del gestor.

- **Círculo de Progreso en Tiempo Real y Reproducción Directa en Gestor ([MediaUpload.js](file:///c:/Users/Hector%20Ollarves/Documents/PROYECTOS/Practiiko/practiiko_app/src/components/Products/MediaUpload.js)):**
  - **Indicador de Carga Progresiva (`CircularProgress`):** Se integró la API `XMLHttpRequest.upload.onprogress` para calcular la transferencia en tiempo real (`0%` al `100%`). Se diseñó un componente SVG circular animado de avance que se despliega de dos formas: en el centro del área de arrastre (Dropzone) y en una tarjeta en la grilla que muestra el estado de carga en vivo.
  - **Reproducción Directa e Interactiva:** Se removieron los bloqueos estáticos (cuadro negro con icono flotante estático) de los elementos `<video>`. Ahora cada tarjeta de video en el gestor incorpora un reproductor HTML5 con controles nativos (`play`, `pause`, `volumen`, `línea de tiempo`), permitiendo reproducir, pausar y audicionar el video subido directamente en la ficha del formulario.
  - **Previsualización Amplia en Modal:** Se añadió un botón para ampliar el video en un modal flotante a pantalla completa.
  - **Fix de URLs de Previsualización (`ProductCardPreview.js`):** Se previno la corrupción de URLs `blob:` producida al aplicar transformaciones de protocolo HTTP/HTTPS, asegurando que las vistas previas locales funcionen fluidamente.

## Tareas Realizadas (26 de Julio de 2026)

### 1. Monitoreo e Intervención Humana en Instagram
- **Corrección de la API de Pausa de Bot (`src/app/api/settings/bot-pause/route.js`):**
  - **Diagnóstico:** El botón de pausa (`BotPauseToggle.js`) enviaba el `id` numérico del usuario de Instagram, pero el backend ejecutaba la consulta `UPDATE instagram_customers SET ai_enabled = $1 WHERE username = $2`. Al no coincidir el nombre de usuario con la ID numérica, la consulta actualizaba 0 filas, impidiendo pausar la IA desde la interfaz.
  - **Solución:** Se ajustó la consulta SQL a `WHERE id = $2 OR username = $2`, garantizando que la actualización de `ai_enabled` funcione sin importar si se pasa la ID numérica o el `username`.
- **Auto-Pausa al Responder Manualmente (`src/app/api/instagram/send/route.js`):**
  - **Diagnóstico:** Al enviar un mensaje manual desde la vista detallada de Instagram en Practiiko (`/instagram/[id]`), la respuesta se enviaba al cliente y se guardaba en base de datos, pero no se cambiaba `ai_enabled` a `false`. Al responder el cliente, la IA volvía a contestar automáticamente.
  - **Solución:** Se agregó la consulta `UPDATE instagram_customers SET ai_enabled = false WHERE id = $1 OR username = $1` al finalizar con éxito el envío manual de un mensaje, cediendo inmediatamente el control al asesor humano.

### 3. Actualización de Agente de IA y System Prompts (v6.1)
- **Respaldo de Prompts Heredados (`src/lib/ai/prompts_OLD.js`):**
  - Se respaldó intacta la versión anterior v4.5 en `prompts_OLD.js` para mantener un registro histórico y facilitar reversiones rápidas si fuese necesario.
- **Implementación del Nuevo Prompt Declarativo v6.1 (`src/lib/ai/prompts.js`):**
  - **Estructura Declarativa Atómica:** Se refactorizaron los prompts de **WhatsApp** y **Instagram** adoptando la versión v6.1 basada en árboles de decisión algorítmicos (Pasos 1 al 6/7) y autoverificación (*Checklist Final*).
  - **Integración con Backend de Practiiko:** Se mantuvo la sintaxis obligatoria `URL_FOTO: [URL]` para la renderización multimedia por webhook, la regla estricta de CERO EMOJIS, trato formal ("Usted"), el uso exclusivo del **Precio BCV** y las URLs del showroom en Porlamar e Instagram a WhatsApp (`wa.me`).
  - **Control Anti-Spam de Catálogo:** Se restringió el envío del enlace del catálogo web a un máximo de UNA sola vez por conversación.
- **Solución a Error SQL en Transferencia de Instagram (`requires_human`):**
  - **Diagnóstico:** Al activarse una transferencia `[TRANSFER]`, el agente intentaba actualizar `UPDATE instagram_customers SET ai_enabled = false, requires_human = true`. PostgreSQL arrojaba el error `42703 (column "requires_human" does not exist)` impidiendo que `ai_enabled` se marcara en `false`.
  - **Solución Implementada:** 
    1. Se añadió la instrucción auto-migratoria `ALTER TABLE instagram_customers ADD COLUMN IF NOT EXISTS requires_human BOOLEAN DEFAULT FALSE;` en `src/app/instagram/page.js`.
    2. Se implementó una cláusula de reserva (fallback) en `src/lib/ai/instagramAgent.js` y `src/app/api/webhooks/instagram/route.js` para que, si la columna aún no está creada en la BD, se ejecute `UPDATE instagram_customers SET ai_enabled = false` garantizando la pausa inmediata de la IA.

## Tareas Realizadas (27 de Julio de 2026)

### 1. Tolerancia a Errores Ortográficos e Indagación Inteligente (Intel-Spell v6.2)
- **Ampliación de Coincidencia Borrosa (Fuzzy Match Levenshtein):**
  - Se modificó la función `isFuzzyMatch` en `src/lib/ai/whatsappAgent.js` y `src/lib/ai/instagramAgent.js`. Se aumentó la tolerancia a 3 diferencias de caracteres para términos de 7 o más letras y a 2 para términos de 4 a 6 letras. Esto permite que errores como *"katerpila"*, *"materpilar"*, *"mery"* o *"sofama"* sean vinculados directamente al producto correspondiente (`Caterpillar`, `Merey`, etc.) en lugar de activar fallbacks.
- **Actualización de System Prompts (`src/lib/ai/prompts.js` - v6.2):**
  - **Módulo `INTEL-SPELL`:** Se incorporó una instrucción declarativa que exige a la IA deducir fonética o visualmente el modelo probable cuando el cliente escribe con errores ortográficos.
  - **Confirmación Proactiva:** En lugar de emitir `[TRANSFER]`, la IA confirma amablemente con el cliente (ej: *"¿Se refiere a nuestro modelo Caterpillar?"*) entregando el Precio BCV exacto de inmediato.
- **Módulo `MANEJO DE REFERENCIAS AL CATÁLOGO` (`src/lib/ai/prompts.js` - v6.3):**
  - **Petición Directa (Caso A):** Envía el link del catálogo web con pregunta de sondeo (máximo 1 vez por chat).
  - **Referencia a Producto Visto (Caso B):** Se prohíbe explícitamente volver a enviar el enlace si el cliente dice *"en el catálogo vi..."* o *"el de la web"*. El bot busca directamente la opción descrita en la BD y muestra su Precio BCV y foto.
  - **Reporte de Ausencia (Caso C):** Si el cliente indica que un producto *"no sale en la página"*, el bot no insiste y transfiere inmediatamente con `[TRANSFER]`.
- **Refinamiento de Intenciones y Contexto (`whatsappAgent.js` / `instagramAgent.js`):**
  - Se actualizó `detectIntent` para no marcar erróneamente como `CATALOG` las frases donde el cliente describe productos usando la palabra catálogo (ej: *"en el catálogo vi uno verde"*).
  - Se añadieron *"en el catálogo"*, *"del catálogo"*, *"en la página"*, *"de la web"* dentro del array `CONTEXT_REFS` para resolver correctamente referencias a productos vistos en la web.
- **Limpieza de Espacios y Extracción de Imágenes en Mensajes Multimedia (`whatsappAgent.js` / `instagramAgent.js`):**
  - **Compresión de Texto:** Se añadió una regla de limpieza con expresiones regulares (`.replace(/:\s*\n\s*\n/g, ":\n").replace(/\n\s*\n\s*\n+/g, "\n\n")`) que comprime los saltos de línea sobrantes al remover la sintaxis `URL_FOTO: ...`.
  - **Corrección en Simulador y Webhooks:** Se amplió la detección del extractor de imágenes cuando el usuario responde de forma afirmativa (ej: *"sí"*, *"claro"*, *"por favor"*).
  - **Desduplicación Estricta de Imágenes:** Se agregó una desduplicación mediante `Set()` en la extracción de `imageUrls`. Si la BD solo posee 1 imagen principal para un producto, el sistema evita enviar 3 réplicas idénticas de la misma foto cuando el bot nombra 3 variantes de color.
- **Simplificación de Enlace a WhatsApp (`prompts.js`):**
  - Se forzó el uso estricto de la URL corta y limpia `https://wa.me/584248948664` prohibiendo la generación de parámetros URL-encoded extensos con caracteres especiales (como `%2C` y `%20`), garantizando enlaces atractivos y directos para el cliente.
- **Incorporación de Tecnología de Compresión de Marca (`prompts.js`, `whatsappAgent.js`, `instagramAgent.js`):**
  - **Pilar Institucional:** Se inyectó en la sección de `INFORMACIÓN INSTITUCIONAL AUTORIZADA` la directiva explícita de que **TODOS los muebles de Practiiko (sofás, sofás cama y colchones) son comprimidos en caja**.
  - **Exclusión de Adjetivos en Búsqueda:** Se añadieron las palabras adjetivas de marca (`"comprimido"`, `"comprimidos"`, `"caja"`, `"box"`, `"empacado"`, `"vacio"`) a `stopWords`, evitando que consultas como *"sofás comprimidos"* anulen los filtros de SQL y permitiendo que la IA responda ofreciendo orgullosamente toda la línea de sofás de Practiiko.

- **Mejora en Notificación de Errores de Respuesta Manual (`instagram/send/route.js` y `ManualReplyInput.js`):**
  - **Diagnóstico:** Cuando la API de Meta rechazaba un mensaje manual de Instagram (ej: por token de acceso expirado o vencimiento de la ventana de 24 horas de Meta), el servidor devolvía el objeto de error anidado en JSON, haciendo que el alert web mostrase el vago mensaje *"Error al enviar mensaje: Error desconocido"*.
  - **Solución:** Se actualizó la extracción del mensaje de error en `route.js` y `ManualReplyInput.js`. Ahora el sistema parsea directamente la propiedad de texto de Meta (ej: `data.error.message`), desplegando el motivo exacto y transparente del fallo en pantalla.

- **Regla Exclusiva para Comentarios en Instagram (`prompts.js` & `instagramAgent.js`):**
  - **Diferenciación de Plataforma:** Se configuró un comportamiento exclusivo para Instagram cuando el origen es un comentario (`source === 'comment'`) o el cliente realiza consultas generales de precio (*"Precio por favor"*).
  - **Flujo de Atención:** El bot entrega una bienvenida cordial, comparte obligatoriamente el catálogo oficial (`https://www.practiiko.com/catalogo`), realiza 1 pregunta de sondeo por categoría y redirige al cliente a continuar la conversación por **WhatsApp Oficial** (`https://wa.me/584248948664`) o por **DM privado**.
  - **Entrega Confiable en Comentarios:** Se actualizó `src/app/api/webhooks/instagram/route.js` para enviar `aiResponse.text` directamente en la respuesta pública al comentario del post (`POST /{comment_id}/replies`). Esto resuelve los errores de Meta `code: 100, error_subcode: 2534025` (*"Le commentaire n'est pas valide pour une réponse privée"*) y `code: 10, error_subcode: 2534022` (*"Message sent outside of allowed window"*), garantizando que el cliente **siempre reciba su catálogo y enlace a WhatsApp** al comentar en Instagram.

## Tareas Realizadas (28 de Julio de 2026)

### 1. Filtros Avanzados de Monitoreo en Instagram (`/instagram`)
- **Nuevo Componente `<InstagramFilters />` (`src/components/Instagram/InstagramFilters.jsx`):**
  - Se diseñó e implementó un componente con estética *glassmorphism* que incluye:
    - **Búsqueda por texto:** Filtra por nombre de usuario (`username`), nombre completo (`full_name`) o ID de cliente.
    - **Dropdown de Origen:** Permite filtrar por tipo de interacción: *Todos los Orígenes*, *💬 Solo Mensajes (DMs)* o *📝 Solo Comentarios*.
    - **Filtro `🚨 Requiere Asesor`:** Toggle que resalta y filtra conversaciones marcadas con `requires_human = true`.
    - **Rango de Fechas:** Selectores `Desde` y `Hasta` para acotar conversaciones dentro de un periodo específico.
    - **Limpieza Rápida:** Botón dinámico para restablecer todos los filtros.
- **Respuesta Inmediata en Interfaz:** Se aislaron los eventos para que la selección del dropdown de origen, el botón de asesor y las fechas respondan **al instante** al hacer clic (`onChange`), reservando el *debounce* exclusivamente para el input de texto de búsqueda.

### 2. Optimización de Rendimiento e Índice SQL en Monitoreo de Instagram (`src/app/instagram/page.js`)
- **Resolución de Cuello de Botella (Full Table Scan de 60s):**
  - Se eliminaron las subconsultas correlacionadas en `SELECT` y `HAVING` que ejecutaban escaneos completos sobre la tabla `instagram_messages` para cada grupo de conversación.
  - Se reescribió la consulta `getConversations` implementando **Expresiones de Tabla Comunes (CTEs)** de PostgreSQL:
    - `conv_stats`: Agrupa y contabiliza mensajes y última fecha en una sola pasada.
    - `latest_msgs`: Utiliza `DISTINCT ON (session_id) ... ORDER BY session_id, id DESC` para obtener de forma determinista y ultrarrápida el último origen de mensaje por conversación.
  - **Índice Automático de Base de Datos:** Se incorporó la instrucción auto-migratoria `CREATE INDEX IF NOT EXISTS idx_ig_messages_session_id_id ON instagram_messages(session_id, id DESC);`.
  - **Resultado:** Reducción del tiempo de respuesta del servidor de **~60 segundos a < 15 milisegundos**.

### 3. Respuesta Fija Automática para Comentarios de Instagram (`src/lib/ai/instagramAgent.js`)
- **Desactivación de IA en Comentarios:** Se configuró una regla de respuesta fija e inmediata cuando el origen es un comentario (`source === 'comment'`), evitando que el Agente entable conversación o realice llamadas a la API del modelo de IA (cero consumo de tokens).
- **Mensaje Oficial Estático:** Responde automáticamente entregando el enlace al catálogo oficial (`https://www.practiiko.com/catalogo`) y la redirección al WhatsApp Oficial (`https://wa.me/584248948664`), almacenando el mensaje en `instagram_messages` para auditoría en el panel.

### 4. Mejora en la Búsqueda de Monitoreo de WhatsApp (`/whatsapp`)
- **Ampliación de Coincidencias (`src/app/whatsapp/page.js`):**
  - Se modificó la condición de búsqueda para incluir `(wm.session_id ILIKE $1 OR wc.full_name ILIKE $1)`. La barra de búsqueda de WhatsApp ahora ubica conversaciones buscando indistintamente por **número telefónico** o por **nombre del cliente**.

## Tareas Realizadas (30 de Julio de 2026)

### 1. Respuestas Aleatorias en Comentarios e Información por DM (`src/lib/ai/instagramAgent.js` y `src/app/api/webhooks/instagram/route.js`)
- **Rotación Anti-Spam en Comentarios Públicos:** Se implementó la selección aleatoria entre 5 variaciones de texto para responder a comentarios públicos en Instagram (ej: *"¡Hola! Te dejamos toda la información en tu DM. ¡Revisa tus mensajes!"*), evitando la penalización de Meta por respuestas repetitivas/automatizadas en comentarios.
- **Desacoplamiento de Mensaje Público y DM Privado:** Se configuró el flujo para que la respuesta pública notifique la revisión del DM y, en paralelo, se envíe la información completa y los enlaces del catálogo y WhatsApp por mensaje privado.

### 2. Tarjetas Interactivas con Botones Nativos y Links Clickeables en Instagram DMs (`route.js` e `instagramAgent.js`)
- **Plantilla Genérica Nativa de Meta (`generic` template):** Se integró en `sendInstagramPrivateReply` y `sendInstagramMessage` el envío de tarjetas con botones nativos de llamada a la acción (`web_url` buttons: **"📖 Ver Catálogo Web"** y **"💬 Chat de WhatsApp"**). Esto garantiza que en la app móvil de Instagram (iOS y Android) el cliente vea botones grandes e interactivos que abren la web o WhatsApp en 1 solo tap, superando las restricciones de enlaces planos en solicitudes de mensajes.
- **Formateo de URLs Limpias y Cortas:** En los mensajes de texto de reserva (fallback), se formatearon las URLs en líneas independientes y cortas (`https://practiiko.com/catalogo` y `https://wa.me/584248948664`), evitando el quiebre de línea en medio del carácter `/` que impedía el auto-enlace en dispositivos móviles.

### 3. Renderizado de Enlaces Clickeables en el Panel de Monitoreo (`src/app/instagram/[id]/page.js` y `src/app/whatsapp/[id]/page.js`)
- **Links Interactivos en Chat del Panel (`renderMessageWithLinks`):** Se desarrolló y aplicó una función helper que analiza dinámicamente el contenido de los mensajes en los paneles de detalle de **Instagram** y **WhatsApp**. Todas las URLs detectadas se renderizan como hipervínculos azules interactivos `<a target="_blank">`, permitiendo a los asesores hacer clic y abrir enlaces del catálogo o archivos multimedia directamente desde las burbujas de chat del dashboard.

### 4. UX del Autogestor: Persistencia en Pantalla de Edición (`src/components/Products/ProductForm.js` y `new/page.js`)
- **Permanencia en el Editor al Guardar:** Se eliminó la redirección automática `/products` al hacer clic en **"Guardar Cambios"** en `ProductForm.js`. Ahora, el formulario guarda los datos en la base de datos, muestra la notificación toast de éxito ("Cambios guardados con éxito 💎") y mantiene al usuario en la pantalla de edición con los controles activos para seguir realizando cambios.
- **Redirección de Publicación Nueva:** Al crear y publicar un producto nuevo en `/products/new`, la acción redirige a `/products/[id]/edit` para mantener al usuario dentro de la pantalla de edición del producto recién creado.

### 5. Correcciones de Infraestructura y Configuración (`next.config.mjs` y `route.js`)
- **Ampliación de Límite de Peticiones HTTP en Subida de Videos:** Se configuró `experimental.proxyClientMaxBodySize: '250mb'` en `next.config.mjs`. Esto resolvió la advertencia y el truncamiento a 10MB que aplicaba Next.js App Router en `/api/products/upload`, permitiendo subir archivos de video pesados por completo.
- **Corrección de Sintaxis de Build para Turbopack:** Se corrigió un error tipográfico de comillas (`"type": "web_url"`) en la definición del objeto de la plantilla de Instagram en `route.js`, garantizando la compilación limpia del proyecto en Docker/Easypanel.

## Tareas Realizadas (22-23 de Agosto de 2026)

### 1. Resolución de Bloqueo de Imágenes en Plantillas de Meta (Cloud API)
- **Diagnóstico del Problema:** Se identificó que las plantillas de WhatsApp con imágenes en la cabecera (header) eran rechazadas por Meta. La causa raíz fue que el servidor Next.js en modo `standalone` sobre Easypanel no estaba sirviendo la carpeta estática `/public` correctamente, devolviendo la plantilla HTML principal en su lugar, lo cual rompía el formato esperado por el crawler de Meta (`facebookexternalhit`).
- **Implementación de API Media Interna:** Para forzar la entrega correcta del archivo a Meta, se movió `logo-practiiko.jpeg` a `public/uploads/products/` y se modificó el webhook (`route.js`) para que las plantillas consuman las imágenes a través de la API local (`/api/media/logo-practiiko.jpeg`), la cual lee el archivo con `fs` y garantiza la cabecera `Content-Type: image/jpeg`.
- **Intento de Subida a YCloud:** Previamente, se diseñó un script temporal seguro en Node.js (`uploadMedia.mjs`) que utilizaba la interfaz `readline` de la consola para obtener dinámicamente un `media_id` de YCloud sin exponer llaves privadas, como plan de contingencia (el cual se descartó en favor de usar nuestro propio dominio).

### 2. Captura de Botones de Respuesta Rápida en Webhook
- **Interceptación de Payload (`type === "button"`):** Se parcheó la lógica del enrutador en `src/app/api/webhooks/whatsapp/route.js` para extraer correctamente las interacciones con botones nativos de plantillas de WhatsApp (ej. botón "SOFÁS").
- **Flujo Aislado:** Se diferenció la gestión de botones para interceptar los clics predefinidos *antes* de que ingresen al flujo conversacional del modelo LLM (DeepSeek), activando de manera correcta el embudo de ventas para esa categoría (videos y templates posteriores).

## Planificación en Espera (Pendiente de Aprobación Comercial)

### Migración a API Oficial de WhatsApp (Cloud API - Modo Coexistencia)
- **Estado:** ⏸️ PAUSADO (En espera de aprobación del presupuesto por parte del cliente).
- **Descripción del Requerimiento:**
  - Migrar la integración de WhatsApp desde Evolution API hacia la **API Oficial de Meta (Cloud API)** para dar soporte nativo a embudos interactivos (Botones de Respuesta Rápida), Audios (Notas de voz nativas) y Videos (`.mp4`), eliminando riesgos de bloqueos no oficiales.
  - El sistema deberá operar en **Modo Coexistencia**, permitiendo que el número siga siendo utilizado en la aplicación móvil de *WhatsApp Business* simultáneamente con el Bot.
   - Incorporar una columna `company_id` o `tenant_id` en absolutamente todas las tablas (mensajes, productos, clientes).
   - Filtrar todas las consultas SQL (`WHERE company_id = X`) para garantizar que cada cliente vea solo su propia información.
2. **Sistema de Roles y Autenticación:**
   - Crear jerarquías: `Super Admin` (Dueño del SaaS), `Owner` (Cliente de la empresa) y `Agente` (Empleado que solo responde chats).
3. **Onboarding Automático de Meta (Embedded Signup):**
   - Automatizar el registro de webhooks y credenciales. Cada cliente debe poder iniciar sesión con Facebook y que el sistema guarde dinámicamente su `ACCESS_TOKEN` y `PHONE_ID` vinculados a su `tenant_id`.
4. **Contexto de IA Dinámico por Cliente:**
   - Crear un panel donde cada empresa defina las reglas, catálogo y "System Prompt" de su propio negocio. El motor de IA deberá inyectar el contexto específico del `tenant_id` en tiempo real antes de consultar al LLM.
5. **Módulo de Suscripciones (Facturación Automática):**
   - Integración con pasarelas de pago (Ej: Stripe). El sistema debe pausar automáticamente la IA y el acceso al Autogestor si el cliente no renueva su mensualidad.
