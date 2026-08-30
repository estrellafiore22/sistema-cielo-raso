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
  carga.js              Cuánta obra cabe en un día, medida en m²
  reprogramacion.js     Mover un trabajo de fecha y avisar al cliente
  pedidos.js            Órdenes de venta
  pagos.js              Yape, transferencia, adelanto o pago completo
  suspendido/           Cielo raso vinil, baldosa 61×61
    config.js           Largos de fábrica, separaciones y precios
    geometria.js        Retícula: dónde va cada T, en coordenadas
    cortes.js           Optimizadores de corte (ver más abajo)
    materiales.js       De la retícula a la lista de material
    dibujo.js           Segmentos y cotas para el plano, sin DOM
    index.js            Orquesta, elige orientación y cotiza
src/ui/vistas/          Una vista por archivo
src/ui/componentes/     Piezas reutilizables
src/impresion/          Boletas cliente y admin, hoja técnica, cola de impresión
src/integraciones/      Google Maps, notificaciones del sistema
docs/                   Documentación funcional
```

## Cómo se publica

El dueño autorizó publicar a producción sin preguntar cada vez. La
contrapartida es que **nada se publica sin verificar y sin respaldo**:

```bash
bash pruebas/correr.sh                       # 1. tiene que decir "Se puede publicar"
git branch -f respaldo-anterior origin/main  # 2. guardar lo que está publicado
git push -f origin respaldo-anterior
git checkout main && git merge --ff-only <rama> && git push origin main
```

Si una suite falla, **no se publica**: se arregla o se revierte.

**Para volver atrás**, la rama `respaldo-anterior` apunta siempre al estado que
estaba publicado antes del último cambio:

```bash
git checkout main && git reset --hard respaldo-anterior && git push -f origin main
```

Y como a `main` solo se le hacen avances directos, cualquier estado anterior
sigue estando en su historial: `git log --oneline main` da el punto exacto.

Ojo: **este entorno no deja empujar etiquetas** (devuelve 403), por eso el
punto de retorno es una rama y no un `git tag`.

Las pruebas corren en un navegador real contra el sistema completo. Están en
`pruebas/` y no dependen de nada instalado en el repositorio; ver
`pruebas/LEEME.md`.

**No agregar `package.json` a la raíz.** Vercel lo interpretaría como un
proyecto que hay que compilar y el despliegue dejaría de funcionar solo.

## Reglas de código

- **Un archivo, una responsabilidad.** Si un archivo pasa de ~300 líneas, se
  parte. Esto no es negociable: el dueño pidió explícitamente no tener archivos
  de miles de líneas.
- **Español en el código.** Nombres de variables, funciones y comentarios en
  español, igual que el resto del proyecto.
- **Dos unidades por material.** `unidad` es como lo vende el proveedor
  (ciento, balde, caja) y `unidadConsumo` es como se gasta en obra (tornillo,
  kg, par); `porVenta` dice cuántas trae una. **Las recetas se escriben en
  unidades de consumo**: 22 tornillos por m², no 0.22 cientos. La conversión a
  lo que se compra la hace `despiece.js` al final. Los precios siempre van por
  unidad de venta.
- **`src/dominio/` no toca el DOM.** Recibe datos, devuelve datos. Así se puede
  probar y reusar.
- **Nada de `innerHTML` con datos del usuario.** Usar `textContent` o los
  helpers de `src/ui/componentes/`.
- **Todo error se captura.** `src/core/errores.js` envuelve la app. Una vista
  que falla muestra un aviso, no tumba el sistema.
- **Nunca redibujar un formulario mientras alguien escribe en él.** Este error
  ya apareció cuatro veces: un manejador de `input` que rehace el panel entero
  destruye el campo enfocado, y al escribir "120" solo queda "1". La forma
  correcta es construir los campos UNA vez y refrescar aparte solo lo derivado
  (totales, tablas, plano). Ver `cotizador-que.js`, que lo documenta arriba.
  El caso hermano es lo contrario: un valor derivado que NO se refresca y se
  queda mintiendo. Si un dato depende de otro, alguien tiene que actualizarlo.

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
Las tres se combinan con un **tipo de trabajo**: cielo raso de drywall,
división, zona húmeda, o **cielo raso vinil** (baldosa 61 × 61). Todos piden
**ancho × largo en metros**; los primeros lo convierten a m² y aplican una
receta, y el vinil tiene su propio motor de cálculo.

Ver `docs/modalidades.md` para el detalle de cada boleta.

## Cielo raso vinil (baldosa 61 × 61)

Es un **tipo de trabajo** dentro de Nuevo pedido, no una pantalla aparte: sale
elegido de entrada y se vende con cualquier modalidad.
Tiene su propio motor de cálculo en `src/dominio/suspendido/`, su plano y su
hoja técnica, que se imprime desde el detalle del pedido.

Sus separaciones y precios se editan en Ajustes → Cielo raso vinil.

**La regla que gobierna todo el cálculo:** una barra trae dos puntas de
fábrica, y solo sirve el tramo que conserva una punta. Por eso de una barra
salen **como máximo dos piezas útiles** y lo que quede en medio es chatarra.
Eso vuelve el problema un emparejamiento de dos en dos, que `cortes.js`
resuelve al óptimo exacto con dos punteros sobre la lista ordenada.

Aplica a las T. **No aplica** al ángulo perimetral (se empalma a tope) ni a las
baldosas (se cortan con cuchilla): esos usan `cortarLibre`.

Dos optimizaciones más, ambas con plata detrás:

- Se prueban las dos orientaciones de la T principal y gana la más barata.
- Un tramo de secundaria más corto que una terciaria se resuelve con terciaria:
  mismo perfil, mitad de precio. Con las principales no se hace: es un perfil
  estructural distinto.

**Cómo se cobra:** con mano de obra el cliente paga un **precio por m²**, no la
suma de los materiales. Precio de lista 30 S/, más tres promociones editables
(29 / 28 / 27). Debajo del cálculo, el vendedor ve el **cuadro de la tienda**:
cobrado − materiales − mano de obra (5.50 S/ por m²) + transporte = ganancia.
Ese cuadro no sale en ninguna boleta del cliente.

Detalle completo en `docs/suspendido.md`.

## Cuánto trabajo entra en un día

Contar trabajadores libres no alcanza: no es lo mismo mandar un equipo a 15 m²
de vinil que a 60 m² de división. Cada tipo de trabajo tiene una **capacidad
diaria en m²** (`src/dominio/carga.js`, editable en Ajustes), un trabajo ocupa
la fracción de jornada que le corresponde, y el día se llena cuando se agota.
Dos obras de 20 m² llenan una jornada de 40 igual que una sola de 40. Encima va
un tope de trabajos por día: el traslado no se recupera aunque la obra sea
chica.

Un trabajo se puede **mover de fecha** desde el calendario. Se arrastran las
asignaciones del equipo y queda pendiente avisarle al cliente: Inicio lo lista
arriba con el teléfono hasta que alguien marca que ya llamó.

## Fechas

Un día se guarda como `AAAA-MM-DD`. Ojo con esto: el navegador lee esa cadena
como **medianoche UTC**, y en Perú (UTC−5) eso cae el **día anterior**. Por eso
`aFecha()` en `src/core/formato.js` arma a mano los días sueltos, en hora
local. Sin eso, cada relectura corría la fecha un día hacia atrás.

## Boletas por imprimir

El navegador no puede saber si algo se imprimió de verdad, así que la cuenta se
lleva al revés: se **anota qué boletas sí salieron**, y todo pedido vivo sin esa
anotación cuenta como pendiente. Antes se contaba lo encolado, y un pedido cuya
boleta nunca se mandó a imprimir no encolaba nada: el indicador decía 0 con
boletas sin imprimir.

## Respaldos

`src/core/respaldo.js` guarda una foto completa de los datos al abrir el
sistema, una vez al día, y antes de restaurar cualquier otra. Se ven y se
restauran desde Diagnóstico. Guarda las 3 últimas.

Las fotos **excluyen las fotos anteriores**: si no, cada respaldo contendría al
anterior y el almacenamiento crecería al doble en cada vuelta.

Protegen contra un error del sistema o un borrado accidental. **No** protegen
contra formatear la PC ni limpiar el navegador: viven en el mismo sitio que los
datos. Para eso está la exportación a archivo, que es manual y que el sistema
recuerda cada 7 días.

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
