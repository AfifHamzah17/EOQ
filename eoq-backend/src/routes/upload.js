import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import upload from '../middlewares/uploadMiddleware.js';
import { uploadProfilePicture } from '../services/storage.service.js';
import { getFirestore } from '../utils/index.js';

const router = express.Router();
router.use(authenticate);

// POST /api/upload/profile
router.post('/profile', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Tidak ada file yang diupload' });
    }

    const username = req.user.username; // Untuk nama file
    const userId = req.user.userId;   // <--- PERBAIKAN: Gunakan UUID untuk cari data di DB
    const db = getFirestore();

    // 1. AMBIL DATA USER SAAT INI (Pakai userId, bukan username!)
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: true, message: 'User tidak ditemukan' });
    }

    const userData = userDoc.data();
    const currentAvatarUrl = userData.avatarUrl || null; // Ambil foto lama

    // 2. UPLOAD BARU (Kirim foto lama untuk dihapus)
    const imageUrl = await uploadProfilePicture(req.file.buffer, username, currentAvatarUrl);

    // 3. UPDATE DATABASE (Update berdasarkan userId juga)
    await db.collection('users').doc(userId).update({ avatarUrl: imageUrl });

    res.json({ 
      error: false, 
      message: 'Foto profil berhasil diupdate (Foto lama dihapus)', 
      data: { avatarUrl: imageUrl } 
    });
  } catch (error) {
    next(error);
  }
});

export default router;