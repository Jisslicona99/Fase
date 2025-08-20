export function recomendar(catalogo, carrito) {
  const recomendaciones = [];

  if (!Array.isArray(catalogo) || !Array.isArray(carrito) || carrito.length === 0) {
    return [];
  }

  const categoriasRelacionadas = {
    blusas: 'pantalones',
    pantalones: 'zapatos',
    zapatos: 'blusas'
  };

  const productosRecomendados = new Set();
  const idsEnCarrito = carrito.map(p => p.id || p.producto_id);

  carrito.forEach(prod => {
    const categoria = prod.categoria?.toLowerCase();
    const categoriaRelacionada = categoriasRelacionadas[categoria];

    if (categoriaRelacionada) {
      const relacionados = catalogo.filter(p =>
        p.categoria?.toLowerCase() === categoriaRelacionada &&
        !idsEnCarrito.includes(p.id)
      );

      const mezclados = relacionados.sort(() => 0.5 - Math.random());

      for (const item of mezclados) {
        if (!productosRecomendados.has(item.id)) {
          recomendaciones.push(item);
          productosRecomendados.add(item.id);
        }

        if (recomendaciones.length >= 3) break;
      }
    }
  });

  return recomendaciones;
}
