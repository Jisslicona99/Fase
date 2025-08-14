import { recomendar } from './ia.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("usar-ia.js cargado");

  const catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
  const carrito = JSON.parse(localStorage.getItem('carrito')) || [];

  console.log("Catálogo:", catalogo);
  console.log("Carrito:", carrito);

  const sugerencias = recomendar(catalogo, carrito);
  console.log("Sugerencias:", sugerencias);

  const contenedor = document.getElementById('sugerencias');
  if (!contenedor) {
    console.warn("No existe el contenedor #sugerencias");
    return;
  }

  if (sugerencias.length === 0) {
    contenedor.innerHTML = `<p class="text-center">No hay sugerencias por el momento.</p>`;
    return;
  }

  sugerencias.forEach(prod => {
    const div = document.createElement('div');
    div.classList.add('col-md-4');
    div.innerHTML = `
      <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
        <img src="${prod.imagen}" alt="${prod.nombre}" style="width:100%; max-height:200px; object-fit:contain;">
        <h4 class="mt-3">${prod.nombre}</h4>
        <p class="text-success font-weight-bold">$${prod.precio}</p>
      </div>
    `;
    contenedor.appendChild(div);
  });
});

