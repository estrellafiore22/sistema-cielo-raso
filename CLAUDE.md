# Sistema Cielo Raso — Guía del proyecto

Sistema de gestión para una tienda que vende materiales y ejecuta trabajos de
**cielo raso y divisiones en drywall**. Moneda: **Soles peruanos (S/)**.

Este archivo es la memoria del proyecto. Cualquier sesión nueva de Claude debe
leerlo antes de tocar código.

## Cómo se ejecuta

No hay build, no hay `npm install`, no hay framework. Es HTML + CSS + JavaScript
con módulos ES nativos. Para probar:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Se despliega como sitio estático (Vercel, Netlify o GitHub Pages) sin configuración.

**Esto es deliberado.** El dueño no es programador. Un build que falla es un
sistema caído. No introducir bundlers, TypeScript ni dependencias npm sin que
el dueño lo pida explícitamente.

## Estructura

```
index.html              Único HTML. Shell de la aplicación.
assets/css/             Estilos. base.css, componentes.css, imprimir.css
src/app.js              Arranque de la aplicación
src/core/               Infraestructura, sin lógica de negocio
  errores.js            Captura global de errores. La app nunca muere.
  almacenamiento.js     Adaptador de persistencia (hoy localStorage)
  bd.js                 Colecciones, CRUD, migraciones
  semilla.js            Datos iniciales (materiales, recetas, personal)
  auth.js               Sesión y roles
  bus.js                Eventos entre módulos
  formato.js            Moneda, fechas, números
  router.js             Navegación por hash
src/dominio/            Reglas de negocio. Sin DOM. Funciones puras donde se pueda.
  materiales.js         Catálogo, categorías, precios de compra y venta
  recetas.js            Consumo de material por m² (EDITABLE por admin)
  inventario.js         Stock de almacén y material retornado de obra
  despiece.js           De m² a lista de materiales a llevar
  precios.js            Motor de cotización, 3 modalidades
  transporte.js         Costo por distancia
  personal.js           Trabajadores
  calendario.js         Asignación de personal y días disponibles
  pedidos.js            Órdenes de venta
  pagos.js              Yape, transferencia, adelanto o pago completo
src/ui/vistas/          Una vista por archivo
src/ui/componentes/     Piezas reutilizables
src/impresion/          Boletas cliente y admin, cola de impresión
src/integraciones/      Google Maps, notificaciones del sistema
docs/                   Documentación funcional
```

## Reglas de código

- **Un archivo, una responsabilidad.** Si un archivo pasa de ~300 líneas, se
  parte. Esto no es negociable: el dueño pidió explícitamente no tener archivos
  de miles de líneas.
- **Español en el código.** Nombres de variables, funciones y comentarios en
  español, igual que el resto del proyecto.
- **`src/dominio/` no toca el DOM.** Recibe datos, devuelve datos. Así se puede
  probar y reusar.
- **Nada de `innerHTML` con datos del usuario.** Usar `textContent` o los
  helpers de `src/ui/componentes/`.
- **Todo error se captura.** `src/core/errores.js` envuelve la app. Una vista
  que falla muestra un aviso, no tumba el sistema.

## Roles

| Rol | Puede |
|---|---|
| `usuario` | Ver catálogo, cotizar, pedir, pagar, imprimir su boleta |
| `admin` | Todo lo del usuario + editar materiales, precios, recetas, inventario, calendario, personal, y ver boletas internas |
| `programador` | Todo lo del admin + pantalla de diagnóstico, exportar/importar la base, resetear datos |

La sesión vive en `src/core/auth.js`. **El control de roles es de interfaz, no
de seguridad.** Mientras el almacenamiento sea local no hay servidor que valide
nada. Si se agrega backend, la autorización debe reimplementarse ahí.

## Las tres modalidades de venta

1. **Con mano de obra** — se cobra por m² instalado. Incluye material, obra y
   transporte. El material sale de almacén y lo sobrante regresa al inventario
   de retornos.
2. **Solo material completo** — el cliente compra m² y se le entrega el paquete
   completo de materiales. La boleta del **cliente muestra solo m²**; la boleta
   del **admin muestra el despiece completo**, de dónde sale cada material
   (almacén o retorno), transporte, distancia y dirección exacta.
3. **Material suelto** — el cliente arma su lista desde el catálogo por
   categorías. Boleta del cliente: material, precio unitario, cantidad, total.

Ver `docs/modalidades.md` para el detalle de cada boleta.

## Persistencia

Hoy: `localStorage`, a través de `src/core/almacenamiento.js`.

Eso significa que **los datos viven en la PC de la tienda, en ese navegador**.
No hay sincronización entre dispositivos ni clientes remotos reales.

Para pasar a multi-usuario de verdad hay que reemplazar únicamente
`almacenamiento.js` por un adaptador contra un backend (Supabase es el camino
más corto). El resto del sistema no cambia. Es la razón de que exista ese
archivo.

## Pendiente

Ver `docs/pendientes.md`.
