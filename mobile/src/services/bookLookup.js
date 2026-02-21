function sanitizeIsbn(raw) {
  return (raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function extractIsbn(rawCode) {
  const normalized = sanitizeIsbn(rawCode);
  if (normalized.length === 10 || normalized.length === 13) return normalized;
  return null;
}

export async function lookupBookByIsbn(isbn) {
  const url = `https://openlibrary.org/isbn/${isbn}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se encontró metadata para ese ISBN');
  }

  const data = await response.json();

  let author = null;
  if (Array.isArray(data.authors) && data.authors[0]?.key) {
    try {
      const authorRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
      if (authorRes.ok) {
        const authorData = await authorRes.json();
        author = authorData?.name ?? null;
      }
    } catch {
      author = null;
    }
  }

  return {
    isbn,
    title: data.title ?? null,
    author,
    publisher: Array.isArray(data.publishers) ? data.publishers[0] : null,
    publishedYear: data.publish_date ? Number(String(data.publish_date).slice(-4)) || null : null,
  };
}
