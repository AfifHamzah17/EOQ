import mongoose from 'mongoose';

const ShippingSchema = new mongoose.Schema({
  shippingNo: { type: String, unique: true }, // SHP-001
  date: { type: Date, default: Date.now },
  name: { type: String, required: true }, // Nama Penerima/Tujuan
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

ShippingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const ShippingModel = mongoose.model('Shipping', ShippingSchema);