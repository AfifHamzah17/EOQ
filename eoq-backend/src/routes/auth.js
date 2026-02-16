//src/routes/auth.js
import express from 'express';
import { 
  initAdmin, 
  login, 
  register, 
  changePassword, 
  resetPasswordByAdmin,
  isPasswordStrong,
  getAllUsers // <--- Import fungsi dari service
} from '../services/auth.service.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// --- PUBLIC ROUTES ---
// Limitter untuk login: 10 percobaan per 5 menit
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  message: { error: true, message: 'Terlalu banyak percobaan login, coba lagi nanti.' }
});

router.post('/register', async (req, res) => {
  try {
    await initAdmin();
    const result = await register(req.body);
    res.status(201).json({ error: false, message: result.message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    await initAdmin();
    const result = await login(req.body); 
    res.status(200).json({ error: false, message: 'Login berhasil', data: result });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

// --- AUTHENTICATED ROUTES ---

// 1. GANTI PASSWORD SENDIRI
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const message = await changePassword(userId, currentPassword, newPassword);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

// 2. ADMIN: AMBIL USER
router.get('/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // Langsung pakai service, jangan akses DB manual di route
    const users = await getAllUsers();
    res.json({ error: false, data: users });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 3. ADMIN: RESET PASSWORD USER LAIN
router.post('/users/reset-password', authenticate, authorize(['admin']), async (req, res) => {
  try {

    const { iduser, newPassword } = req.body;


    console.log('Menerima request reset:', { iduser, newPassword });


    if (!iduser || !newPassword) {
      const err = new Error('ID User dan Password baru wajib diisi');
      err.status = 400;
      throw err; 
    }

    if (!isPasswordStrong(newPassword)) {
      const err = new Error('Password baru tidak cukup kuat! (Min 8 char, 1 huruf besar, 1 angka/simbol)');
      err.status = 400;
      throw err;
    }


    const message = await resetPasswordByAdmin(req.user.role, iduser, newPassword);
    
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});


export default router;