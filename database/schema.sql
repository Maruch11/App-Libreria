-- Esquema inicial para App Librería (MVP + escalabilidad)
-- Motor objetivo: PostgreSQL 14+

BEGIN;

-- Catálogos base
CREATE TABLE publishers (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    country_code    CHAR(2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_publishers_name UNIQUE (name)
);

CREATE TABLE authors (
    id              BIGSERIAL PRIMARY KEY,
    full_name       TEXT NOT NULL,
    sort_name       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_authors_full_name UNIQUE (full_name)
);

-- Libro como obra bibliográfica
CREATE TABLE books (
    id                  BIGSERIAL PRIMARY KEY,
    isbn_13             CHAR(13),
    isbn_10             CHAR(10),
    title               TEXT NOT NULL,
    subtitle            TEXT,
    publisher_id        BIGINT REFERENCES publishers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    publication_year    SMALLINT,
    language_code       CHAR(2),
    page_count          INTEGER,
    cover_url           TEXT,
    metadata_source     TEXT, -- ej: openlibrary, google_books, manual
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_books_isbn13 UNIQUE (isbn_13),
    CONSTRAINT uq_books_isbn10 UNIQUE (isbn_10),
    CONSTRAINT chk_books_publication_year CHECK (publication_year IS NULL OR publication_year BETWEEN 1400 AND 2100),
    CONSTRAINT chk_books_isbn13_digits CHECK (isbn_13 IS NULL OR isbn_13 ~ '^[0-9]{13}$'),
    CONSTRAINT chk_books_isbn10_digits CHECK (isbn_10 IS NULL OR isbn_10 ~ '^[0-9Xx]{10}$')
);

-- Relación N:N entre libros y autores
CREATE TABLE book_authors (
    book_id          BIGINT NOT NULL REFERENCES books(id) ON UPDATE CASCADE ON DELETE CASCADE,
    author_id        BIGINT NOT NULL REFERENCES authors(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    author_order     SMALLINT NOT NULL DEFAULT 1,
    role             TEXT NOT NULL DEFAULT 'author', -- author, editor, illustrator, etc.
    PRIMARY KEY (book_id, author_id, role)
);

-- Estado configurable (escalable) para ejemplares del usuario
CREATE TABLE reading_statuses (
    id              SMALLSERIAL PRIMARY KEY,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    sort_order      SMALLINT NOT NULL DEFAULT 100,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_reading_statuses_code UNIQUE (code)
);

-- Ejemplar en la biblioteca del usuario (permite duplicados por distintas ediciones/formatos)
CREATE TABLE library_items (
    id                  BIGSERIAL PRIMARY KEY,
    book_id             BIGINT NOT NULL REFERENCES books(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    acquisition_date    DATE,
    acquisition_source  TEXT,
    format              TEXT NOT NULL DEFAULT 'physical', -- physical, ebook, audiobook
    shelf_location      TEXT,
    notes               TEXT,
    status_id           SMALLINT REFERENCES reading_statuses(id) ON UPDATE CASCADE ON DELETE SET NULL,
    reading_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    rating              NUMERIC(3,1), -- 0.0 a 5.0
    started_at          DATE,
    finished_at         DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_library_items_progress CHECK (reading_progress_pct BETWEEN 0 AND 100),
    CONSTRAINT chk_library_items_rating CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
    CONSTRAINT chk_library_items_dates CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);

-- Historial de escaneos de código de barras (trazabilidad y métricas)
CREATE TABLE barcode_scans (
    id              BIGSERIAL PRIMARY KEY,
    raw_code        TEXT NOT NULL,
    code_type       TEXT NOT NULL DEFAULT 'EAN13', -- EAN13, ISBN10, UPC, etc.
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_book_id BIGINT REFERENCES books(id) ON UPDATE CASCADE ON DELETE SET NULL,
    was_successful  BOOLEAN NOT NULL DEFAULT TRUE,
    device_id       TEXT,
    app_version     TEXT,
    metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Bitácora de cambios para reporting futuro y auditoría
CREATE TABLE library_item_events (
    id                  BIGSERIAL PRIMARY KEY,
    library_item_id     BIGINT NOT NULL REFERENCES library_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    event_type          TEXT NOT NULL, -- status_changed, progress_updated, rating_updated, note_updated
    event_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices recomendados para consultas frecuentes
CREATE INDEX idx_books_title ON books (title);
CREATE INDEX idx_books_publication_year ON books (publication_year);
CREATE INDEX idx_book_authors_author_id ON book_authors (author_id);
CREATE INDEX idx_library_items_book_id ON library_items (book_id);
CREATE INDEX idx_library_items_status_id ON library_items (status_id);
CREATE INDEX idx_library_items_rating ON library_items (rating);
CREATE INDEX idx_library_items_updated_at ON library_items (updated_at DESC);
CREATE INDEX idx_barcode_scans_scanned_at ON barcode_scans (scanned_at DESC);
CREATE INDEX idx_library_item_events_item_time ON library_item_events (library_item_id, created_at DESC);

-- Datos semilla mínimos para estados
INSERT INTO reading_statuses (code, name, sort_order) VALUES
    ('to_read', 'Por leer', 10),
    ('reading', 'Leyendo', 20),
    ('paused', 'Pausado', 30),
    ('completed', 'Completado', 40),
    ('dropped', 'Abandonado', 50);

COMMIT;
