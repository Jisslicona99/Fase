// Inicializamos el carrito desde localStorage
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// Función para agregar productos al carrito
function agregarAlCarrito(producto) {
  // Revisamos si ya existe en el carrito
  let existente = carrito.find(p => p.id === producto.id);
  
  if (existente) {
    existente.cantidad += 1;
  } else {
    producto.cantidad = 1;
    carrito.push(producto);
  }

  localStorage.setItem('carrito', JSON.stringify(carrito));
  alert("Producto agregado al carrito");
}

// Cargar productos desde catalogo.json y mostrarlos en el HTML
fetch('data/catalogo.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('No se pudo cargar el archivo JSON');
    }
    return response.json();
  })
  .then(productos => {
    const contenedor = document.getElementById('catalogo');

    productos.forEach(prod => {
      const div = document.createElement('div');
      div.classList.add('col-md-4');

      div.innerHTML = `
        <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
          <img src="${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
          <h4 class="mt-3">${prod.nombre}</h4>
          <p class="text-success font-weight-bold">$${prod.precio}</p>
          <button class="btn btn-primary mt-2" onclick='agregarAlCarrito(${JSON.stringify(prod)})'>Agregar al carrito</button>
        </div>
      `;
      contenedor.appendChild(div);
    });

    // Guardamos el catálogo para otras funciones (IA, recomendaciones, etc.)
    localStorage.setItem('catalogo', JSON.stringify(productos));
  })
  .catch(error => {
    console.error("Error al cargar el catálogo:", error);
  });

  function actualizarContadorCarrito() {
  const contador = carrito.reduce((acc, prod) => acc + prod.cantidad, 0);
  document.getElementById("contador-carrito").textContent = contador > 0 ? `(${contador})` : '';
}

// Llamar al cargar
actualizarContadorCarrito();