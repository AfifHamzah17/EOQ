// src/routes/eoq.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { getEOQParameters, getDistinctCabang } from '../services/eoq.service.js'; 

const router = express.Router();
router.use(authenticate);

// GET /api/eoq/cabangs -> Untuk mengisi dropdown cabang
router.get('/cabangs', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const cabangs = await getDistinctCabang();
    res.status(200).json({ 
      error: false, 
      data: cabangs 
    });
  } catch (err) {
    res.status(500).json({ 
      error: true, 
      message: err.message || "Gagal mengambil daftar cabang." 
    });
  }
});

// GET /api/eoq/parameters?namaCabang=xxx -> Untuk mengambil D dan S
router.get('/parameters', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    // Tangkap query namaCabang dari frontend
    const namaCabang = req.query.namaCabang || '';

    // Kirim ke Service
    const data = await getEOQParameters(namaCabang);

    res.status(200).json({ 
      error: false, 
      data: data 
    });

  } catch (err) {
    console.error("Error Routes:", err.message);
    res.status(500).json({ 
      error: true, 
      message: err.message || "Terjadi kesalahan server." 
    });
  }
});

export default router;