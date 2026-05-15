const Database = require('better-sqlite3');
const path = require('path');

// Criar/conectar ao banco de dados
const db = new Database(path.join(__dirname, 'books.db'));

// Habilitar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    pages INTEGER DEFAULT 0,
    genre TEXT DEFAULT 'Outro',
    rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
    read INTEGER DEFAULT 0 CHECK(read IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Banco de dados inicializado com sucesso!');

module.exports = db;