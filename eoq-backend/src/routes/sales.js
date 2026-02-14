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
    const sales = await getAllSales();
    res.json({ error: false, data: sales });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. CREATE
router.post('/', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const newSale = await createSale(req.body);
    res.status(201).json({ error: false, data: newSale });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. UPLOAD CSV
router.post('/upload', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const dataArray = req.body;
    if (!Array.isArray(dataArray)) return res.status(400).json({ error: true, message: 'Format data harus array' });
    
    const result = await uploadSalesCsv(dataArray);
    res.json({ error: false, message: result.message, details: result.results });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 4. GET BY ID
router.get('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const item = await getSaleById(req.params.id);
    res.json({ error: false, data: item });
  } catch (err) {
    res.status(404).json({ error: true, message: err.message });
  }
});

// 5. UPDATE
router.put('/:id', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const result = await updateSale(req.params.id, req.body);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 6. DELETE
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    const result = await deleteSale(req.params.id);
    res.json({ error: false, message: result.message });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;