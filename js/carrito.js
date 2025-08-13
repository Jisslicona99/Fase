//Leer Ids guardados en el carrito
//Buscar productos en el catalogo
//Mostrarlos en total de compra

document.addEventListener('DOMContentLoaded', () => {
  const catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
  const carrito = JSON.parse(localStorage.getItem('carrito')) || [];

  const contenedor = document.getElementById('carrito');

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="col-12 text-center mt-5">
        <h4>Tu carrito está vacío</h4>
      </div>
    `;
    return;
  }

  carrito.forEach(id => {
    const prod = catalogo.find(p => p.id === id);
    if (prod) {
      const div = document.createElement('div');
      div.classList.add('col-md-4');

      div.innerHTML = `
        <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
          <images src="${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
          <h4 class="mt-3">${prod.nombre}</h4>
          <p class="text-success font-weight-bold">$${prod.precio}</p>
        </div>
      `;
      contenedor.appendChild(div);
    }
  });
});
