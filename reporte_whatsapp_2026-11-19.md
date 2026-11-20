# Reporte de Análisis de Conversaciones de WhatsApp — Practiiko

**Período analizado:** 07 de septiembre de 2026 al 19 de noviembre de 2026  
**Fuente:** Base de datos de producción (`practiiko` — tablas `whatsapp_customers` y `whatsapp_messages`)

---

## 1. Resumen Ejecutivo

| Indicador | Valor |
| :--- | :---: |
| **Clientes únicos registrados** | **1,085** |
| **Clientes con historial de mensajes** | **1,080** |
| **Total de mensajes intercambiados** | **6,283** |
| — Mensajes enviados por clientes | 2,651 |
| — Respuestas enviadas por el bot | 3,632 |
| **Derivados a asesor humano (`requires_human = true`)** | **188** (17.3%) |
| **Promedio de mensajes por cliente** | **2.45** |

### Crecimiento mensual
| Mes | Clientes únicos | Mensajes de clientes | Respuestas del bot |
| :--- | :---: | :---: | :---: |
| **Septiembre 2026** | 22 | 59 | 64 |
| **Octubre 2026** | 264 | 721 | 1,150 |
| **Noviembre 2026** *(hasta el 19/11)* | **815** | **1,871** | **2,418** |

> **Nota financiera:** En noviembre el volumen creció más de **3x** respecto a octubre en solo 19 días. Con el flujo anterior se dispararon **1,638 plantillas de Marketing pagadas** (`941` `welcome` + `697` carruseles). Con el nuevo flujo gratuito de 1 solo mensaje consolidado para **Practiiko Margarita**, ese gasto en plantillas pasa a **$0** y el volumen mensual se mantiene dentro o muy cerca de la cuota de **1,000 mensajes de servicio gratuitos/mes** de Meta.

---

## 2. Origen de los Clientes y Embudo de Conversión

### Origen detectado
* **Instagram (botón hacia WhatsApp):** `574` clientes (**~53%** del total) llegaron con el mensaje prellenado *"Quiero transformar mi hogar"* (528 exactos + variantes).
* **Anuncios / Catálogo Meta:** `169` mensajes entraron con *"¡Hola! Quiero más información"* (`142`) o *"¡Hola! Me gustaría conseguir más información sobre esto."* (`27`).
* **Orgánico / Otros saludos:** Resto de consultas directas (*"Hola"*, *"Buenas tardes"*, *"Precio"*, etc.).

### Rendimiento del embudo anterior
* **Recibieron plantilla `welcome`:** `941` clientes.
* **Eligieron categoría (de los 941):**
  * **Sofás Comprimidos (`krrusel_a`):** `510` (**73.2%** de quienes eligieron)
  * **Colchones (`krrusel_a_c`):** `161` (**23.1%**)
  * **Velas Perladas (`krrusel_a_v`):** `26` (**3.7%**)
* **Abandono en el menú inicial:** `244` clientes (**~26%**) recibieron `welcome` y no seleccionaron ninguna categoría.
* **Clics en botones finales:** `24` pulsaron *"Más Información"* y `19` *"Contactar a un asesor"*, aunque **`188` clientes** terminaron pasando a asesor humano tras escribir texto libre.

### Profundidad de las conversaciones
* **1 solo mensaje:** `381` clientes (35.3%)
* **2 mensajes:** `375` clientes (34.7%)
* **3 a 5 mensajes:** `276` clientes (25.6%)
* **Más de 5 mensajes:** `48` clientes (4.4%)

---

## 3. Distribución por Prefijos Telefónicos

| Prefijo / Operadora | Clientes |
| :--- | :---: |
| `58412` (Digitel VE) | 329 |
| `58424` (Movistar VE) | 297 |
| `58414` (Movistar VE) | 234 |
| `58426` (Movilnet VE) | 78 |
| `58416` (Movilnet VE) | 72 |
| `58422` (VE) | 30 |
| Internacionales (`+54`, `+57`, `+1`, `+56`, `+51`) | ~11 |

---

## 4. Qué Preguntan los Clientes (Análisis de Texto Libre)

| Tema consultado | Clientes únicos | % aprox. |
| :--- | :---: | :---: |
| **Precios / Costos** (*"Precio"*, *"Cuánto vale"*) | **325** | **30.0%** |
| **Ubicación / Tienda / Margarita** | **35** | 3.2% |
| **Medidas, colores y telas** | **31** | 2.9% |
| **Financiamiento / Cashea / Cuotas** | **29** | 2.7% |
| **Envíos / Fletes** | **15** | 1.4% |
| **Mención de otras ciudades** | **9** | 0.8% |

### Eventos multimedia registrados
* **Reacciones (`reaction`):** `54`
* **Imágenes enviadas por clientes:** `52`
* **Notas de voz (`audio`):** `43`
* **Mensajes anulados (`revoke`):** `13`
* **Stickers:** `10`

---

## 5. Acciones Implementadas a Partir del Análisis

1. **Eliminación de plantillas pagadas en WhatsApp** ([`route.js`](file:///c:/Users/rhect/Documents/Proyectos/Practiiko/practiiko_app/src/app/api/webhooks/whatsapp/route.js)): Se desactivaron `welcome` y `krrusel_*`, reemplazándolos por **1 único mensaje de servicio gratuito** con la invitación a la tienda de **Practiiko Margarita** (`Av. Llano Adentro, CC Terranova Plaza, Local A14, Porlamar`), Plus Code, enlace directo a Google Maps, mención del regalo de bienvenida, horario y catálogo web.
2. **Filtro de reacciones y mensajes anulados:** Se agregó el descarte automático de eventos `reaction` y `revoke` en el webhook de WhatsApp para evitar respuestas automáticas innecesarias (54 reacciones y 13 anulaciones detectadas) y proteger la cuota mensual de mensajes gratuitos.
