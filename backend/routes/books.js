const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase } = require('../database');

// Middleware para garantir que o banco está disponível
router.use(async (req, res, next) => {
  try {
    req.db = await getDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao conectar ao banco de dados' });
  }
});

// CREATE - Adicionar livro
router.post('/', async (req, res) => {
  try {
    const { title, author, pages, genre, rating, read } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Título e autor são obrigatórios' });
    }

    const stmt = req.db.prepare(`
      INSERT INTO books (title, author, pages, genre, rating, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      title,
      author,
      pages || 0,
      genre || 'Outro',
      rating || 0,
      read ? 1 : 0
    ]);
    stmt.free();

    saveDatabase();

    const result = req.db.exec('SELECT last_insert_rowid() as id');
    const bookId = result[0].values[0][0];
    
    const bookData = req.db.exec(`SELECT * FROM books WHERE id = ${bookId}`);
    const book = {
      id: bookData[0].values[0][0],
      title: bookData[0].values[0][1],
      author: bookData[0].values[0][2],
      pages: bookData[0].values[0][3],
      genre: bookData[0].values[0][4],
      rating: bookData[0].values[0][5],
      read: bookData[0].values[0][6],
      created_at: bookData[0].values[0][7],
      updated_at: bookData[0].values[0][8]
    };

    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Listar todos os livros
router.get('/', async (req, res) => {
  try {
    const { genre, read, sort } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (genre && genre !== 'all') {
      query += ' AND genre = ?';
      params.push(genre);
    }

    if (read !== undefined && read !== 'all') {
      query += ' AND read = ?';
      params.push(read === 'true' ? 1 : 0);
    }

    switch (sort) {
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      case 'title':
        query += ' ORDER BY title ASC';
        break;
      case 'rating':
        query += ' ORDER BY rating DESC';
        break;
      case 'pages':
        query += ' ORDER BY pages DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    const stmt = req.db.prepare(query);
    stmt.bind(params);
    
    const books = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      books.push({
        ...row,
        read: Boolean(row.read)
      });
    }
    stmt.free();

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Buscar livro por ID
router.get('/:id', async (req, res) => {
  try {
    const stmt = req.db.prepare('SELECT * FROM books WHERE id = ?');
    stmt.bind([req.params.id]);
    
    if (stmt.step()) {
      const book = stmt.getAsObject();
      book.read = Boolean(book.read);
      res.json(book);
    } else {
      res.status(404).json({ error: 'Livro não encontrado' });
    }
    stmt.free();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Atualizar livro
router.put('/:id', async (req, res) => {
  try {
    const { title, author, pages, genre, rating, read } = req.body;
    const bookId = req.params.id;

    // Verificar se existe
    const checkStmt = req.db.prepare('SELECT * FROM books WHERE id = ?');
    checkStmt.bind([bookId]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    
    const existingBook = checkStmt.getAsObject();
    checkStmt.free();

    const stmt = req.db.prepare(`
      UPDATE books 
      SET title = ?, author = ?, pages = ?, genre = ?, rating = ?, read = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run([
      title || existingBook.title,
      author || existingBook.author,
      pages !== undefined ? pages : existingBook.pages,
      genre || existingBook.genre,
      rating !== undefined ? rating : existingBook.rating,
      read !== undefined ? (read ? 1 : 0) : existingBook.read,
      bookId
    ]);
    stmt.free();

    saveDatabase();

    // Buscar atualizado
    const resultStmt = req.db.prepare('SELECT * FROM books WHERE id = ?');
    resultStmt.bind([bookId]);
    resultStmt.step();
    const updatedBook = resultStmt.getAsObject();
    updatedBook.read = Boolean(updatedBook.read);
    resultStmt.free();

    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Remover livro
router.delete('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    
    const checkStmt = req.db.prepare('SELECT * FROM books WHERE id = ?');
    checkStmt.bind([bookId]);
    
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    
    const book = checkStmt.getAsObject();
    checkStmt.free();

    const stmt = req.db.prepare('DELETE FROM books WHERE id = ?');
    stmt.run([bookId]);
    stmt.free();
    
    saveDatabase();

    res.json({ message: 'Livro removido com sucesso', book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Estatísticas
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = req.db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(read) as read_count,
        ROUND(AVG(CASE WHEN rating > 0 THEN rating END), 1) as avg_rating,
        COUNT(DISTINCT genre) as total_genres
      FROM books
    `);

    const genres = req.db.exec(`
      SELECT genre, COUNT(*) as count 
      FROM books 
      GROUP BY genre 
      ORDER BY count DESC
    `);

    res.json({
      total: stats[0].values[0][0],
      read_count: stats[0].values[0][1],
      avg_rating: stats[0].values[0][2],
      total_genres: stats[0].values[0][3],
      genres: genres[0] ? genres[0].values.map(row => ({
        genre: row[0],
        count: row[1]
      })) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
