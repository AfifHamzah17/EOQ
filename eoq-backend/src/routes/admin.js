// src/routes/admin.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';
import { 
  getUserProfile, 
  getAllUsers, 
  resetPasswordByAdmin, 
  getPendingUsers, 
  approveUserRegistration,
   deleteUserByAdmin
} from '../services/auth.service.js';
import { UserModel } from '../models/UserModel.js';
import bcrypt from 'bcrypt';

const router = express.Router();
router.use(authenticate);

router.post('/create-user', checkRole(['admin']), async (req, res) => {
  try {
    const { username, email, password, name, role, asalToko } = req.body;
    
    if (!['karyawan', 'admin'].includes(role)) {
      return res.status(400).json({ error: true, message: 'Role tidak valid' });
    }

    const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(409).json({ error: true, message: 'Username atau Email sudah ada' });

    const hash = await bcrypt.hash(password, 10);
    
    const newUser = await UserModel.create({
      username, 
      email, 
      passwordHash: hash, 
      name, 
      role,
      asalToko,
      isApproved: true,
      avatarUrl: null
    });

    res.status(201).json({ 
      error: false, 
      message: `User ${username} berhasil dibuat`, 
      userId: newUser.id 
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

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

router.get('/pending-users', checkRole(['admin']), async (req, res) => {
  try {
    const users = await getPendingUsers();
    res.json({ error: false, data: users });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post('/approve-user/:id', checkRole(['admin']), async (req, res) => {
  try {
    const message = await approveUserRegistration(req.user.role, req.params.id);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

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

router.delete('/users/:id', checkRole(['admin']), async (req, res) => {
  try {
    const message = await deleteUserByAdmin(req.user.role, req.params.id);
    res.json({ error: false, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: true, message: err.message });
  }
});

export default router;