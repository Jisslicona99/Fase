// usar-ia.js

/**
 * Recomienda productos con base en el catálogo completo y el carrito actual del usuario.
 * 
 * @param {Array} catalogo - Todos los productos disponibles.
 * @param {Array} carrito - Productos actualmente en el carrito.
 * @returns {Array} Lista de productos recomendados (máx. 4).
 */
export function recomendar(catalogo, carrito) {
  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    console.warn('Catálogo vacío o no definido.');
    return [];
  }

  if (!Array.isArray(carrito)) carrito = [];

  // Obtener IDs de productos ya en el carrito
  const idsEnCarrito = carrito.map(p => p.id);

  // Filtrar productos del catálogo que NO están en el carrito
  const productosSugeridos = catalogo.filter(p => !idsEnCarrito.includes(p.id));

  // Si no quedan sugerencias, devolver los primeros 4 del catálogo original
  if (productosSugeridos.length === 0) {
    return catalogo.slice(0, 4);
  }

  // Elegir hasta 4 productos sugeridos
  return productosSugeridos.slice(0, 3);
}
