import { getFirestore } from '../utils/index.js';
import { ItemSchema } from '../models/ItemModel.js';

const db = getFirestore();
const itemsCol = () => db.collection('items');
const incomingCol = () => db.collection('incoming_stocks'); // Collection Barang Masuk
const outgoingCol = () => db.collection('outgoing_stocks'); // Collection Barang Keluar

// --- HELPER: GENERATE SEQUENTIAL CODE ---
const generateNextCode = async () => {
  const snap = await itemsCol().orderBy('createdAt', 'desc').limit(1).get();
  if (snap.empty) return 'BRG-001';
  const lastCode = snap.docs[0].data()[ItemSchema.CODE];
  const lastNum = parseInt(lastCode.split('-')[1]);
  if (isNaN(lastNum)) return 'BRG-001';
  const nextNum = lastNum + 1;
  return `BRG-${String(nextNum).padStart(3, '0')}`;
};

// --- 1. CORE LOGIC: UPLOAD BARANG MASUK (In) ---
export const processIncomingStock = async (data) => {
  const { date, shopName, itemName, qty } = data;
  const itemSnap = await itemsCol().where('name', '==', itemName).where('shopName', '==', shopName).limit(1).get();
  let itemRef, itemCode, isNew = false;

  if (itemSnap.empty) {
    itemCode = await generateNextCode();
    const newItem = { name: itemName, shopName: shopName, code: itemCode, stock: 0, createdAt: new Date() };
    const docRef = await itemsCol().add(newItem);
    itemRef = docRef;
    isNew = true;
  } else {
    const doc = itemSnap.docs[0];
    itemRef = db.collection('items').doc(doc.id);
    itemCode = doc.data().code;
  }

  await db.runTransaction(async (t) => {
    const itemDoc = await t.get(itemRef);
    const currentStock = itemDoc.exists ? (itemDoc.data().stock || 0) : 0;
    const newStock = currentStock + parseInt(qty); // TAMBAH STOK
    t.update(itemRef, { stock: newStock });

    const historyRef = incomingCol().doc();
    t.set(historyRef, {
      type: 'in', // TANDA TIPE
      itemCode: itemCode,
      date: date,
      shopName: shopName,
      itemName: itemName,
      qty: parseInt(qty),
      timestamp: Date.now()
    });
  });

  return { message: isNew ? 'Barang & Toko baru dicatat' : 'Stok barang di Toko ini bertambah', code: itemCode, type: 'in' };
};

// --- 2. CORE LOGIC: UPLOAD BARANG KELUAR (Out) ---
export const processStockOut = async (data) => {
  const { date, shopName, itemName, qty } = data;

  // Cek barang (HARUS SUDAH ADA di Master)
  const itemSnap = await itemsCol().where('name', '==', itemName).where('shopName', '==', shopName).limit(1).get();
  
  if (itemSnap.empty) {
    throw new Error(`Barang "${itemName}" dari toko "${shopName}" tidak ditemukan di Master Data! Export dulu barang tersebut.`);
  }

  const doc = itemSnap.docs[0];
  const itemRef = db.collection('items').doc(doc.id);
  const itemCode = doc.data().code;

  await db.runTransaction(async (t) => {
    const itemDoc = await t.get(itemRef);
    const currentStock = itemDoc.data().stock || 0;
    const qtyOut = parseInt(qty);

    if (currentStock < qtyOut) {
      throw new Error('Stok tidak mencukupi untuk barang keluar ini!');
    }

    const newStock = currentStock - qtyOut; // KURANGI STOK
    t.update(itemRef, { stock: newStock });

    const historyRef = outgoingCol().doc();
    t.set(historyRef, {
      type: 'out', // TANDA TIPE
      itemCode: itemCode,
      date: date,
      shopName: shopName,
      itemName: itemName,
      qty: qtyOut,
      timestamp: Date.now()
    });
  });

  return { message: 'Stok barang berhasil dikurangi (Barang Keluar)', code: itemCode, type: 'out' };
};

// --- 3. GET HISTORY (GABUNGAN MASUK & KELUAR) ---
export const getItemHistory = async (itemCode) => {
  try {
    // Ambil Masuk
    const inSnap = await incomingCol().where('itemCode', '==', itemCode).get();
    // Ambil Keluar
    const outSnap = await outgoingCol().where('itemCode', '==', itemCode).get();

    const inList = inSnap.docs.map(d => ({ id: d.id, collection: 'incoming', ...d.data() }));
    const outList = outSnap.docs.map(d => ({ id: d.id, collection: 'outgoing', ...d.data() }));

    // Gabungkan
    const allHistory = [...inList, ...outList];

    // Sort Manual (Terbaru di atas)
    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    return allHistory;
  } catch (error) {
    console.error("Error fetching history:", error);
    throw new Error('Gagal mengambil riwayat barang');
  }
};

