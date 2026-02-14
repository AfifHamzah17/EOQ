// src/routes/eoq.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { getEOQParameters } from '../services/eoq.service.js'; // Import Service

const router = express.Router();
router.use(authenticate);

// GET /api/eoq/parameters
router.get('/parameters', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Panggil Service untuk mendapatkan data
    const data = await getEOQParameters();

    // Kirim Response Sukses
    res.status(200).json({ 
      error: false, 
      data: data 
    });

  } catch (err) {
    // Kirim Response Error
    console.error("Error Routes:", err.message);
    res.status(500).json({ 
      error: true, 
      message: err.message || "Terjadi kesalahan server." 
    });
  }
});

export default router;