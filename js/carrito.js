// public/js/carrito.js
(function () {
  // BACKEND: si NO estamos en :3000 (ej. Live Server :5500), usa http://localhost:3000
  const API_BASE = (location.port === '3000') ? '' : 'http://localhost:3000';

  let usuarioCache = null;
  let catalogCache = null; // <-- NUEVO: cache del catálogo por id

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    // intenta obtener usuario desde LS o sesión
    usuarioCache = getUserFromLS() || await getUserFromSession();
    const contenedor = document.getElementById('carrito');

    if (!usuarioCache || !usuarioCache.id) {
      contenedor.innerHTML = `
        <div class="col-12 text-center mt-5">
          <h4>Debes iniciar sesión para ver el carrito</h4>
        </div>
      `;
      actualizarTotales(0, 0);
      return;
    }

    // carga inicial
    await loadCart();

    // botón "Limpiar Carrito" (respetando tu UI)
    const btnLimpiar = document.getElementById('btn-limpiar');
    if (btnLimpiar) btnLimpiar.addEventListener('click', () => limpiarCarrito(usuarioCache));
  }

  // ----------- Carga/refresco -----------
  async function loadCart() {
    const contenedor = document.getElementById('carrito');

    try {
      const res = await fetch(`${API_BASE}/api/carrito/${usuarioCache.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener carrito');

      const carritoAPI = await res.json(); // [{producto_id,cantidad,nombre,descripcion,precio,imagen}]

      // Asegura catálogo en caché para nombres bonitos si falta 'descripcion'
      const catalogById = await ensureCatalog(); // Map<number, {id, nombre, descripcion, ...}>

      const carritoUI = carritoAPI.map(p => {
        const idNum = Number(p.producto_id);
        const catItem = catalogById.get(idNum);
        const displayName =
          (p.descripcion && String(p.descripcion).trim()) ||
          (catItem?.descripcion && String(catItem.descripcion).trim()) ||
          (catItem?.nombre && String(catItem.nombre).trim()) ||
          String(p.nombre || '');

        return {
          producto_id: idNum,
          id: idNum, // para usar-ia.js
          nombre: displayName,                 // <-- AQUI usamos el nombre “bonito”
          descripcion: String(p.descripcion || catItem?.descripcion || ''),
          precio: Number(p.precio || catItem?.precio || 0),
          imagen: String(p.imagen || catItem?.imagen || ''),
          cantidad: Number(p.cantidad || 0),
        };
      });

      // sincroniza para sugerencias (usar-ia.js)
      localStorage.setItem(`carrito_${usuarioCache.username}`, JSON.stringify(carritoUI));
      try { window.dispatchEvent(new CustomEvent('carrito:synced')); } catch {}

      // render
      renderCarrito(contenedor, carritoUI);

      // totales + contador
      const total = carritoUI.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
      const totalItems = carritoUI.reduce((acc, p) => acc + p.cantidad, 0);
      actualizarTotales(total, totalItems);

    } catch (err) {
      console.error(err);
      contenedor.innerHTML = `
        <div class="col-12 text-center mt-5">
          <h4>Error cargando el carrito. Intenta recargar la página.</h4>
        </div>
      `;
      actualizarTotales(0, 0);
    }
  }

  // ----------- Catálogo en caché (NUEVO) -----------
  async function ensureCatalog() {
    if (catalogCache) return catalogCache;
    try {
      const productos = await fetch(`${API_BASE}/api/catalogo`).then(r => r.json());
      const map = new Map();
      for (const p of productos) {
        map.set(Number(p.id), {
          id: Number(p.id),
          nombre: String(p.nombre || ''),
          descripcion: String(p.descripcion || ''),
          precio: Number(p.precio || 0),
          imagen: String(p.imagen || ''),
          categoria: String(p.categoria || '')
        });
      }
      catalogCache = map;
      return catalogCache;
    } catch {
      // si falla, devuelve un Map vacío para no romper el flujo
      catalogCache = new Map();
      return catalogCache;
    }
  }

  // ----------- Render listado -----------
  function renderCarrito(contenedor, carrito) {
    if (!Array.isArray(carrito) || carrito.length === 0) {
      contenedor.innerHTML = `
        <div class="col-12 text-center mt-5">
          <h4>Tu carrito está vacío</h4>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = '';

    for (const prod of carrito) {
      const subtotal = Number(prod.precio) * Number(prod.cantidad);

      const div = document.createElement('div');
      div.classList.add('col-md-4');

      div.innerHTML = `
        <div class="product-box text-center p-3" style="border:1px solid #ddd; margin-bottom: 30px;">
          <img src="images/${escapeHtml(prod.imagen)}" alt="${escapeHtml(prod.nombre)}"
               style="width:100%; max-height:200px; object-fit:contain;">
          <h4 class="mt-3">${escapeHtml(prod.nombre)}</h4>
          <p class="text-success font-weight-bold">Precio: $${Number(prod.precio).toFixed(2)}</p>

          <div class="d-flex justify-content-center align-items-center gap-2 mb-2">
            <button class="btn btn-sm btn-outline-secondary" data-dec data-id="${prod.producto_id}">−</button>
            <span class="px-2" data-qty="${prod.producto_id}">${Number(prod.cantidad)}</span>
            <button class="btn btn-sm btn-outline-secondary" data-inc data-id="${prod.producto_id}">+</button>
          </div>

          <p class="mb-2"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
          <button class="btn btn-danger" data-remove="${prod.producto_id}">Eliminar</button>
        </div>
      `;
      contenedor.appendChild(div);
    }

    // Listeners − / +
    contenedor.querySelectorAll('[data-inc]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await cambiarCantidad(id, +1);
      });
    });
    contenedor.querySelectorAll('[data-dec]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await cambiarCantidad(id, -1);
      });
    });

    // Eliminar
    contenedor.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.remove);
        await eliminarProducto(id);
      });
    });
  }

  // ----------- Acciones -----------
  async function cambiarCantidad(productoId, delta) {
    const qtySpan = document.querySelector(`[data-qty="${productoId}"]`);
    const actual = Number(qtySpan?.textContent || 0);
    const nueva = actual + delta;

    try {
      if (nueva <= 0) {
        await fetch(`${API_BASE}/api/carrito/${usuarioCache.id}/producto/${productoId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } else {
        await fetch(`${API_BASE}/api/carrito/${usuarioCache.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ producto_id: productoId, cantidad: delta })
        });
      }
      await loadCart();
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar la cantidad');
    }
  }

  async function eliminarProducto(productoId) {
    try {
      const res = await fetch(`${API_BASE}/api/carrito/${usuarioCache.id}/producto/${productoId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Error eliminando producto');

      const key = `carrito_${usuarioCache.username}`;
      let carrito = safeJSON(localStorage.getItem(key)) || [];
      carrito = carrito.filter(p => Number(p.id) !== Number(productoId));
      localStorage.setItem(key, JSON.stringify(carrito));
      try { window.dispatchEvent(new CustomEvent('carrito:synced')); } catch {}

      await loadCart();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar producto');
    }
  }

  async function limpiarCarrito(usuario) {
    if (!usuario || !usuario.id) return alert('Debes iniciar sesión para limpiar el carrito');
    if (!confirm('¿Seguro que quieres vaciar todo el carrito?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/carrito/${usuario.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Error limpiando carrito');

      localStorage.setItem(`carrito_${usuario.username}`, JSON.stringify([]));
      try { window.dispatchEvent(new CustomEvent('carrito:synced')); } catch {}

      await loadCart();
      alert('Carrito limpiado correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al limpiar el carrito');
    }
  }

  // ----------- Totales / contador -----------
  function actualizarTotales(total, totalItems) {
    const impuestos = total * 0.16;
    const totalConImpuestos = total + impuestos;

    setText('total-items', totalItems);
    setText('total-sin-impuestos', total.toFixed(2));
    setText('impuestos', impuestos.toFixed(2));
    setText('total-con-impuestos', totalConImpuestos.toFixed(2));

    const contadorCarrito = document.getElementById('contador-carrito');
    if (contadorCarrito) contadorCarrito.textContent = totalItems > 0 ? `(${totalItems})` : '';
  }

  // ----------- Helpers -----------
  function getUserFromLS() {
    return safeJSON(localStorage.getItem('usuario'));
  }
  async function getUserFromSession() {
    try {
      const me = await fetch(`${API_BASE}/api/me`, { credentials: 'include' }).then(r => r.json());
      return (me?.authenticated && me.user) ? me.user : null;
    } catch { return null; }
  }
  function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // Exponer por compatibilidad si tu HTML los llama
  window.limpiarCarrito = limpiarCarrito;
})();
