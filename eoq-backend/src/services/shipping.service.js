// src/services/shipping.service.js
import { getFirestore } from '../utils/index.js';

const db = getFirestore();
const shippingCol = () => db.collection('shippings');

// --- HELPER: GENERATE NO. (SHP-001 dst) ---
const generateShippingNo = async () => {
  const snap = await shippingCol().orderBy('createdAt', 'desc').limit(1).get();
  
  if (snap.empty) return 'SHP-001';
  
  const lastCode = snap.docs[0].data().shippingNo;
  const lastNum = parseInt(lastCode.split('-')[1]);
  
  if (isNaN(lastNum)) return 'SHP-001';
  
  const nextNum = lastNum + 1;
  const nextCodePadded = String(nextNum).padStart(3, '0');
  
  return `SHP-${nextCodePadded}`;
};

// --- 1. CREATE ---
// Parsing Harga: 10000 (baca dari Input) -> simpan di db jadi 10000 (integer)
export const createShipping = async (data) => {
  // 1. Jika No Pengiriman kosong, buat Auto (SHP-XXX)
  const shippingNo = data.shippingNo || await generateShippingNo();

  // 2. Logic Harga (Integer)
  // Input: "10000" -> DB: 10000
  // Input: "10" -> DB: 10000
  const priceInt = parseInt(data.price);
  
  const newShipping = {
    shippingNo: shippingNo,
    date: data.date,
    name: data.name,
    price: priceInt, // Simpan sebagai Integer murni (tanpa titik/ribuan)
    createdAt: new Date()
  };
  
  const docRef = await shippingCol().add(newShipping);
  return { id: docRef.id, ...newShipping };
};

// --- 2. GET ALL (List) ---
export const getAllShippings = async () => {
  const snapshot = await shippingCol().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- 3. GET BY ID (Untuk Edit - Fix 404 Not Found) ---
export const getShippingById = async (id) => {
  const docRef = shippingCol().doc(id);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) throw new Error('Data tidak ditemukan');
  return { id: docSnap.id, ...docSnap.data() };
};

// --- 4. UPDATE ---
export const updateShipping = async (id, data) => {
  const shippingRef = db.collection('shippings').doc(id);
  const updateData = {
    shippingNo: data.shippingNo, // Bisa diubah jika user mau ganti Nomor
    date: data.date,
    name: data.name,
    price: parseInt(data.price) // Parsing integer juga di sini (User input: 10000 -> Simpan 10000)
  };
  
  await shippingRef.update(updateData);
  return { message: 'Data pengiriman berhasil diperbarui' };
};

// --- 5. DELETE ---
export const deleteShipping = async (id) => {
  await db.collection('shippings').doc(id).delete();
  return { message: 'Data pengiriman berhasil dihapus' };
};

// --- 6. UPLOAD CSV (FIX LOGIC) ---
export const uploadShippingCsv = async (dataArray) => {
  const results = [];
  
  for (const row of dataArray) {
    try {
      // Ambil data
      const shippingNo = row.shippingNo;
      const date = row.date;
      const name = row.name;
      const price = parseInt(row.price) || 0;

      if (!name || !price) {
        results.push({ error: true, message: 'Data CSV tidak lengkap', data: row });
        continue;
      }

      const shippingNoToUse = shippingNo || await generateShippingNo();
      const dateToSave = date || new Date().toISOString().split('T')[0];

      const created = await createShipping({ 
        shippingNo: shippingNoToUse, 
        date: dateToSave, 
        name: name, 
        price: price 
      });
      
      results.push({ error: false, message: 'Berhasil', data: created });
    } catch (err) {
      results.push({ error: true, message: err.message, data: row });
    }
  } // <-- Akhir Loop
  
  // <--- PINDAHKAN RETURN KE SINI (SEHINGGA SEMUA DATA DI PROSES)
  return { message: 'Upload CSV selesai', results }; 
};