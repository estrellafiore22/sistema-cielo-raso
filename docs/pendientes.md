# Pendientes y límites conocidos

Lo que **no** está hecho o no puede hacerse tal como se pidió. Escrito sin
adornos para que no haya sorpresas.

## Límites reales, no decisiones de diseño

### Impresión 100 % automática

**No se puede desde una página web.** Un navegador no tiene forma de saber si
hay una impresora conectada, y no permite imprimir sin que alguien confirme el
diálogo. Es una restricción de seguridad de todos los navegadores, no algo que
falte programar.

Lo que sí hace el sistema hoy:

- abre el diálogo de impresión solo al emitir una boleta
- si no se imprime, la guarda en cola, y la cola sobrevive al cierre del navegador
- al abrir el sistema avisa cuántas quedaron pendientes
- un botón las imprime todas seguidas

Para impresión sin diálogo haría falta un programa pequeño instalado en la PC de
la tienda que escuche los trabajos y los mande a la impresora. Es un proyecto
aparte y solo tiene sentido si molesta mucho el diálogo.

### Los datos viven en un solo navegador

Hoy todo se guarda en `localStorage`: la PC de la tienda, en ese navegador.

Eso significa que:

- si se limpia el historial o se formatea la PC, **se pierde todo**
- no hay sincronización entre la PC, el celular y la tableta
- los "usuarios" no son clientes remotos reales: son perfiles de esa misma PC
- el control de roles protege la interfaz, **no los datos**

**Exporta un respaldo seguido** desde Diagnóstico → Exportar respaldo.

Para que sea multi-usuario de verdad hay que reemplazar
`src/core/almacenamiento.js` por un adaptador contra un backend. Supabase es el
camino más corto: base de datos, autenticación real y API en una sola pieza. El
resto del sistema no cambia; por eso ese archivo existe.

## Por hacer

### Importante

- [ ] **Backend real** (ver arriba). Sin esto no hay clientes pidiendo por
      internet ni datos a salvo.
- [x] ~~Cierre de obra con retornos desde la interfaz.~~ Hecho: botón
      "Cerrar obra y registrar retornos" en el detalle de un pedido despachado.
      Propone el material que salió y solo pide cuánto volvió.
- [x] ~~Cobro del saldo desde la interfaz.~~ Hecho: botón "Cobrar" en el
      detalle del pedido. Acepta cobros parciales.
- [ ] **Asignar personal al crear el pedido.** Hoy el calendario valida que haya
      equipo libre, pero la asignación se hace después, a mano.

### Útil

- [ ] Autocompletado de direcciones con Google Places (hoy se escribe libre)
- [ ] Reporte de ventas por período y por modalidad
- [ ] Historial de precios: ver cuándo subió cada material
- [ ] Orden de compra al proveedor a partir de los faltantes
- [ ] Descuentos por cliente frecuente
- [ ] Boleta en PDF además de impresión directa

### Cielo raso suspendido

- [ ] Ambientes en L o con columnas: hoy solo resuelve rectángulos. Para eso
      hay que dividir el ambiente y sumar a mano.
- [ ] Precio de la baldosa vinílica y del tornillo: vienen en cero y el total
      no es real hasta cargarlos.

### Cosméticos

- [ ] Logo de la tienda en las boletas
- [ ] Modo compacto de tablas para pantallas chicas
- [ ] Búsqueda de materiales dentro del catálogo del cotizador

## Cosas que hay que revisar con datos reales

Los **consumos de las recetas** y los **precios** son estimados de mercado. Antes
de vender con esto:

1. Ajusta los precios de compra y venta en **Materiales**
2. Ajusta los consumos por m² en **Recetas**, con tus rendimientos reales
3. Ajusta la mano de obra por m²
4. Ajusta las tarifas de transporte en **Ajustes**
5. Carga el stock real en **Inventario**

Un número mal puesto ahí se multiplica por cada m² de cada pedido.
