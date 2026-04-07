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

// 1. GET ALL
router.get('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const shippings = await getAllShippings(req.user);
    res.json({ error: false, data: shippings });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. CREATE
router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const newShipping = await createShipping(req.body, req.user);
    res.status(201).json({ error: false, data: newShipping });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. UPLOAD
router.post('/upload', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const dataArray = req.body; 
    if (!Array.isArray(dataArray)) {
      return res.status(400).json({ error: true, message: 'Format data harus array' });
    }
    // Kirim req.user
    const result = await uploadShippingCsv(dataArray, req.user);
    res.json({ error: false, message: result.message, details: result.results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 4. GET BY ID
router.get('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user untuk validasi kepemilikan
    const item = await getShippingById(req.params.id, req.user);
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
    // Kirim req.user untuk validasi kepemilikan
    const result = await updateShipping(req.params.id, req.body, req.user);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 6. DELETE
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    // Kirim req.user untuk validasi kepemilikan (meski admin boleh semua, tapi aman saja)
    const result = await deleteShipping(req.params.id, req.user);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;