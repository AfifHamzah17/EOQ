// src/models/UserModel.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  noHp: { type: String, default: '', trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  namaCabang: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  avatarUrl: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const UserModel = mongoose.model('User', userSchema);