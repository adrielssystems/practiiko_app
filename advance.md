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

## Próximos Pasos
- [ ] Mantenimiento general y desarrollo continuo según requerimientos.

