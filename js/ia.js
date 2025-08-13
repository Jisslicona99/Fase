export function recomendar(catalogo, carritoIds) {
  const recomendaciones = [];

  carritoIds.forEach(id => {
    const prod = catalogo.find(p => p.id === id);

    if (prod && prod.categoria === 'blusas') {
      const relacionados = catalogo.filter(p => p.categoria === 'pantalones');
      if (relacionados.length > 0) recomendaciones.push(relacionados[0]);
    }

    if (prod && prod.categoria === 'pantalones') {
      const relacionados = catalogo.filter(p => p.categoria === 'zapatos');
      if (relacionados.length > 0) recomendaciones.push(relacionados[0]);
    }
  });

  return recomendaciones;
}