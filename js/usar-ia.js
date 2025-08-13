import { recomendar } from './ia.js';

document.addEventListener('DOMContentLoaded', () => {
  const catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
  const carrito = JSON.parse(localStorage.getItem('carrito')) || [];

  const sugerencias = recomendar(catalogo, carrito);
  const contenedor = document.getElementById('sugerencias');

  sugerencias.forEach(prod => {
    const div = document.createElement('div');
    div.innerHTML = `
      <images src="${prod.imagen}" width="100"><br>
      <strong>${prod.nombre}</strong><br>
      <span>$${prod.precio}</span>
    `;
    contenedor.appendChild(div);
  });
});