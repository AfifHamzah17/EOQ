import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Hack untuk dapatkan __dirname di ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder tujuan (di luar folder src)
const uploadDir = path.join(__dirname, '../../public/uploads');

// Pastikan folder ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadProfilePicture = async (fileBuffer, username, currentAvatarUrl) => {
  // 1. Hapus Foto Lama jika ada
  if (currentAvatarUrl) {
    try {
      // Asumsi URL: http://localhost:3000/uploads/namafile.jpg
      const filename = currentAvatarUrl.split('/').pop();
      const oldPath = path.join(uploadDir, filename);
      
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log(`🗑️ Foto lama terhapus: ${filename}`);
      }
    } catch (err) {
      console.warn('⚠️ Gagal hapus foto lama:', err.message);
    }
  }

  // 2. Process & Save
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = `profile-${username}-${uniqueSuffix}.jpg`;
  const outputPath = path.join(uploadDir, filename);

  await sharp(fileBuffer)
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  // Kembalikan URL yang bisa diakses publik
  // Nanti kita set static folder di index.js
  return `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${filename}`;
};