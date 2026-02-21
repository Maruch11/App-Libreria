# App Librería

Arranque inicial del MVP móvil para gestión de libros con Expo.

## Estructura

- `mobile/`: app React Native (Expo) con:
  - escaneo ISBN/EAN por cámara
  - consulta de metadata por ISBN (Open Library)
  - persistencia local SQLite
  - listado ordenado por título/autor
  - edición rápida de estado, avance y rating

## Ejecutar

```bash
cd mobile
npm install
npm run start
```

Abrir en Expo Go y escanear el QR.

## Nota de arquitectura

Para la demo se prioriza SQLite local (offline-first). PostgreSQL queda para sincronización posterior.
