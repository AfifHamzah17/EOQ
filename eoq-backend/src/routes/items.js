import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { 
  getItems, 
  createItem, 
  updateItem, 
  deleteItem, 
  processIncomingStock, 
  processStockOut,
  getItemHistory,
  editTransaction,
  getInventoryReport // <--- IMPORT BARU UNTUK EXPORT EXCEL
} from '../services/items.service.js';

const router = express.Router();
router.use(authenticate);

// 1. GET MASTER ITEMS
router.get('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const items = await getItems();
    res.json({ error: false, data: items });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. GET INVENTORY REPORT (BARU: Untuk Export Excel dengan Total Masuk/Keluar)
router.get('/report', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const reportData = await getInventoryReport();
    res.json({ error: false, data: reportData });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. GET ITEM HISTORY (Mixed In/Out)
router.get('/history/:code', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const history = await getItemHistory(req.params.code);
    res.json({ error: false, data: history });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 4. UPLOAD BARANG MASUK
router.post('/upload/in', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const inputData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const data of inputData) {
      if (!data.itemName || !data.qty) {
        results.push({ error: true, message: 'Data tidak lengkap', data });
        continue;
      }
      const result = await processIncomingStock(data);
      results.push(result);
    }
    res.status(201).json({ error: false, message: 'Upload Barang Masuk selesai', data: results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 5. UPLOAD BARANG KELUAR
router.post('/upload/out', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const inputData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const data of inputData) {
      if (!data.itemName || !data.qty) {
        results.push({ error: true, message: 'Data tidak lengkap', data });
        continue;
      }
      const result = await processStockOut(data);
      results.push(result);
    }
    res.status(201).json({ error: false, message: 'Upload Barang Keluar selesai', data: results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 6. ROUTE EDIT TRANSAKSI
router.put('/transaction/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const collectionType = req.body.type === 'in' ? 'incoming' : 'outgoing';
    await editTransaction(req.params.id, req.body, collectionType);
    res.json({ error: false, message: 'Transaksi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 7. CREATE MANUAL
router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const newItem = await createItem(req.body);
    res.status(201).json({ error: false, data: newItem });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 8. DELETE
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    await deleteItem(req.params.id);
    res.json({ error: false, message: 'Barang dihapus' });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;