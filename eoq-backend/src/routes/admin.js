import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { getUserProfile, getAllUsers, resetPasswordByAdmin } from '../services/auth.service.js';
import { UserModel } from '../models/UserModel.js'; // <--- GANTI
import bcrypt from 'bcrypt';

const router = express.Router();
router.use(authenticate);

// 1. ADMIN CREATE USER
router.post('/create-user', checkRole(['admin']), async (req, res) => {
  try {
    const { username, email, password, name, role } = req.body;
    
    if (!['karyawan', 'admin'].includes(role)) {
      return res.status(400).json({ error: true, message: 'Role harus karyawan atau admin' });
    }

    // Cek existing user (Validasi unik bisa juga di Schema, tapi cek di sini aman)
    const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(409).json({ error: true, message: 'Username atau Email sudah ada' });

    const hash = await bcrypt.hash(password, 10);
    
    // Buat user baru via Mongoose (ID otomatis ter-generate)
    const newUser = await UserModel.create({
      username, 
      email, 
      passwordHash: hash, 
      name, 
      role,
      avatarUrl: null
    });

    res.status(201).json({ 
      error: false, 
      message: `User ${username} (${role}) berhasil dibuat`, 
      userId: newUser.id // Mongoose _id converted to id by virtual getter
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. ADMIN LIHAT PROFILE (Bisa satu atau semua)
router.get('/users', checkRole(['admin']), async (req, res) => {
  try {
    if (req.query.iduser) {
      const profile = await getUserProfile(req.query.iduser);
      return res.json({ error: false, data: profile });
    }

    const users = await getAllUsers();
    res.json({ error: false, data: users });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

// 3. ADMIN RESET PASSWORD (Pakai Query)
router.post('/reset-password', checkRole(['admin']), async (req, res) => {
  try {
    const { iduser } = req.query;
    const { newPassword } = req.body;

    if (!iduser) {
      return res.status(400).json({ error: true, message: 'Query parameter ?iduser wajib diisi' });
    }

    const message = await resetPasswordByAdmin(req.user.role, iduser, newPassword);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

export default router;