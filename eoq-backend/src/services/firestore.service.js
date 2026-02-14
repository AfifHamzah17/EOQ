//src/services/firestore.service.js
import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Singleton Pattern
let db;

export const getFirestore = () => {
  if (!db) {
    // Pastikan path service account.json benar di .env atau relative path
    db = new Firestore({
      projectId: process.env.FIRESTORE_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
    });
    console.log('🔥 Firestore Connected');
  }
  return db;
};