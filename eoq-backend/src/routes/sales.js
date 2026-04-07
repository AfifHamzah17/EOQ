// src/routes/sales.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { 
  createSale, 
  getAllSales, 
  getSaleById,
  updateSale, 
  deleteSale, 
  uploadSalesCsv 
} from '../services/sales.service.js';

const router = express.Router();
router.use(authenticate);

// 1. GET ALL
router.get('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const sales = await getAllSales(req.user);
    res.json({ error: false, data: sales });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. CREATE
router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const newSale = await createSale(req.body, req.user);
    res.status(201).json({ error: false, data: newSale });
  } catch (err) {
    if (err.message.includes('sudah ada')) {
      return res.status(400).json({ error: true, message: err.message });
    }
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. UPLOAD CSV
router.post('/upload', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const dataArray = req.body;
    if (!Array.isArray(dataArray)) return res.status(400).json({ error: true, message: 'Format data harus array' });
    
    // Kirim req.user
    const result = await uploadSalesCsv(dataArray, req.user);
    res.json({ error: false, message: result.message, details: result.results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 4. GET BY ID
router.get('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const item = await getSaleById(req.params.id, req.user);
    res.json({ error: false, data: item });
  } catch (err) {
    res.status(404).json({ error: true, message: err.message });
  }
});

// 5. UPDATE
router.put('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Kirim req.user
    const result = await updateSale(req.params.id, req.body, req.user);
    res.json({ error: false, message: result.message });
  } catch (err) {
    if (err.message.includes('sudah digunakan')) {
      return res.status(400).json({ error: true, message: err.message });
    }
    res.status(500).json({ error: true, message: err.message });
  }
});

// 6. DELETE
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    // Kirim req.user
    const result = await deleteSale(req.params.id, req.user);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;