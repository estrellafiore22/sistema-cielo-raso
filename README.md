# Sistema Cielo Raso & Drywall

Sistema de ventas, cotización, inventario y calendario para una tienda que vende
materiales y ejecuta trabajos de cielo raso y divisiones en drywall.

## Cómo abrirlo

No necesita instalar nada ni compilar nada. Es HTML, CSS y JavaScript.

**En tu PC:**

```bash
python3 -m http.server 8000
```

Luego abre <http://localhost:8000> en el navegador.

**En internet:** sube el repositorio a Vercel, Netlify o GitHub Pages. No hay
configuración: es un sitio estático.

## Accesos iniciales

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin` | Administrador |
| `programador` | `programador` | Programador |
| `cliente` | `cliente` | Usuario |

**Cámbialas apenas entres**, en Ajustes → Usuarios.

## Lo primero que debes hacer

El sistema arranca con precios y consumos **estimados de mercado**. Antes de
vender con esto, ajústalos a tu negocio:

1. **Ajustes → Datos de la tienda** — nombre, RUC, Yape y cuenta bancaria.
   Esto sale impreso en las boletas.
2. **Materiales** — precios reales de compra y venta de cada material.
3. **Recetas** — cuánto material entra en cada m² según trabajan tus maestros,
   y el precio de la mano de obra por m².
4. **Ajustes → Transporte** — tarifa base, costo por kilómetro y km libres.
5. **Personal** — tus trabajadores.
6. **Inventario** — el stock real que tienes en almacén.

## Qué hace

- **Tres modalidades de venta**: con mano de obra, solo material completo, y
  material suelto del catálogo. Ver [docs/modalidades.md](docs/modalidades.md).
- **Despiece automático**: de metros cuadrados a lista de materiales, repartida
  entre lo que volvió de obra, lo que hay en almacén y lo que falta comprar.
- **Dos boletas por pedido**: la del cliente y la orden interna, que llevan
  información distinta a propósito.
- **Inventario en dos bolsas**: almacén y retornos de obra.
- **Calendario de personal**: quién trabaja qué día y si queda gente libre para
  mandar a otro trabajo.
- **Transporte por distancia**, con Google Maps o con los kilómetros a mano.
- **Pagos con Yape o transferencia**, adelanto o completo. Nunca sin pago.
- **Cola de impresión** que sobrevive al cierre del navegador.

## Respaldos

Los datos viven en el navegador de esa PC. **Exporta un respaldo seguido** desde
Diagnóstico → Exportar respaldo (entra como `programador`).

Los límites de esto, y qué hacer para levantarlos, están en
[docs/pendientes.md](docs/pendientes.md).

## Para quien programe encima

Lee [CLAUDE.md](CLAUDE.md): estructura de carpetas, reglas de código y
decisiones de arquitectura.
