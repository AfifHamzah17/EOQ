// src/routes/auth.js
import express from 'express';
import {
  initAdmin,
  login,
  register,
  changePassword,
  resetPasswordByAdmin,
  isPasswordStrong,
  getAllUsers,
  getUserProfile,
  deleteUserByAdmin,
  updateProfile
} from '../services/auth.service.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: true, message: 'Terlalu banyak percobaan login, coba lagi nanti.' }
});

// ---------------- PUBLIC ----------------
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

// ---------------- PROTECTED ----------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await getUserProfile(req.user.userId);
    res.json({ error: false, data: user });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const message = await changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

// ---------------- ADMIN ONLY ----------------
router.get('/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ error: false, data: users });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post('/users/reset-password', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { iduser, newPassword } = req.body;
    if (!iduser || !newPassword) {
      return res.status(400).json({ error: true, message: 'ID User dan Password baru wajib diisi' });
    }
    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ error: true, message: 'Password baru tidak cukup kuat!' });
    }
    const message = await resetPasswordByAdmin(req.user.role, iduser, newPassword);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const updatedUser = await updateProfile(req.user.userId, req.body);
    res.json({ error: false, message: 'Profil berhasil diperbarui', data: updatedUser });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

router.delete('/users/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const message = await deleteUserByAdmin(
      req.user.role,    
      req.user.userId,    
      targetUserId        
    );
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

export default router;