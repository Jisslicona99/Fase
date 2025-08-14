document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('carrito');
  const totalSpan = document.getElementById('total');
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="col-12 text-center mt-5">
        <h4>Tu carrito está vacío</h4>
      </div>
    `;
    if (totalSpan) totalSpan.textContent = "$0.00";
    return;
  }

  contenedor.innerHTML = ''; // limpiar antes de renderizar
  let total = 0;

  carrito.forEach((prod, index) => {
    const subtotal = prod.precio * prod.cantidad;
    total += subtotal;

    const div = document.createElement('div');
    div.classList.add('col-md-4');

    div.innerHTML = `
      <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
        <img src="${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
        <h4 class="mt-3">${prod.nombre}</h4>
        <p class="text-success font-weight-bold">Precio: $${prod.precio}</p>
        <p class="mb-1">Cantidad: ${prod.cantidad}</p>
        <p class="mb-2"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
        <button class="btn btn-danger" onclick="eliminarProducto(${index})">Eliminar</button>
      </div>
    `;

    contenedor.appendChild(div);
  });

  if (totalSpan) {
    totalSpan.textContent = `$${total.toFixed(2)}`;
  }
});

// Función para eliminar producto
function eliminarProducto(index) {
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  carrito.splice(index, 1);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  location.reload();
}

// Exportamos para que el HTML pueda llamar a eliminarProducto
window.eliminarProducto = eliminarProducto;
