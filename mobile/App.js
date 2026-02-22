import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { initDb, listBooks, updateBookFields, upsertBook, dumpBooks } from './src/db/booksDb';
import { extractIsbn, lookupBookByIsbn } from './src/services/bookLookup';

const STATUSES = ['pendiente', 'leyendo', 'terminado'];

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [books, setBooks] = useState([]);
  const [sortBy, setSortBy] = useState('title');
  const [manualForm, setManualForm] = useState(null);

  const canScan = useMemo(() => Boolean(permission?.granted), [permission]);

  useEffect(() => {
    async function bootstrap() {
      await initDb();
      await refreshBooks(sortBy);
    }
    bootstrap();
  }, []);

  async function refreshBooks(order) {
    const next = await listBooks(order);
    setBooks(next);
  }

  async function saveBook(book) {
    await upsertBook(book);
    await refreshBooks(sortBy);
  }

  async function onBarcodeScanned({ data }) {
    if (!scanning) return;

    const isbn = extractIsbn(data);
    setScanning(false);
    if (!isbn) {
      setMessage('Código escaneado inválido para ISBN/EAN');
      return;
    }

    setLoading(true);
    setMessage(`Buscando metadata para ISBN ${isbn}...`);

    try {
      const metadata = await lookupBookByIsbn(isbn);
      await saveBook(metadata);
      setManualForm(null);
      setMessage(`Libro guardado: ${metadata.title ?? isbn}`);
    } catch (error) {
      setManualForm({
        isbn,
        title: '',
        author: '',
        publisher: '',
        publishedYear: '',
      });
      setMessage(error.message + '. Completá los datos manualmente.');
    } finally {
      setLoading(false);
    }
  }

  async function submitManual() {
    if (!manualForm?.isbn) return;
    await saveBook({
      ...manualForm,
      publishedYear: manualForm.publishedYear ? Number(manualForm.publishedYear) : null,
    });
    setManualForm(null);
    setMessage('Libro guardado manualmente.');
  }

  async function patchBook(book, patch) {
    await updateBookFields(book.id, {
      readingStatus: patch.reading_status ?? book.reading_status,
      progress: typeof patch.progress === 'number' ? patch.progress : book.progress,
      rating: typeof patch.rating === 'number' ? patch.rating : book.rating,
    });
    await refreshBooks(sortBy);
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Necesitamos permiso de cámara para escanear ISBN.</Text>
        <Button title="Dar permiso" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>App Librería · MVP</Text>

      <Button
  title="DEBUG: ver datos (SQLite)"
  onPress={async () => {
    await dumpBooks();
    setMessage('Dump ejecutado. Mirá la consola de Metro.');
  }}
/>

      {canScan && (
        <View style={styles.scannerWrap}>
          {scanning ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          ) : (
            <Button title="Escanear ISBN/EAN" onPress={() => setScanning(true)} />
          )}
        </View>
      )}

      {loading && <ActivityIndicator size="small" />}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {manualForm && (
        <View style={styles.manualCard}>
          <Text style={styles.subtitle}>Carga manual (fallback)</Text>
          <Text>ISBN: {manualForm.isbn}</Text>
          <TextInput style={styles.input} placeholder="Título" value={manualForm.title} onChangeText={(v) => setManualForm((p) => ({ ...p, title: v }))} />
          <TextInput style={styles.input} placeholder="Autor" value={manualForm.author} onChangeText={(v) => setManualForm((p) => ({ ...p, author: v }))} />
          <TextInput style={styles.input} placeholder="Editorial" value={manualForm.publisher} onChangeText={(v) => setManualForm((p) => ({ ...p, publisher: v }))} />
          <TextInput style={styles.input} placeholder="Año" keyboardType="number-pad" value={manualForm.publishedYear} onChangeText={(v) => setManualForm((p) => ({ ...p, publishedYear: v }))} />
          <Button title="Guardar manual" onPress={submitManual} />
        </View>
      )}

      <View style={styles.sortRow}>
        <Text>Ordenar por:</Text>
        <Button title="Título" onPress={async () => { setSortBy('title'); await refreshBooks('title'); }} />
        <Button title="Autor" onPress={async () => { setSortBy('author'); await refreshBooks('author'); }} />
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.bookRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookTitle}>{item.title || '(Sin título)'}</Text>
              <Text>{item.author || 'Autor desconocido'} · {item.publisher || 'Sin editorial'}</Text>
              <Text>ISBN: {item.isbn} · Año: {item.published_year || '-'}</Text>
              <Text>Estado: {item.reading_status} · Avance: {item.progress}% · Rating: {item.rating ?? '-'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => patchBook(item, { reading_status: STATUSES[(STATUSES.indexOf(item.reading_status) + 1) % STATUSES.length] })}>
                <Text style={styles.actionText}>Cambiar estado</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => patchBook(item, { progress: Math.min((item.progress || 0) + 10, 100) })}>
                <Text style={styles.actionText}>+10%</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => patchBook(item, { rating: Math.min((item.rating || 0) + 1, 5) || 1 })}>
                <Text style={styles.actionText}>+★</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  scannerWrap: { height: 220, justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, overflow: 'hidden' },
  camera: { flex: 1 },
  message: { color: '#333' },
  manualCard: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, gap: 8 },
  subtitle: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 8, marginBottom: 8, gap: 8 },
  bookTitle: { fontWeight: '700' },
  actions: { justifyContent: 'space-around' },
  actionText: { color: '#0a58ca' },
});
