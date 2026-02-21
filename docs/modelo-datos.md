# Modelo de datos inicial (App Librería)

Este modelo cubre el objetivo inicial:
- Escanear código de barras y resolver libro.
- Guardar catálogo bibliográfico base (título, autor, editorial, año).
- Gestionar información de usuario (estado, avance, calificación, notas).
- Preparar terreno para reportes personalizados y futuras escalas.

## Tablas principales

1. `books`: obra bibliográfica con ISBN y metadatos.
2. `authors`: autores normalizados.
3. `book_authors`: relación N:N entre libros y autores.
4. `publishers`: editoriales.
5. `library_items`: ejemplares guardados por el usuario con estado y progreso.
6. `reading_statuses`: catálogo configurable de estados.
7. `barcode_scans`: historial de escaneos para trazabilidad y métricas.
8. `library_item_events`: bitácora de cambios para analítica y reportes.

## Decisiones de diseño

- Separar `books` de `library_items` permite manejar múltiples ejemplares/formato del mismo libro.
- `book_authors` evita duplicación y soporta múltiples autores y roles.
- `library_item_events` habilita reportes temporales (por ejemplo, evolución de avance por semana).
- `barcode_scans` permite medir tasa de éxito de escaneo y depurar integraciones con APIs externas.
- Restricciones (`CHECK`, `UNIQUE`, FKs) protegen calidad de datos desde la base.

## Siguientes pasos sugeridos

- Definir estrategia de deduplicación al importar por ISBN.
- Diseñar API para: escanear, alta manual, actualización de progreso/estado.
- Diseñar reportes v1 (por estado, por autor, por rating, por ritmo de lectura).
