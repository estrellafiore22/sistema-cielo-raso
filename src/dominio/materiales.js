// Catálogo de materiales: consulta, alta, edición y precios.
// Sin DOM. Recibe y devuelve datos.

import * as bd from '../core/bd.js';
import { redondear } from '../core/formato.js';

export function listar({ soloActivos = true, categoria = null } = {}) {
  let lista = bd.todos('materiales');
  if (soloActivos) lista = lista.filter((m) => m.activo !== false);
  if (categoria) lista = lista.filter((m) => m.categoria === categoria);
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function obtener(id) {
  return bd.buscarPorId('materiales', id);
}

export function categorias() {
  return bd.todos('categorias').sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Materiales agrupados por categoría, para el catálogo de material suelto. */
export function porCategoria({ soloActivos = true } = {}) {
  const materiales = listar({ soloActivos });
  return categorias()
    .map((categoria) => ({
      categoria,
      materiales: materiales.filter((m) => m.categoria === categoria.id),
    }))
    .filter((grupo) => grupo.materiales.length > 0);
}

export function buscar(texto) {
  const termino = String(texto || '').trim().toLowerCase();
  if (!termino) return listar();
  return listar().filter((m) => m.nombre.toLowerCase().includes(termino));
}

/**
 * Crea un material. Al crearlo también aparece su fila de inventario en cero,
 * para que no haya materiales sin stock registrado.
 */
export function crear(datos) {
  const validacion = validar(datos);
  if (!validacion.ok) return validacion;

  const material = bd.insertar('materiales', {
    id: datos.id || undefined,
    nombre: String(datos.nombre).trim(),
    categoria: datos.categoria,
    ...unidades(datos),
    precioCompra: Number(datos.precioCompra) || 0,
    precioVenta: Number(datos.precioVenta) || 0,
    rendimiento: datos.rendimiento ? Number(datos.rendimiento) : null,
    activo: true,
  });

  if (!bd.donde('inventario', { material: material.id }).length) {
    bd.insertar('inventario', {
      id: 'inv_' + material.id,
      material: material.id,
      cantidad: 0,
      minimo: 0,
      ubicacion: 'Almacén principal',
    });
  }

  return { ok: true, material };
}

export function editar(id, cambios) {
  const actual = obtener(id);
  if (!actual) return { ok: false, error: 'El material no existe' };

  const propuesto = { ...actual, ...cambios };
  const validacion = validar(propuesto);
  if (!validacion.ok) return validacion;

  const material = bd.actualizar('materiales', id, {
    nombre: String(propuesto.nombre).trim(),
    categoria: propuesto.categoria,
    ...unidades(propuesto),
    precioCompra: Number(propuesto.precioCompra) || 0,
    precioVenta: Number(propuesto.precioVenta) || 0,
    rendimiento: propuesto.rendimiento ? Number(propuesto.rendimiento) : null,
    activo: propuesto.activo !== false,
  });
  return { ok: true, material };
}

/** Atajo para la pantalla de precios, que solo toca esos dos campos. */
export function actualizarPrecios(id, precioCompra, precioVenta) {
  return editar(id, {
    precioCompra: Number(precioCompra),
    precioVenta: Number(precioVenta),
  });
}

/**
 * No se borra de verdad: se desactiva. Un material eliminado seguiría siendo
 * necesario para leer pedidos y boletas antiguas.
 */
export function desactivar(id) {
  const material = bd.actualizar('materiales', id, { activo: false });
  return material
    ? { ok: true, material }
    : { ok: false, error: 'El material no existe' };
}

export function reactivar(id) {
  const material = bd.actualizar('materiales', id, { activo: true });
  return material
    ? { ok: true, material }
    : { ok: false, error: 'El material no existe' };
}

/** Margen de ganancia en soles y en porcentaje. */
export function margen(material) {
  const compra = Number(material.precioCompra) || 0;
  const venta = Number(material.precioVenta) || 0;
  const ganancia = redondear(venta - compra);
  const porcentaje = compra > 0 ? redondear((ganancia / compra) * 100, 1) : 0;
  return { ganancia, porcentaje };
}

/**
 * Normaliza el par de unidades. Si el material no se fracciona en unidades más
 * chicas, la de consumo es la misma que la de venta y el factor es 1.
 */
function unidades(datos) {
  const porVenta = Number(datos.porVenta);
  const consumo = String(datos.unidadConsumo || '').trim();
  const separa = consumo && Number.isFinite(porVenta) && porVenta > 1;

  return {
    unidad: String(datos.unidad || 'unidad').trim(),
    unidadConsumo: separa ? consumo : null,
    porVenta: separa ? porVenta : 1,
    fraccionable: Boolean(datos.fraccionable),
  };
}

/** Cuántas unidades de consumo trae una unidad de venta. Nunca menos de 1. */
export function porVenta(material) {
  const n = Number(material?.porVenta);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Cómo se cuenta en obra: "tornillo", "kg", o la unidad de venta si no se parte. */
export function unidadDeConsumo(material) {
  return material?.unidadConsumo || material?.unidad || 'unidad';
}

function validar(datos) {
  if (!datos.nombre || !String(datos.nombre).trim()) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }
  if (!datos.categoria) {
    return { ok: false, error: 'Elige una categoría' };
  }
  if (!bd.buscarPorId('categorias', datos.categoria)) {
    return { ok: false, error: 'Esa categoría no existe' };
  }
  if (datos.unidadConsumo && !(Number(datos.porVenta) > 1)) {
    return {
      ok: false,
      error: 'Si defines una unidad de consumo, indica cuántas trae la unidad de venta',
    };
  }
  const compra = Number(datos.precioCompra);
  const venta = Number(datos.precioVenta);
  if (!Number.isFinite(compra) || compra < 0) {
    return { ok: false, error: 'El precio de compra no es válido' };
  }
  if (!Number.isFinite(venta) || venta < 0) {
    return { ok: false, error: 'El precio de venta no es válido' };
  }
  return { ok: true };
}
