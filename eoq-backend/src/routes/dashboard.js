import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { getDashboardData } from '../services/dashboard.service.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', checkRole(['admin', 'karyawan']), async (req, res) => {
  try {
    const data = await getDashboardData();
    res.json({ error: false, data });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;