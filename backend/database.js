const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'books.db');

let db;

async function getDatabase() {
  if (db) return db;
  const SQL = await initSqlJs();
  
  // Carregar banco existente ou criar novo
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (error) {
    db = new SQL.Database();
  }
  
  // Criar tabelas
  db.run(`
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
  
  // Salvar no disco
  saveDatabase();
  
  console.log('✅ Banco de dados inicializado com sucesso!');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

module.exports = { getDatabase, saveDatabase };
