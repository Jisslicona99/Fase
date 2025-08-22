// js/shop.js
(function () {
  'use strict';

  // Base API (sirve tanto desde 3000 como Live Server)
  const API_BASE = (location.port === '3000') ? '' : 'http://localhost:3000';
  const money = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });

  // Mapeo de títulos por categoría
  const LABELS = {
    blusas: 'Camisetas',
    pantalones: 'Pantalones',
    zapatos: 'Zapatos'
  };

  let currentUser = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    currentUser = await getUser();
    if (currentUser) {
      await syncCartFromBackend(currentUser); // para badge/sugerencias
    }
    await cargarProductosAgrupados();
    actualizarContadorCarrito();
  }

  // ===== Usuario =====
  async function getUser() {
    try {
      const u = JSON.parse(localStorage.getItem('usuario'));
      if (u?.id) return u;
    } catch {}
    try {
      const me = await fetch(`${API_BASE}/api/me`, { credentials: 'include' }).then(r => r.json());
      if (me?.authenticated && me.user) {
        localStorage.setItem('usuario', JSON.stringify(me.user));
        return me.user;
      }
    } catch {}
    return null;
  }

  // ===== Carrito (LS por usuario) =====
  function cartKey() {
    return currentUser ? `carrito_${currentUser.username}` : 'carrito';
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(cartKey()) || '[]');
    } catch {
      return [];
    }
  }

  function setCart(list) {
    localStorage.setItem(cartKey(), JSON.stringify(list));
  }

  async function syncCartFromBackend(usuario) {
    try {
      const res = await fetch(`${API_BASE}/api/carrito/${usuario.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo obtener carrito');
      const carrito = await res.json(); // [{producto_id,cantidad,nombre,precio,imagen}]
      const normalized = carrito.map(p => ({
        id: Number(p.producto_id),
        nombre: String(p.nombre || ''),
        precio: Number(p.precio || 0),
        imagen: String(p.imagen || ''),
        cantidad: Number(p.cantidad || 0),
      }));
      localStorage.setItem(`carrito_${usuario.username}`, JSON.stringify(normalized));
    } catch (e) {
      console.warn('syncCartFromBackend:', e.message);
    }
  }

  // ===== Catalogo agrupado por categoría =====
  async function cargarProductosAgrupados() {
    const root = document.getElementById('productos-listado');
    if (!root) return;

    root.innerHTML = '';

    let productos = [];
    try {
      productos = await fetch(`${API_BASE}/api/catalogo`).then(r => r.json());
    } catch (err) {
      console.error('Error cargando productos:', err);
      root.innerHTML = '<p class="text-center w-100">Error cargando productos.</p>';
      return;
    }

    // Agrupar por categoría
    const grupos = {};
    for (const p of productos) {
      const cat = (p.categoria || 'otros').toLowerCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(p);
    }

    // Render
    Object.keys(grupos).forEach(cat => {
      const titulo = LABELS[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));

      const h = document.createElement('h3');
      h.className = 'mt-4 mb-3';
      h.textContent = titulo;
      root.appendChild(h);

      const fila = document.createElement('div');
      fila.className = 'row';
      root.appendChild(fila);

      grupos[cat].forEach(p => {
        const nombreBonito = p.descripcion ? String(p.descripcion) : String(p.nombre);
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        col.innerHTML = `
          <div class="card h-100">
            <img src="images/${escapeHtml(p.imagen)}" class="card-img-top" alt="${escapeHtml(nombreBonito)}" />
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${escapeHtml(nombreBonito)}</h5>
              <p class="card-text">${money.format(Number(p.precio))}</p>
              <button
                class="btn btn-primary mt-auto agregar-carrito"
                data-id="${p.id}"
                data-nombre="${escapeHtml(nombreBonito)}"
                data-precio="${p.precio}"
                data-imagen="${p.imagen}">
                Agregar al carrito
              </button>
            </div>
          </div>
        `;
        fila.appendChild(col);
      });
    });

    // Listeners de agregar
    root.querySelectorAll('.agregar-carrito').forEach(btn => {
      btn.addEventListener('click', onAddToCart);
    });
  }

  // ===== Agregar al carrito (+1) =====
  async function onAddToCart(e) {
    const btn = e.currentTarget;
    const id = Number(btn.dataset.id);
    const nombre = btn.dataset.nombre;
    const precio = Number(btn.dataset.precio);
    const imagen = btn.dataset.imagen;

    // Debe haber sesión
    if (!currentUser) {
      alert('Debes iniciar sesión para agregar productos al carrito');
      window.location.href = 'login.html';
      return;
    }

    try {
      // 1) Servidor (upsert +1)
      const r = await fetch(`${API_BASE}/api/carrito/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ producto_id: id, cantidad: 1 })
      });
      if (!r.ok) throw new Error('No se pudo agregar en el servidor');

      // 2) Reflejar en LocalStorage
      const cart = getCart();
      const found = cart.find(x => Number(x.id) === id);
      if (found) found.cantidad += 1;
      else cart.push({ id, nombre, precio, imagen, cantidad: 1 });
      setCart(cart);

      actualizarContadorCarrito();
      toast(`Se agregó “${nombre}” al carrito.`);
    } catch (err) {
      console.error(err);
      toast('No se pudo agregar al carrito', 'danger');
    }
  }

  // ===== Badge del carrito =====
  function actualizarContadorCarrito() {
    const span = document.getElementById('contador-carrito');
    if (!span) return;
    if (!currentUser) { span.textContent = ''; return; }
    const cart = getCart();
    const total = cart.reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
    span.textContent = total > 0 ? `(${total})` : '';
  }

  // ===== Utils =====
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(msg, type = 'success') {
    const z = document.getElementById('alert-zone');
    if (!z) { alert(msg); return; }
    z.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>`;
    setTimeout(() => { z.innerHTML = ''; }, 1800);
  }
})();
