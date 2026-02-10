// import 'dotenv/config'; // <--- TAMBAHKAN INI (atau import dotenv dari 'dotenv' lalu dotenv.config())
// import { Firestore } from '@google-cloud/firestore';
// import { Storage } from '@google-cloud/storage';

// let db;
// let storage;

// // Kita gunakan variabel yang sama dengan app.js
// const PROJECT_ID = process.env.GCLOUD_PROJECT_ID;
// const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET;

// export const getFirestore = () => {
//   if (!db) {
//     // Cek dulu agar tidak error karena undefined
//     if (!PROJECT_ID) {
//       console.error('Gagal membaca GCLOUD_PROJECT_ID. Apakah file .env ada?');
//       throw new Error('❌ ERROR: GCLOUD_PROJECT_ID tidak ditemukan di file .env');
//     }

//     console.log(`🔍 Connecting to Firestore Project: ${PROJECT_ID}...`);
    
//     db = new Firestore({
//       projectId: PROJECT_ID,
//     });
    
//     console.log('✅ Firestore Client Initialized');
//   }
//   return db;
// };

// export const getStorage = () => {
//   if (!storage) {
//     if (!PROJECT_ID) {
//       console.error('Gagal membaca GCLOUD_PROJECT_ID. Apakah file .env ada?');
//       throw new Error('❌ ERROR: GCLOUD_PROJECT_ID tidak ditemukan di file .env');
//     }

//     console.log(`🗄️  Connecting to Storage Bucket: ${BUCKET_NAME || 'Default'}...`);
    
//     storage = new Storage({
//       projectId: PROJECT_ID,
//     });
    
//     console.log('✅ Storage Client Initialized');
//   }
//   return storage;
// };

import 'dotenv/config'; // Auto-load .env dari root folder
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

// Inisialisasi Variabel Client (Singleton Pattern)
let db;
let storage;

// Ambil Env Var
const PROJECT_ID = process.env.GCLOUD_PROJECT_ID;
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET;

// --- EXPORT FIRESTORE ---
export const getFirestore = () => {
  if (!db) {
    // Validasi ENV Var
    if (!PROJECT_ID) {
      console.error('❌ ERROR: GCLOUD_PROJECT_ID tidak ditemukan di environment variables.');
      throw new Error('Gagal menginisialisasi Firestore: Project ID Missing');
    }

    console.log(`🔍 Connecting to Firestore Project: ${PROJECT_ID}...`);
    
    // Inisialisasi Client Firestore
    // Di Cloud Run, credentials otomatis diambil dari Service Account Default (ADC).
    // Jadi tidak perlu import service account JSON secara manual di sini.
    db = new Firestore({
      projectId: PROJECT_ID,
      // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // Opsional: jika mau force pakai file key lokal
    });
    
    console.log('✅ Firestore Client Initialized');
  }
  return db;
};

// --- EXPORT STORAGE ---
export const getStorage = () => {
  if (!storage) {
    // Validasi ENV Var
    if (!PROJECT_ID) {
      console.error('❌ ERROR: GCLOUD_PROJECT_ID tidak ditemukan di environment variables.');
      throw new Error('Gagal menginisialisasi Storage: Project ID Missing');
    }

    console.log(`🗄️  Connecting to Storage Bucket: ${BUCKET_NAME || 'Default'}...`);
    
    // Inisialisasi Client Storage
    storage = new Storage({
      projectId: PROJECT_ID,
    });
    
    console.log('✅ Storage Client Initialized');
  }
  return storage;
};