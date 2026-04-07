// src/routes/items.js
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
  getInventoryReport 
} from '../services/items.service.js';

const router = express.Router();
router.use(authenticate);

router.get('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const items = await getItems(req.user);
    res.json({ error: false, data: items });
  } catch (err) {
    console.error("ERROR GET ITEMS:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

router.get('/report', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const reportData = await getInventoryReport(req.user);
    res.json({ error: false, data: reportData });
  } catch (err) {
    console.error("ERROR GET REPORT:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

router.get('/history/:code', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const history = await getItemHistory(req.params.code, req.user);
    res.json({ error: false, data: history });
  } catch (err) {
    console.error("ERROR GET HISTORY:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

// UPLOAD BARANG MASUK
router.post('/upload/in', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    console.log("DATA MASUK DARI FRONTEND:", JSON.stringify(req.body)); // DEBUG
    const inputData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const data of inputData) {
      if (!data.itemName || !data.qty) {
        results.push({ error: true, message: 'Data tidak lengkap', data });
        continue;
      }
      const result = await processIncomingStock(data, req.user);
      results.push(result);
    }
    res.status(201).json({ error: false, message: 'Upload Barang Masuk selesai', data: results });
  } catch (err) {
    console.error("ERROR UPLOAD IN:", err); // DEBUG PENTING
    res.status(500).json({ error: true, message: err.message });
  }
});

// UPLOAD BARANG KELUAR
router.post('/upload/out', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const inputData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const data of inputData) {
      if (!data.itemName || !data.qty) {
        results.push({ error: true, message: 'Data tidak lengkap', data });
        continue;
      }
      const result = await processStockOut(data, req.user);
      results.push(result);
    }
    res.status(201).json({ error: false, message: 'Upload Barang Keluar selesai', data: results });
  } catch (err) {
    console.error("ERROR UPLOAD OUT:", err); // DEBUG PENTING
    res.status(500).json({ error: true, message: err.message });
  }
});

// ROUTE EDIT TRANSAKSI
router.put('/transaction/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const collectionType = req.body.type === 'in' ? 'incoming' : 'outgoing';
    await editTransaction(req.params.id, req.body, collectionType);
    res.json({ error: false, message: 'Transaksi berhasil diperbarui' });
  } catch (err) {
    console.error("ERROR EDIT TRX:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const newItem = await createItem(req.body);
    res.status(201).json({ error: false, data: newItem });
  } catch (err) {
    console.error("ERROR CREATE ITEM:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

router.put('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const result = await updateItem(req.params.id, req.body);
    res.json({ error: false, message: result.message });
  } catch (err) {
    console.error("ERROR UPDATE ITEM:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    await deleteItem(req.params.id);
    res.json({ error: false, message: 'Barang dihapus' });
  } catch (err) {
    console.error("ERROR DELETE ITEM:", err); // DEBUG
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;