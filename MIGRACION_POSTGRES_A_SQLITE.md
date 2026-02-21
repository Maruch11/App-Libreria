# Migración rápida: PostgreSQL -> SQLite (Expo)

Objetivo: mantener el trabajo ya hecho en PostgreSQL, pero adaptar el MVP móvil para que funcione local/offline con `expo-sqlite` y pueda demoearse en Expo Go.

## 1) Decisión de arquitectura (para el lunes)

- **Fuente de verdad del MVP**: SQLite local en el dispositivo.
- PostgreSQL queda como referencia de esquema y para una futura sincronización.
- Beneficio: la demo no depende de red ni backend.

## 2) Mapeo de tipos PostgreSQL -> SQLite

Regla general: SQLite es más flexible con tipos, por lo que conviene normalizar:

- `SERIAL` / `BIGSERIAL` -> `INTEGER PRIMARY KEY AUTOINCREMENT`
- `UUID` -> `TEXT`
- `VARCHAR(n)` / `TEXT` -> `TEXT`
- `BOOLEAN` -> `INTEGER` (`0`/`1`)
- `TIMESTAMP` / `TIMESTAMPTZ` -> `TEXT` en ISO-8601
- `NUMERIC` / `DECIMAL` -> `REAL` (o `TEXT` si necesitas precisión exacta)

## 3) Esquema mínimo recomendado para el MVP

```sql
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
```

## 4) Ajustes clave en consultas SQL

- `NOW()` (Postgres) -> timestamp ISO generado en app (`new Date().toISOString()`).
- `ILIKE` -> `LOWER(col) LIKE LOWER(?)`.
- `RETURNING *` no siempre está disponible según motor/versión:
  - insertar
  - leer por `last_insert_rowid()` o reconsultar por `id`/`isbn`.
- `ON CONFLICT ... DO UPDATE`:
  - usar `INSERT OR REPLACE` (ojo: reemplaza la fila), o
  - estrategia `SELECT` previo + `UPDATE` explícito (recomendado para no perder campos).

## 5) Flujo de migración recomendado (rápido)

1. Congelar nuevas migraciones en PostgreSQL para el MVP.
2. Crear `init.sql` para SQLite con el esquema mínimo de arriba.
3. Adaptar capa de datos del móvil (repositorio/DAO) para:
   - insertar libro escaneado
   - listar por título/autor
   - editar estado/avance/calificación
4. Definir validaciones en app:
   - `isbn` obligatorio y único
   - `progress` entre 0 y 100
   - `rating` entre 1 y 5 (nullable)
5. Probar escenario offline completo en Expo Go.

## 6) Estrategia para no "tirar" PostgreSQL

- Mantener SQL de Postgres en carpeta separada (`/db/postgres`).
- Crear versión SQLite paralela (`/db/sqlite`).
- Mantener un documento de mapeo por tabla/columna.
- Después del lunes, implementar sincronización por lotes (SQLite -> API -> Postgres).

## 7) Definición de "Done" para la demo

- Escanear ISBN/EAN con cámara.
- Consultar API de libros por ISBN.
- Autocompletar título/autor/editorial/año.
- Permitir fallback manual si API falla.
- Guardar y leer desde SQLite local.
- Mostrar lista ordenada por título o autor.

## 8) Riesgos y mitigaciones

- **API no devuelve datos** -> formulario manual con ISBN precargado.
- **Duplicados por escaneo repetido** -> `UNIQUE(isbn)` + mensaje de libro existente.
- **Permisos de cámara** -> pantalla de estado/solicitud de permisos.
- **Datos incompletos de API** -> campos opcionales y edición posterior.
