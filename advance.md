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

## Próximos Pasos
- [ ] Mantenimiento general y desarrollo continuo según requerimientos.
