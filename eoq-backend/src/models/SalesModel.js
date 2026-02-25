import mongoose from 'mongoose';

const SalesSchema = new mongoose.Schema({
  salesNo: { type: String, required: true, unique: true },
  date: { type: Date, required: true, unique: true }, 
  
  remainingMoney: { type: Number, default: 0 }, 
  expense: { type: Number, default: 0 },        
  totalAll: { type: Number, default: 0 },       
  
  serba35: { type: Number, default: 0 },        
  serba50: { type: Number, default: 0 },        
  serba75: { type: Number, default: 0 },        
  
  createdAt: { type: Date, default: Date.now }
});

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