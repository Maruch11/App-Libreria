import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('books.db');

export async function initDb() {
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT NOT NULL UNIQUE,
      title TEXT,
      author TEXT,
      publisher TEXT,
      published_year INTEGER,
      reading_status TEXT DEFAULT 'pendiente',
      progress INTEGER DEFAULT 0,
      rating INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
  `);
}

export async function upsertBook(book) {
  const db = await dbPromise;
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync('SELECT id FROM books WHERE isbn = ?', [book.isbn]);

  if (existing?.id) {
    await db.runAsync(
      `UPDATE books SET
        title = ?, author = ?, publisher = ?, published_year = ?,
        reading_status = ?, progress = ?, rating = ?, updated_at = ?
       WHERE id = ?`,
      [
        book.title ?? null,
        book.author ?? null,
        book.publisher ?? null,
        book.publishedYear ?? null,
        book.readingStatus ?? 'pendiente',
        Number.isFinite(book.progress) ? book.progress : 0,
        Number.isFinite(book.rating) ? book.rating : null,
        now,
        existing.id,
      ]
    );
    return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO books (
      isbn, title, author, publisher, published_year, reading_status, progress, rating, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.isbn,
      book.title ?? null,
      book.author ?? null,
      book.publisher ?? null,
      book.publishedYear ?? null,
      book.readingStatus ?? 'pendiente',
      Number.isFinite(book.progress) ? book.progress : 0,
      Number.isFinite(book.rating) ? book.rating : null,
      now,
      now,
    ]
  );

  return result.lastInsertRowId;
}

export async function listBooks(orderBy = 'title') {
  const db = await dbPromise;
  const safeOrderBy = orderBy === 'author' ? 'author' : 'title';
  return db.getAllAsync(
    `SELECT * FROM books ORDER BY ${safeOrderBy} COLLATE NOCASE ASC, title COLLATE NOCASE ASC`
  );
}

export async function updateBookFields(id, fields) {
  const db = await dbPromise;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE books SET reading_status = ?, progress = ?, rating = ?, updated_at = ? WHERE id = ?`,
    [
      fields.readingStatus ?? 'pendiente',
      Number.isFinite(fields.progress) ? fields.progress : 0,
      Number.isFinite(fields.rating) ? fields.rating : null,
      now,
      id,
    ]
  );
}
