// Obtener usuario actual
const usuario = JSON.parse(localStorage.getItem('usuario'));

// Inicializar carrito según usuario o carrito genérico
let carrito = [];

if (usuario) {
  carrito = JSON.parse(localStorage.getItem(`carrito_${usuario.username}`)) || [];
} else {
  carrito = JSON.parse(localStorage.getItem("carrito")) || [];
}

// Guardar carrito en el localStorage correcto
function guardarCarrito() {
  if (usuario) {
    localStorage.setItem(`carrito_${usuario.username}`, JSON.stringify(carrito));
  } else {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
  let existente = carrito.find(p => p.id === producto.id);

  if (existente) {
    existente.cantidad += 1;
  } else {
    producto.cantidad = 1;
    carrito.push(producto);
  }

  guardarCarrito();
  actualizarContadorCarrito();
  alert("Producto agregado al carrito");
}

// Actualizar contador carrito en la UI
function actualizarContadorCarrito() {
  const contador = carrito.reduce((acc, prod) => acc + prod.cantidad, 0);
  const contadorElem = document.getElementById("contador-carrito");
  if (contadorElem) {
    contadorElem.textContent = contador > 0 ? `(${contador})` : '';
  }
}

// Cargar productos desde el catálogo y mostrar en pantalla
fetch('data/catalogo.json')
  .then(response => {
    if (!response.ok) throw new Error('No se pudo cargar el archivo JSON');
    return response.json();
  })
  .then(productos => {
    const contenedor = document.getElementById('productos-listado');
    productos.forEach(prod => {
      const div = document.createElement('div');
      div.classList.add('col-md-4', 'mb-4');

      div.innerHTML = `
        <div class="card h-100 text-center">
          <img src="${prod.imagen}" alt="${prod.nombre}" style="object-fit:contain; max-height:200px;" class="card-img-top" />
          <div class="card-body">
            <h5 class="card-title">${prod.nombre}</h5>
            <p class="card-text text-success font-weight-bold">$${prod.precio}</p>
            <button class="btn btn-sm btn-outline-primary">Agregar al carrito</button>
          </div>
        </div>
      `;

      div.querySelector('button').addEventListener('click', () => agregarAlCarrito(prod));

      contenedor.appendChild(div);
    });

    localStorage.setItem('catalogo', JSON.stringify(productos));
  })
  .catch(error => {
    console.error("Error al cargar el catálogo:", error);
  });

// Actualizar contador al cargar
actualizarContadorCarrito();
