const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Para recibir JSON en body de POST/PUT
app.use(express.json());

app.use(cors());
app.use('/images', express.static('images'));

// Conexión a MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'draknor'
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos exitosa');
});

// Endpoint para obtener catálogo
app.get('/api/catalogo', (req, res) => {
  const query = 'SELECT * FROM productos';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error en consulta:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

// --- NUEVAS RUTAS PARA CARRITO ---

// Obtener carrito del usuario
app.get('/api/carrito/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;

  const query = `
    SELECT c.producto_id, c.cantidad, p.nombre, p.precio, p.imagen
    FROM carrito c
    JOIN productos p ON c.producto_id = p.id
    WHERE c.usuario_id = ?
  `;

  connection.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Error obteniendo carrito:', err);
      return res.status(500).json({ error: 'Error al obtener carrito' });
    }
    res.json(results);
  });
});

// Agregar o actualizar producto en carrito
app.post('/api/carrito/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  const { producto_id, cantidad } = req.body;

  if (!producto_id || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // Insertar o actualizar cantidad (upsert)
  const query = `
    INSERT INTO carrito (usuario_id, producto_id, cantidad, added_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), added_at = NOW()
  `;

  connection.query(query, [usuarioId, producto_id, cantidad], (err, result) => {
    if (err) {
      console.error('Error agregando producto al carrito:', err);
      return res.status(500).json({ error: 'Error al agregar al carrito' });
    }
    res.json({ message: 'Producto agregado o actualizado en carrito' });
  });
});

// Eliminar un producto del carrito
app.delete('/api/carrito/:usuarioId/producto/:productoId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  const productoId = req.params.productoId;

  const query = `
    DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?
  `;

  connection.query(query, [usuarioId, productoId], (err, result) => {
    if (err) {
      console.error('Error eliminando producto del carrito:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    res.json({ message: 'Producto eliminado del carrito' });
  });
});

// Limpiar carrito completo del usuario
app.delete('/api/carrito/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;

  const query = `
    DELETE FROM carrito WHERE usuario_id = ?
  `;

  connection.query(query, [usuarioId], (err, result) => {
    if (err) {
      console.error('Error limpiando carrito:', err);
      return res.status(500).json({ error: 'Error al limpiar carrito' });
    }
    res.json({ message: 'Carrito limpiado' });
  });
});

app.use(express.json()); // Para poder leer JSON en body

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan campos username o password' });
  }

  // Consulta a la tabla usuarios para validar usuario y password
  // Asumo que tienes tabla 'usuarios' con columnas: id, username, email, password (password en texto plano para demo, mejor usar hash)
  const query = 'SELECT id, username, email, password FROM usuarios WHERE username = ?';

  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error en consulta login:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (results.length === 0) {
      // No encontró usuario
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = results[0];

    // Para demo: comparo texto plano, en producción usa bcrypt o similar
    if (user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Login OK: respondemos con id, username, email (sin password)
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