// --- 4. EDIT TRANSAKSI (GENERIK: IN ATAU OUT) ---
export const editTransaction = async (id, newData, collectionType) => {
  // collectionType adalah 'incoming' atau 'outgoing' (determinasi collection tujuan)
  const colRef = collectionType === 'incoming' ? incomingCol() : outgoingCol();

  // 1. Ambil Data Lama
  const doc = await colRef.doc(id).get();
  if (!doc.exists) throw new Error('Data tidak ditemukan');
  
  const oldData = doc.data();
  const oldType = oldData.type;     // 'in' atau 'out'
  const oldQty = oldData.qty;
  const newType = newData.type; // Tipe baru dari frontend
  const newQty = parseInt(newData.qty);

  // 2. Hitung Perubahan Stok Master
  // Logika: Kembalikan stok ke kondisi sebelum transaksi lama, lalu tambahkan transaksi baru.
  // Signed Qty: In (+), Out (-)
  const signedOldQty = oldType === 'in' ? oldQty : -oldQty;
  const signedNewQty = newType === 'in' ? newQty : -newQty;

  // Total Adjustment = (New Signed) - (Old Signed)
  const adjustment = signedNewQty - signedOldQty;

  await db.runTransaction(async (t) => {
    // A. Update Master Item
    const itemSnap = await itemsCol().where('code', '==', oldData.itemCode).limit(1).get();
    if (itemSnap.empty) throw new Error('Master barang tidak ditemukan');
    
    const itemRef = db.collection('items').doc(itemSnap.docs[0].id);
    const itemDoc = await t.get(itemRef);
    const currentMasterStock = itemDoc.data().stock || 0;
    
    const newMasterStock = currentMasterStock + adjustment;
    
    if (newMasterStock < 0) throw new Error('Stok tidak boleh negatif setelah edit!');

    t.update(itemRef, { stock: newMasterStock });

    // B. Update History (Type berubah Qty berubah)
    const historyRef = colRef.doc(id);
    t.update(historyRef, {
      type: newType, // Update Type jika berubah
      date: newData.date,
      shopName: newData.shopName,
      qty: newQty
    });
  });

  return { message: 'Transaksi berhasil diedit & Stok disesuaikan' };
};

// --- CRUD MASTER (Biasa) ---
export const getItems = async () => {
  const snapshot = await itemsCol().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createItem = async (data) => {
  const newCode = await generateNextCode();
  const newItem = { name: data.name, shopName: data.shopName || 'Umum', code: newCode, stock: parseInt(data.stock) || 0, createdAt: new Date() };
  const doc = await itemsCol().add(newItem);
  return { id: doc.id, ...newItem };
};

export const updateItem = async (id, data) => {
  const itemRef = db.collection('items').doc(id);
  const updateData = { name: data.name, shopName: data.shopName, stock: parseInt(data.stock) };
  await itemRef.update(updateData);
  return { message: 'Barang berhasil diperbarui' };
};

export const deleteItem = async (id) => {
  await db.collection('items').doc(id).delete();
  return { message: 'Barang dihapus' };
};

// --- 5. FUNGSI BARU: LAPORAN INVENTORY (DENGAN TOTAL MASUK & KELUAR) ---
export const getInventoryReport = async () => {
  try {
    // 1. Ambil Semua Master Items
    const itemsSnap = await itemsCol().orderBy('createdAt', 'desc').get();
    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Ambil Semua Riwayat Masuk & Keluar
    // Catatan: Jika data history sangat besar (ribuan), ini mungkin memakan waktu sedikit lama.
    // Tapi ini cara tercepat untuk mendapatkan total real-time.
    const inSnap = await incomingCol().get();
    const outSnap = await outgoingCol().get();

    // 3. Map untuk menyimpan total berdasarkan Kode Barang
    // Struktur: { "BRG-001": { in: 10, out: 5 }, ... }
    const statsMap = {};

    // Hitung Total Masuk
    inSnap.docs.forEach(doc => {
      const d = doc.data();
      const code = d.itemCode;
      const qty = parseInt(d.qty) || 0;
      
      if (!statsMap[code]) statsMap[code] = { in: 0, out: 0 };
      statsMap[code].in += qty;
    });

    // Hitung Total Keluar
    outSnap.docs.forEach(doc => {
      const d = doc.data();
      const code = d.itemCode;
      const qty = parseInt(d.qty) || 0;

      if (!statsMap[code]) statsMap[code] = { in: 0, out: 0 };
      statsMap[code].out += qty;
    });

    // 4. Gabungkan Data Master dengan Stats
    return items.map(item => ({
      ...item,
      totalIn: statsMap[item.code]?.in || 0,
      totalOut: statsMap[item.code]?.out || 0
    }));

  } catch (error) {
    console.error("Error generating inventory report:", error);
    throw new Error('Gagal membuat laporan inventaris');
  }
};