import { getStorage } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export const uploadProfilePicture = async (fileBuffer, username, currentAvatarUrl) => {
  const bucketName = process.env.GCLOUD_STORAGE_BUCKET;
  const bucket = getStorage().bucket(bucketName);

  // 1. HAPUS FOTO LAMA (PERBAIKAN LOGIKA PATH)
  if (currentAvatarUrl) {
    try {
      // URL: https://storage.googleapis.com/eoqbucket/pictures/file.jpg
      // Kita butuh: pictures/file.jpg
      
      // Hapus prefix URL biar dapat path folder yang benar
      const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
      
      if (currentAvatarUrl.startsWith(urlPrefix)) {
        const oldFilePath = currentAvatarUrl.replace(urlPrefix, '');
        
        // Lakukan hapus
        await bucket.file(oldFilePath).delete();
        console.log(`🗑️  Foto lama berhasil dihapus dari GCS: ${oldFilePath}`);
      }
    } catch (err) {
      // Jangan batalkan upload jika gagal hapus (misal file memang sudah dihapus manual)
      console.warn('⚠️  Gagal menghapus foto lama:', err.message);
    }
  }

  // 2. Resize & Compress gambar baru (512x512)
  const processedBuffer = await sharp(fileBuffer)
    .resize(512, 512, { fit: 'cover' }) // <--- UBAH KE 512
    .jpeg({ quality: 80 })
    .toBuffer();

  // 3. Generate nama file unik di folder /pictures
  const fileName = `pictures/${username}_${uuidv4()}.jpg`;
  const file = bucket.file(fileName);

  console.log(`⏳ Mengupload ${fileName}...`);

  // 4. Upload ke Google Cloud Storage
  await file.save(processedBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=86400'
    },
    predefinedAcl: 'publicRead',
  });

  console.log(`✅ Upload Berhasil!`);

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
};