import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { getUserProfile, getAllUsers, resetPasswordByAdmin } from '../services/auth.service.js';
import { getFirestore } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';
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

    const db = getFirestore();
    const usersCol = db.collection('users');
    const snap = await usersCol.where('username', '==', username).limit(1).get();
    if (!snap.empty) return res.status(409).json({ error: true, message: 'Username sudah ada' });

    const newUserId = uuidv4(); // <--- Generate ID User Baru
    const hash = await bcrypt.hash(password, 10);
    
    await usersCol.doc(newUserId).set({
      userId: newUserId,
      username, email, passwordHash: hash, name, role,
      avatarUrl: null, createdAt: new Date()
    });

    res.status(201).json({ error: false, message: `User ${username} (${role}) berhasil dibuat`, userId: newUserId });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// 2. ADMIN LIHAT PROFILE (Bisa satu atau semua)
// GET /api/admin/users?iduser=... -> Satu User
// GET /api/admin/users -> Semua User
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