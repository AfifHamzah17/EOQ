// src/services/auth.service.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel.js';

export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

export const isPasswordStrong = (password) =>
  /^(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/.test(password);

// ===================== REGISTER =====================
export const register = async ({ name, username, email, noHp, namaCabang, password }) => {
  if (!name || !username || !email || !noHp || !namaCabang || !password) {
    throw { status: 400, message: 'Semua field wajib diisi' };
  }

  if (!/^0[0-9]{9,13}$/.test(noHp)) {
    throw { status: 400, message: 'Format No. HP tidak valid (harus diawali 0, 10-14 digit)' };
  }

  const existingUser = await UserModel.findOne({
    $or: [{ username }, { email }]
  });
  if (existingUser) {
    throw { status: 409, message: 'Username atau Email sudah terdaftar' };
  }

  if (!isPasswordStrong(password)) {
    throw { status: 400, message: 'Password tidak cukup kuat!' };
  }

  const hash = await bcrypt.hash(password, 10);

  await UserModel.create({
    username,
    email,
    noHp,
    passwordHash: hash,
    name,
    role: 'user',
    namaCabang,
    isApproved: false
  });

  return { message: 'Pendaftaran berhasil. Silakan tunggu persetujuan Admin.' };
};

// ===================== LOGIN =====================
export const login = async ({ identity, password }) => {
  const user = await UserModel.findOne({
    $or: [{ username: identity }, { email: identity }]
  });

  if (!user) {
    throw { status: 401, message: 'Username/email atau password salah' };
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw { status: 401, message: 'Username/email atau password salah' };
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // toJSON() sudah otomatis hapus passwordHash & __v lewat transform
  const userWithoutPassword = user.toJSON();

  return { token, user: userWithoutPassword };
};

// ===================== INIT ADMIN =====================
export const initAdmin = async () => {
  try {
    let admin = await UserModel.findOne({ role: 'admin' });

    if (admin) {
      if (!admin.isApproved) {
        admin.isApproved = true;
        await admin.save();
      }
    } else {
      const hash = await bcrypt.hash('123456', 10);
      await UserModel.create({
        username: 'admin',
        email: 'admin@eoq.com',
        noHp: '0000000000',
        passwordHash: hash,
        name: 'Administrator',
        role: 'admin',
        isApproved: true,
        namaCabang: 'Pusat'
      });
      console.log('✅ Default Admin created (User: admin / Pass: 123456)');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

// ===================== GET USER PROFILE (untuk /auth/me) =====================
export const getUserProfile = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };
  return user.toJSON();
};

// ===================== GET ALL USERS =====================
export const getAllUsers = async () => {
  const users = await UserModel.find({}).sort({ createdAt: -1 }).lean();
  return users.map(({ passwordHash, __v, ...safe }) => safe);
};

// ===================== GET USER BY ID =====================
export const getUserById = async (userId) => {
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;
  const { passwordHash, __v, ...safe } = user;
  return safe;
};

// ===================== GET PENDING USERS =====================
export const getPendingUsers = async () => {
  const users = await UserModel.find({ isApproved: false }).lean();
  return users.map(({ passwordHash, __v, ...safe }) => safe);
};

// ===================== APPROVE USER =====================
export const approveUserRegistration = async (adminRole, targetUserId) => {
  if (adminRole !== 'admin') throw { status: 403, message: 'Hanya Admin yang bisa approve' };

  const user = await UserModel.findById(targetUserId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };

  user.isApproved = true;
  await user.save();

  return `User ${user.username} berhasil di-approve`;
};

// ===================== CHANGE PASSWORD (SELF) =====================
export const changePassword = async (userId, oldPassword, newPassword) => {
  if (!isPasswordStrong(newPassword)) {
    throw { status: 400, message: 'Password baru tidak cukup kuat!' };
  }

  const user = await UserModel.findById(userId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };

  if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
    throw { status: 401, message: 'Password lama salah!' };
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return 'Password berhasil diubah';
};

// ===================== RESET PASSWORD (ADMIN) =====================
export const resetPasswordByAdmin = async (adminRole, targetUserId, newPassword) => {
  if (adminRole !== 'admin') throw { status: 403, message: 'Hanya Admin yang boleh mereset' };
  if (!isPasswordStrong(newPassword)) throw { status: 400, message: 'Password baru tidak cukup kuat!' };

  const user = await UserModel.findById(targetUserId);
  if (!user) throw { status: 404, message: 'User target tidak ditemukan' };

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return 'Password berhasil direset';
};

// ===================== UPDATE PROFILE =====================
export const updateProfile = async (userId, updateData) => {
  const { name, email, noHp, namaCabang } = updateData;

  // Validasi minimal ada yang diupdate
  if (!name && !email && !noHp && !namaCabang) {
    throw { status: 400, message: 'Tidak ada data yang diubah' };
  }

  const user = await UserModel.findById(userId);
  if (!user) throw { status: 404, message: 'User tidak ditemukan' };

  // Validasi email unik jika diubah
  if (email && email !== user.email) {
    if (!validateEmail(email)) {
      throw { status: 400, message: 'Format email tidak valid' };
    }
    const existingEmail = await UserModel.findOne({ email, _id: { $ne: userId } });
    if (existingEmail) {
      throw { status: 409, message: 'Email sudah digunakan oleh user lain' };
    }
  }

  // Validasi noHp jika diubah
  if (noHp && noHp !== user.noHp) {
    if (!/^0[0-9]{9,13}$/.test(noHp)) {
      throw { status: 400, message: 'Format No. HP tidak valid (harus diawali 0, 10-14 digit)' };
    }
  }

  // Update field yang dikirim saja
  if (name) user.name = name;
  if (email) user.email = email;
  if (noHp !== undefined && noHp !== null) user.noHp = noHp;
  if (namaCabang) user.namaCabang = namaCabang;

  await user.save();

  // Return updated user tanpa password
  return user.toJSON();
};

// ===================== DELETE USER (ADMIN) =====================
export const deleteUserByAdmin = async (adminRole, adminId, targetUserId) => {
  if (adminRole !== 'admin') {
    throw { status: 403, message: 'Hanya Admin yang bisa menghapus user' };
  }

  // 1. Cek hapus diri sendiri
  if (adminId.toString() === targetUserId.toString()) {
    throw { status: 400, message: 'Anda tidak bisa menghapus akun sendiri. Gunakan fitur lain.' };
  }

  const user = await UserModel.findById(targetUserId);
  if (!user) {
    throw { status: 404, message: 'User tidak ditemukan' };
  }

  // 2. Cek hapus admin lain
  if (user.role === 'admin') {
    throw { status: 400, message: 'Tidak bisa menghapus akun admin lain' };
  }

  await UserModel.findByIdAndDelete(targetUserId);
  return 'User berhasil dihapus';
};