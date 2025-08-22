// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// ---------- Middlewares base ----------
app.use(express.json());

// ============ CORS robusto ============
const allowedOrigins = new Set([
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000' // si sirves front desde el propio Express
]);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ============ Logger sencillo ============
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}  Origin:${req.headers.origin || 'n/a'}`);
  next();
});

// Archivos estáticos (imágenes + páginas públicas)
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MySQL (pool) ----------
const DB_OPTIONS = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'draknor',
  waitForConnections: true,
  connectionLimit: 10
};
const pool = mysql.createPool(DB_OPTIONS);

// Helper para queries
async function q(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ---------- Sesiones persistentes en MySQL ----------
const sessionStore = new MySQLStore(DB_OPTIONS); // su propio pool interno
app.use(session({
  secret: 'cambia_este_secreto_super_largo_Y_unico',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 horas
    httpOnly: true,
    secure: false,              // true si usas HTTPS
    sameSite: 'lax'
  }
}));

// Utilidad: obtener userId (prioriza sesión)
function getUserId(req) {
  if (req.session?.user?.id) return req.session.user.id;
  if (req.params?.usuarioId) return parseInt(req.params.usuarioId, 10); // compatibilidad
  return null;
}

// =====================================================
//                   HEALTH CHECK
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// =====================================================
//                    AUTH
// =====================================================

// Sirve la página de login (opcional)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// REGISTRO
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Faltan campos' });

    const exist = await q(
      'SELECT id FROM usuarios WHERE username=? OR email=? LIMIT 1',
      [username, email]
    );
    if (exist.length) return res.status(400).json({ error: 'Usuario o email ya existen' });

    const hash = await bcrypt.hash(password, 12);
    await q(
      'INSERT INTO usuarios (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [username, email, hash]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('REGISTER error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// LOGIN (por username o email)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body; // también acepta email en "username"
    if (!username || !password)
      return res.status(400).json({ error: 'Faltan campos username o password' });

    const rows = await q(
      'SELECT id, username, email, password FROM usuarios WHERE username=? OR email=? LIMIT 1',
      [username, username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    req.session.user = { id: user.id, username: user.username, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error('LOGIN error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// SABER SI HAY SESIÓN
app.get('/api/me', (req, res) => {
  if (req.session?.user) return res.json({ authenticated: true, user: req.session.user });
  res.json({ authenticated: false });
});

// LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// =====================================================
//                    CATÁLOGO
// =====================================================
app.get('/api/catalogo', async (req, res) => {
  try {
    const rows = await q('SELECT * FROM productos');
    res.json(rows);
  } catch (e) {
    console.error('Error en consulta catálogo:', e);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// =====================================================
//                    CARRITO
// =====================================================

// Handlers compartidos
const getCarrito = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });

    const rows = await q(
      `SELECT c.producto_id, c.cantidad, p.nombre, p.descripcion, p.precio, p.imagen
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?`,
      [usuarioId] // <- aquí va la coma que faltaba
    );

    res.json(rows);
  } catch (e) {
    console.error('Error obteniendo carrito:', e);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
};

const addUpdateCarrito = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    const { producto_id, cantidad } = req.body;

    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });
    if (!producto_id || !cantidad) return res.status(400).json({ error: 'Faltan datos' });

    await q(
      `INSERT INTO carrito (usuario_id, producto_id, cantidad, added_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), added_at = NOW()`,
      [usuarioId, producto_id, cantidad]
    );
    res.json({ message: 'Producto agregado o actualizado en carrito' });
  } catch (e) {
    console.error('Error agregando producto al carrito:', e);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
};

const addMultipleCarrito = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    const productos = req.body.productos;

    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });
    if (!Array.isArray(productos) || productos.length === 0)
      return res.status(400).json({ error: 'Se requiere un array de productos' });

    for (const p of productos) {
      await q(
        `INSERT INTO carrito (usuario_id, producto_id, cantidad, added_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), added_at = NOW()`,
        [usuarioId, p.producto_id, p.cantidad]
      );
    }
    res.json({ message: 'Productos sugeridos agregados al carrito' });
  } catch (e) {
    console.error('Error agregando múltiples productos:', e);
    res.status(500).json({ error: 'Error al agregar productos' });
  }
};

const deleteProducto = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    const productoId = parseInt(req.params.productoId, 10);

    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });

    await q('DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?', [usuarioId, productoId]);
    res.json({ message: 'Producto eliminado del carrito' });
  } catch (e) {
    console.error('Error eliminando producto del carrito:', e);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

const clearCarrito = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });

    await q('DELETE FROM carrito WHERE usuario_id = ?', [usuarioId]);
    res.json({ message: 'Carrito limpiado' });
  } catch (e) {
    console.error('Error limpiando carrito:', e);
    res.status(500).json({ error: 'Error al limpiar carrito' });
  }
};

// Rutas SIN '?' y con compatibilidad
app.get('/api/carrito', getCarrito);
app.get('/api/carrito/:usuarioId', getCarrito);

app.post('/api/carrito', addUpdateCarrito);
app.post('/api/carrito/:usuarioId', addUpdateCarrito);

app.post('/api/carrito-multiple', addMultipleCarrito);
app.post('/api/carrito-multiple/:usuarioId', addMultipleCarrito);

app.delete('/api/carrito/producto/:productoId', deleteProducto);
app.delete('/api/carrito/:usuarioId/producto/:productoId', deleteProducto);

app.delete('/api/carrito', clearCarrito);
app.delete('/api/carrito/:usuarioId', clearCarrito);

// =====================================================
//                 SUGERENCIAS
// =====================================================
const getSugerencias = async (req, res) => {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) return res.json([]); // sin sesión no sugerimos

    const carritoItems = await q(
      `SELECT c.producto_id, p.categoria
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?`,
      [usuarioId]
    );

    if (!carritoItems.length) return res.json([]);

    const categoriasRelacionadas = {
      blusas: 'pantalones',
      pantalones: 'zapatos',
      zapatos: 'blusas'
    };

    const categoriasCarrito = carritoItems.map(item => item.categoria);
    const categoriasSugeridas = new Set();
    categoriasCarrito.forEach(cat => {
      const relacionada = categoriasRelacionadas[cat];
      if (relacionada) categoriasSugeridas.add(relacionada);
    });

    if (!categoriasSugeridas.size) return res.json([]);

    const productosEnCarrito = carritoItems.map(item => item.producto_id);
    const sugerencias = await q(
      `SELECT * FROM productos
       WHERE categoria IN (?) AND id NOT IN (?)`,
      [Array.from(categoriasSugeridas), productosEnCarrito.length ? productosEnCarrito : [0]]
    );

    sugerencias.sort(() => 0.5 - Math.random()); // aleatoriza
    res.json(sugerencias.slice(0, 3));
  } catch (e) {
    console.error('Error obteniendo sugerencias:', e);
    res.status(500).json({ error: 'Error interno al obtener sugerencias' });
  }
};

app.get('/api/sugerencias', getSugerencias);
app.get('/api/sugerencias/:usuarioId', getSugerencias);

// ---------- Arranque ----------
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
