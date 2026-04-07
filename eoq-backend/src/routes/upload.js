import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middlewares/auth.js';
import { UserModel } from '../models/UserModel.js';

const router = express.Router();

// Simpan di memory (RAM) sementara, biar sharp bisa baca buffer-nya
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Terima sampai 5MB, NANTI SHARP YANG KOMPRESI
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
  }
});

router.post('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Tidak ada file diupload' });
    }

    const userId = req.user.userId;
    
    // Cari user dulu untuk hapus foto lama (Opsional tapi bagus biar server nggak penuh)
    const user = await UserModel.findById(userId);
    if (user && user.avatarUrl) {
      const oldFilename = path.basename(user.avatarUrl);
      const oldPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath); // Hapus foto lama
      }
    }

    // Nama file unik
    const filename = `avatar-${userId}-${Date.now()}.jpg`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    // Buat folder jika belum ada
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const fullPath = path.join(uploadPath, filename);

    // PROSES SHARP: Crop 300x300, Kompresi ke JPEG Berkualitas Rendah (Ukuran pasti < 100KB)
    await sharp(req.file.buffer)
      .resize(300, 300, { 
        fit: 'cover', // Memastikan gambar dipotong rapi menjadi persegi 1:1
        position: 'center' 
      })
      .jpeg({ quality: 80, mozjpeg: true }) // Kompresi maksimal jadi JPEG
      .toFile(fullPath);

    // Sesuaikan URL (Gunakan req.hostname agar dinamis saat deploy, fallback localhost)
    const baseUrl = process.env.BASE_URL || `http://${req.hostname}:${process.env.PORT || 3000}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${filename}`;

    // Update Database
    await UserModel.findByIdAndUpdate(userId, { avatarUrl: avatarUrl });

    res.status(200).json({
      error: false,
      message: 'Foto profil berhasil diubah',
      data: { avatarUrl }
    });

  } catch (err) {
    console.error('❌ Upload Error:', err.message);
    // Kirim error yang jelas, biar frontend tau kenapa gagal
    res.status(500).json({ error: true, message: err.message || 'Gagal memproses gambar di server' });
  }
});

export default router;