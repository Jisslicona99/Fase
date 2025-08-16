document.addEventListener('DOMContentLoaded', async () => {
  const contenedor = document.getElementById('carrito');
  const totalSpan = document.getElementById('total');
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (!usuario || !usuario.id) {
    contenedor.innerHTML = `
      <div class="col-12 text-center mt-5">
        <h4>Debes iniciar sesión para ver el carrito</h4>
      </div>
    `;
    if (totalSpan) totalSpan.textContent = "$0.00";
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/api/carrito/${usuario.id}`);
    if (!res.ok) throw new Error('Error al obtener carrito');

    const carrito = await res.json();

    if (carrito.length === 0) {
      contenedor.innerHTML = `
        <div class="col-12 text-center mt-5">
          <h4>Tu carrito está vacío</h4>
        </div>
      `;
      if (totalSpan) totalSpan.textContent = "$0.00";
      return;
    }

    contenedor.innerHTML = '';
    let total = 0;

    carrito.forEach((prod) => {
      const subtotal = prod.precio * prod.cantidad;
      total += subtotal;

      const div = document.createElement('div');
      div.classList.add('col-md-4');

      div.innerHTML = `
        <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
          <img src="images/${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
          <h4 class="mt-3">${prod.nombre}</h4>
          <p class="text-success font-weight-bold">Precio: $${prod.precio.toFixed(2)}</p>
          <p class="mb-1">Cantidad: ${prod.cantidad}</p>
          <p class="mb-2"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
          <button class="btn btn-danger" onclick="eliminarProducto(${prod.producto_id})">Eliminar</button>
        </div>
      `;

      contenedor.appendChild(div);
    });

    if (totalSpan) {
      totalSpan.textContent = `$${total.toFixed(2)}`;
    }

  } catch (error) {
    console.error(error);
    contenedor.innerHTML = `
      <div class="col-12 text-center mt-5">
        <h4>Error cargando el carrito. Intenta recargar la página.</h4>
      </div>
    `;
  }
});

// Eliminar un producto específico del carrito del usuario
async function eliminarProducto(productoId) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario || !usuario.id) {
    alert('Debes iniciar sesión para modificar el carrito');
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/api/carrito/${usuario.id}/producto/${productoId}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Error eliminando producto');

    alert('Producto eliminado del carrito');
    location.reload();
  } catch (error) {
    alert('Error al eliminar producto');
    console.error(error);
  }
}

// Limpiar todo el carrito del usuario
async function limpiarCarrito() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario || !usuario.id) {
    alert('Debes iniciar sesión para limpiar el carrito');
    return;
  }

  if (!confirm('¿Seguro que quieres vaciar todo el carrito?')) return;

  try {
    const res = await fetch(`http://localhost:3000/api/carrito/${usuario.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Error limpiando carrito');

    alert('Carrito limpiado correctamente');
    location.reload();
  } catch (error) {
    alert('Error al limpiar el carrito');
    console.error(error);
  }
}

// Hacer funciones accesibles globalmente para botones HTML
window.eliminarProducto = eliminarProducto;
window.limpiarCarrito = limpiarCarrito;
