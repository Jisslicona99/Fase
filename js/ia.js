export function recomendar(catalogo, carrito) {
  const recomendaciones = [];
  const categoriasRelacionadas = {
    blusas: 'pantalones',
    pantalones: 'zapatos',
    zapatos: 'blusas'
  };

  // Creamos un Set para evitar productos duplicados
  const productosRecomendados = new Set();

  carrito.forEach(prod => {
    const categoriaRelacionada = categoriasRelacionadas[prod.categoria];

    if (categoriaRelacionada) {
      // Filtra productos que coinciden con la categoría relacionada
      // y que NO están ya en el carrito
      const relacionados = catalogo.filter(p =>
        p.categoria === categoriaRelacionada &&
        !carrito.some(c => c.id === p.id)
      );

      // Mezclar recomendaciones (aleatorias)
      const mezclados = relacionados.sort(() => 0.5 - Math.random());

      // Agregamos hasta 3 productos únicos que no se hayan sugerido antes
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

