// Inicializamos el carrito desde localStorage
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// Función para agregar productos al carrito
function agregarAlCarrito(id) {
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  carrito.push(id);
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
      div.classList.add('col-md-4'); // cada producto ocupa 1/3 del ancho

      div.innerHTML = `
        <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
          <img src="${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
          <h4 class="mt-3">${prod.nombre}</h4>
          <p class="text-success font-weight-bold">$${prod.precio}</p>
          <button onclick="agregarAlCarrito(${prod.id})" class="btn btn-primary mt-2">Agregar al carrito</button>
        </div>
      `;
      contenedor.appendChild(div);
    });

    // Guardamos catálogo en localStorage para recomendaciones
    localStorage.setItem('catalogo', JSON.stringify(productos));
  })
  .catch(error => {
    console.error("Error al cargar el catálogo:", error);
  });
