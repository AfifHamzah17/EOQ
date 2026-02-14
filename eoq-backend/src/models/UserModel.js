import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'karyawan'], default: 'karyawan' },
  avatarUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Virtual field 'id' agar mirip Firestore (front-end biasa pakai 'id')
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash; // Jangan kirim password hash ke client
    return ret;
  }
});

export const UserModel = mongoose.model('User', UserSchema);