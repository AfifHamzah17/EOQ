import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  shopName: { type: String, required: true }, // Asal barang / supplier
  namaCabang: { type: String, required: true }, // Pemilik stok / outlet
  stock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const IncomingSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  date: { type: Date, required: true },
  shopName: String,
  namaCabang: { type: String, required: true },
  itemName: String,
  qty: { type: Number, required: true },
  type: { type: String, default: 'in' },
  timestamp: { type: Number, default: Date.now }
});

const OutgoingSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  date: { type: Date, required: true },
  shopName: String,
  namaCabang: { type: String, required: true },
  itemName: String,
  qty: { type: Number, required: true },
  type: { type: String, default: 'out' },
  timestamp: { type: Number, default: Date.now }
});

const setupVirtuals = (schema) => { schema.set('toJSON', { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }); };
setupVirtuals(ItemSchema);
setupVirtuals(IncomingSchema);
setupVirtuals(OutgoingSchema);

export const ItemModel = mongoose.model('Item', ItemSchema);
export const IncomingModel = mongoose.model('IncomingStock', IncomingSchema);
export const OutgoingModel = mongoose.model('OutgoingStock', OutgoingSchema);