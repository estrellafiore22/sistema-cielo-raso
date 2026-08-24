# Las tres modalidades de venta

Referencia funcional de qué calcula el sistema y qué sale en cada boleta.

---

## 1. Con mano de obra

Se cobra el **metro cuadrado instalado**. El precio sale de la receta:

```
precio = (material por m² a precio de venta) + (mano de obra por m²)
total  = precio × m² + transporte − descuento
```

Reserva personal en el calendario: el día elegido debe tener un equipo libre.

**Boleta del cliente** — una sola línea:

| Descripción | Cantidad | P. unitario | Total |
|---|---|---|---|
| Cielo raso suspendido — 120 m² instalado | 120 m² | S/ 57.20 | S/ 6,864.00 |

Más transporte, total, pagado y saldo.

**Orden interna del administrador** — todo lo anterior más:

- despiece completo del material
- cuánto sale de retornos, cuánto de almacén, cuánto falta comprar
- dirección exacta, referencia, distancia y desglose del transporte
- costo del material, mano de obra pagada, ganancia y margen
- **cuánto cobrar al llegar**

---

## 2. Solo material completo

El cliente compra **metros cuadrados de material**, sin instalación.

```
total = (material por m² a precio de venta) × m² + transporte − descuento
```

**Boleta del cliente** — por pedido expreso del dueño, muestra únicamente los
metros cuadrados. Nada de lista de materiales, nada de precios por material,
nada de origen del material:

| Descripción | Cantidad | P. unitario | Total |
|---|---|---|---|
| Material completo para Cielo raso suspendido | 80 m² | S/ 35.70 | S/ 2,855.64 |

**Orden interna del administrador** — lo contrario, lleva todo:

- los m² pedidos
- tabla de material con tres columnas de origen: **De retornos · De almacén · Falta**
- recuadro "comprar antes de despachar" con el costo de reposición
- transporte con distancia y dirección exacta
- costos, ganancia, margen
- **cobrar al llegar** = total − adelanto

---

## 3. Material suelto

El cliente arma su lista desde el catálogo, organizado por categorías.

```
total = Σ (precio unitario × cantidad) + transporte − descuento
```

**Boleta del cliente** — el detalle completo, que es lo que pidió el dueño para
esta modalidad:

| Material | Cantidad | P. unitario | Total |
|---|---|---|---|
| Perfil omega × 3.00 m | 20 barra | S/ 13.00 | S/ 260.00 |
| Masilla lista, balde 28 kg | 2 balde | S/ 88.00 | S/ 176.00 |

Puede pedir transporte: dirección exacta, referencia, fecha y hora de entrega,
y el costo del transporte aparece sumado al total.

**Orden interna** — lo mismo más el precio de compra de cada línea, el costo
total, la ganancia y cuánto cobrar al llegar.

---

## Cómo se reparte el material

Para cualquier pedido por m², el sistema reparte cada material así:

```
1. RETORNOS   ← primero, para no acumular material muerto
2. ALMACÉN    ← luego el stock nuevo
3. FALTA      ← lo que hay que comprar antes de salir
```

El descuento real del inventario **no ocurre al cotizar**, sino cuando el pedido
pasa a estado *despachado*.

Los materiales que se venden enteros (plancha, barra, rollo, pliego) se redondean
hacia arriba: no se vende media plancha. Los que se fraccionan (kg, ciento,
balde) quedan con dos decimales.

---

## Pagos

No se acepta ningún pedido sin pago. Las opciones son:

- **Adelanto** — mínimo configurable (por defecto 30 % del total)
- **Pago completo**

Métodos: **Yape** o **transferencia bancaria**. El número de operación es
obligatorio: es la prueba de que el dinero entró.

El saldo se cobra en la entrega y sale impreso en grande en la orden interna,
que es lo que lleva el chofer.
