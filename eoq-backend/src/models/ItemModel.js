import mongoose from 'mongoose';

// Skema Master Barang
const ItemSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // BRG-001
  name: { type: String, required: true },
  shopName: { type: String, required: true }, // Nama Toko/Supplier
  stock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Skema Riwayat Barang Masuk
const IncomingSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  date: { type: Date, required: true },
  shopName: String,
  itemName: String,
  qty: { type: Number, required: true },
  type: { type: String, default: 'in' },
  timestamp: { type: Number, default: Date.now }
});

// Skema Riwayat Barang Keluar
const OutgoingSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  date: { type: Date, required: true },
  shopName: String,
  itemName: String,
  qty: { type: Number, required: true },
  type: { type: String, default: 'out' },
  timestamp: { type: Number, default: Date.now }
});

// Setup JSON output
const setupVirtuals = (schema) => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
};

setupVirtuals(ItemSchema);
setupVirtuals(IncomingSchema);
setupVirtuals(OutgoingSchema);

export const ItemModel = mongoose.model('Item', ItemSchema);
export const IncomingModel = mongoose.model('IncomingStock', IncomingSchema);
export const OutgoingModel = mongoose.model('OutgoingStock', OutgoingSchema);