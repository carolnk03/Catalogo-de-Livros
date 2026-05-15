const express = require('express');
const router = express.Router();
const db = require('../database');

// CREATE - Adicionar livro
router.post('/', (req, res) => {
  try {
    const { title, author, pages, genre, rating, read } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Título e autor são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO books (title, author, pages, genre, rating, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      author,
      pages || 0,
      genre || 'Outro',
      rating || 0,
      read ? 1 : 0
    );

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Listar todos os livros (com filtros)
router.get('/', (req, res) => {
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

    // Ordenação
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
      case 'newest':
      default:
        query += ' ORDER BY created_at DESC';
    }

    const books = db.prepare(query).all(...params);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Buscar livro por ID
router.get('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Atualizar livro
router.put('/:id', (req, res) => {
  try {
    const { title, author, pages, genre, rating, read } = req.body;
    const bookId = req.params.id;

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }

    const stmt = db.prepare(`
      UPDATE books 
      SET title = ?, author = ?, pages = ?, genre = ?, rating = ?, read = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title || book.title,
      author || book.author,
      pages !== undefined ? pages : book.pages,
      genre || book.genre,
      rating !== undefined ? rating : book.rating,
      read !== undefined ? (read ? 1 : 0) : book.read,
      bookId
    );

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Remover livro
router.delete('/:id', (req, res) => {
  try {
    const bookId = req.params.id;
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

    if (!book) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }

    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
    res.json({ message: 'Livro removido com sucesso', book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Estatísticas
router.get('/stats/overview', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(read) as read_count,
        ROUND(AVG(CASE WHEN rating > 0 THEN rating END), 1) as avg_rating,
        COUNT(DISTINCT genre) as total_genres
      FROM books
    `).get();

    const genres = db.prepare(`
      SELECT genre, COUNT(*) as count 
      FROM books 
      GROUP BY genre 
      ORDER BY count DESC
    `).all();

    res.json({ ...stats, genres });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;