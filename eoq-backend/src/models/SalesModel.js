import mongoose from 'mongoose';

const SalesSchema = new mongoose.Schema({
  salesNo: { type: String, required: true, unique: true }, // PJL-001
  date: { type: Date, required: true },
  
  // Untuk uang, kita gunakan Number (Integer) agar aman dari floating point error
  // Simpan dalam satuan terkecil (misal 16055000), frontend yang akan format nanti
  remainingMoney: { type: Number, default: 0 }, // Sisa Uang
  expense: { type: Number, default: 0 },        // Pengeluaran
  totalAll: { type: Number, default: 0 },       // Total Seluruh
  
  serba35: { type: Number, default: 0 },        // Serba 35
  serba75: { type: Number, default: 0 },        // Serba 75
  
  createdAt: { type: Date, default: Date.now }
});

// Virtual helper agar front-end mudah baca 'id'
SalesSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const SalesModel = mongoose.model('Sale', SalesSchema);