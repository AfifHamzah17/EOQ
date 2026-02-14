import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import upload from '../middlewares/uploadMiddleware.js';
import { uploadProfilePicture } from '../services/storage.service.js';
import { UserModel } from '../models/UserModel.js'; // <--- GANTI: Pakai Model Mongoose

const router = express.Router();
router.use(authenticate);

// POST /api/upload/profile
router.post('/profile', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Tidak ada file yang diupload' });
    }

    const userId = req.user.userId; // UUID dari Token
    const username = req.user.username; // Untuk nama file

    // 1. AMBIL DATA USER SAAT INI
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: true, message: 'User tidak ditemukan' });
    }

    const currentAvatarUrl = user.avatarUrl || null; // Ambil foto lama

    // 2. UPLOAD BARU (Lokal/Service)
    const imageUrl = await uploadProfilePicture(req.file.buffer, username, currentAvatarUrl);

    // 3. UPDATE DATABASE (Mongoose)
    user.avatarUrl = imageUrl;
    await user.save();

    res.json({ 
      error: false, 
      message: 'Foto profil berhasil diupdate', 
      data: { avatarUrl: imageUrl } 
    });
  } catch (error) {
    next(error);
  }
});

export default router;