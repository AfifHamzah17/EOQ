// src/routes/shipping.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { 
  createShipping, 
  getAllShippings, 
  getShippingById,
  updateShipping, 
  deleteShipping, 
  uploadShippingCsv 
} from '../services/shipping.service.js';

const router = express.Router();
router.use(authenticate);

// 1. GET ALL (List)
router.get('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const shippings = await getAllShippings();
    res.json({ error: false, data: shippings });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. CREATE (Tambah Satuan)
router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const newShipping = await createShipping(req.body);
    res.status(201).json({ error: false, data: newShipping });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. UPLOAD (IMPORT EXCEL) - WAJIB DI ATAS /:id AGAR TIDAK TERTANGKAP SEBAGAI ID
router.post('/upload', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Pastikan menerima Array JSON, bukan FormData
    const dataArray = req.body; 
    
    if (!Array.isArray(dataArray)) {
      return res.status(400).json({ error: true, message: 'Format data harus array' });
    }

    const result = await uploadShippingCsv(dataArray);
    res.json({ error: false, message: result.message, details: result.results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 4. GET BY ID (Detail/Edit)
router.get('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const item = await getShippingById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: true, message: 'Data tidak ditemukan.' });
    }
    res.json({ error: false, data: item });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 5. UPDATE
router.put('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const result = await updateShipping(req.params.id, req.body);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 6. DELETE
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    const result = await deleteShipping(req.params.id);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;