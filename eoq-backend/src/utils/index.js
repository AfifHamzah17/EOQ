import 'dotenv/config';
import mongoose from 'mongoose';

let db;

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGODB_URI tidak ditemukan di environment variables.');
  throw new Error('Gagal menginisialisasi MongoDB: Connection String Missing');
}

export const connectDB = async () => {
  if (db) return db;

  try {
    const conn = await mongoose.connect(MONGO_URI);
    db = conn.connection;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return db;
  } catch (error) {
    console.error(`❌ Error koneksi MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!db) throw new Error('Database belum terkoneksi. Panggil connectDB dulu.');
  return db;
};