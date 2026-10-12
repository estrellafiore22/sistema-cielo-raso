// Utilidades para que cada cálculo devuelva su lista de materiales igual.

export function nuevaLista() {
  const items = [];
  return {
    items,
    // cantidad en unidad de CONSUMO del material (m², m, und, kg)
    sumar(codigo, cantidad, nota) { if (cantidad > 0) items.push({ codigo, cantidad, nota }); },
    // cantidad ya expresada en unidades de venta (barras, láminas contadas por el optimizador)
    piezas(codigo, n, nota) { if (n > 0) items.push({ codigo, cantidad: n, nota, enVenta: true }); },
  };
}
