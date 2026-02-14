import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel.js';

// Helper
export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
export const isPasswordStrong = (password) => /^(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/.test(password);

// 1. REGISTER
export const register = async ({ username, email, password, name, role = 'karyawan' }) => {
  if (!username || !email || !password || !name) throw { status: 400, message: 'Data wajib diisi' };
  if (!validateEmail(email)) throw { status: 400, message: 'Format email tidak valid' };
  if (!isPasswordStrong(password)) throw { status: 400, message: 'Password lemah!' };

  const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
  if (existingUser) throw { status: 409, message: 'Username atau Email sudah terdaftar' };

  const hash = await bcrypt.hash(password, 10);
  
  const user = await UserModel.create({
    username, email, passwordHash: hash, name, role
  });

  return { message: 'Pendaftaran berhasil', userId: user.id, username };
};

// 2. LOGIN
export const login = async (reqBody) => {
  const { identity, password } = reqBody;
  if (!identity || !password) throw { status: 400, message: 'Identitas dan password wajib diisi' };

  // Cari by username ATAU email
  const user = await UserModel.findOne({
    $or: [{ username: identity }, { email: identity }]
  });

  if (!user) throw { status: 401, message: 'Login Gagal: User tidak ditemukan' };

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw { status: 401, message: 'Login Gagal: Password salah' };

  const token = jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      email: user.email,
      name: user.name, 
      role: user.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      userId: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatarUrl
    }
  };
};

// 3. INIT ADMIN
export const initAdmin = async () => {
  const adminExists = await UserModel.findOne({ role: 'admin' });
  if (!adminExists) {
    const hash = await bcrypt.hash('123456', 10);
    await UserModel.create({
      username: 'admin',
      email: 'admin@eoq.com',
      passwordHash: hash,
      name: 'Administrator',
      role: 'admin'
    });
    console.log('✅ Default Admin created (User: admin / Pass: 123456)');
  }
};

// 4. GET USER PROFILE
export const getUserProfile = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };
  return user.toJSON(); // sudah handle remove password via schema config
};

// 5. GET ALL USERS
export const getAllUsers = async () => {
  const users = await UserModel.find();
  return users.map(u => u.toJSON());
};

// 6. CHANGE PASSWORD
export const changePassword = async (userId, oldPassword, newPassword) => {
  if (!isPasswordStrong(newPassword)) throw { status: 400, message: 'Password baru tidak cukup kuat!' };

  const user = await UserModel.findById(userId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) throw { status: 401, message: 'Password lama salah!' };

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return 'Password berhasil diubah';
};

// 7. RESET PASSWORD BY ADMIN
export const resetPasswordByAdmin = async (adminRole, targetUserId, newPassword) => {
  if (adminRole !== 'admin') throw { status: 403, message: 'Hanya Admin yang boleh mereset' };
  if (!isPasswordStrong(newPassword)) throw { status: 400, message: 'Password baru tidak cukup kuat!' };

  const user = await UserModel.findById(targetUserId);
  if (!user) throw { status: 404, message: 'User target tidak ditemukan' };

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return 'Password berhasil direset';
};