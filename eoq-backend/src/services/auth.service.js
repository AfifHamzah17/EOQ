import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';

const usersCol = () => getFirestore().collection('users');

// <--- TAMBAHKAN 'export' DI SINI --->
export const validateEmail = (email) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

// <--- TAMBAHKAN 'export' DI SINI --->
export const isPasswordStrong = (password) => {
  const regex = /^(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/;
  return regex.test(password);
};

// 1. REGISTER (Membuat User Baru + ID Baru)
export const register = async ({ username, email, password, name, role = 'user' }) => {
  if (!username || !email || !password || !name) {
    const err = new Error('Username, email, password, dan nama wajib diisi');
    err.status = 400;
    throw err;
  }

  if (!validateEmail(email)) { // Memanggil exported function
    const err = new Error('Format email tidak valid');
    err.status = 400;
    throw err;
  }

  if (!isPasswordStrong(password)) { // Memanggil exported function
    const err = new Error('Password lemah! Minimal 8 karakter, 1 huruf BESAR, dan 1 angka/simbol');
    err.status = 400;
    throw err;
  }

  // Cek Username unik
  const snapUser = await usersCol().where('username', '==', username).limit(1).get();
  if (!snapUser.empty) {
    const err = new Error('Username sudah terdaftar');
    err.status = 409;
    throw err;
  }

  // Cek Email unik
  const snapEmail = await usersCol().where('email', '==', email).limit(1).get();
  if (!snapEmail.empty) {
    const err = new Error('Email sudah terdaftar');
    err.status = 409;
    throw err;
  }

  // --- GENERATE ID BARU (UUID) ---
  const userId = uuidv4(); 
  const hash = await bcrypt.hash(password, 10);

  await usersCol().doc(userId).set({
    userId,
    username,
    email,
    passwordHash: hash,
    name,
    role, 
    avatarUrl: null,
    createdAt: new Date()
  });

  // Return ID agar user/terdepan tahu ID barunya
  return { message: 'Pendaftaran berhasil', userId, username };
};

// 2. LOGIN
export const login = async (reqBody) => {
  // 1. CEK APAKAH BODY DITERIMA (DEBUGGING)
  if (!reqBody || Object.keys(reqBody).length === 0) {
    const err = new Error('BODY KOSONG. Server tidak menerima data JSON. Cek Content-Type header di Postman/Frontend.');
    err.status = 400;
    throw err;
  }

  // 2. CEK APAKAH DATA ADA
  const { identity, password } = reqBody;

  if (!identity) {
    const err = new Error('DATA TIDAK LENGKAP: Field "identity" (username/email) tidak ditemukan.');
    err.status = 400;
    throw err;
  }

  if (!password) {
    const err = new Error('DATA TIDAK LENGKAP: Field "password" tidak ditemukan.');
    err.status = 400;
    throw err;
  }

  // --- LOGIKA LOGIN LAINNYA ---
  const { getFirestore } = await import('../utils/index.js');
  const usersCol = getFirestore().collection('users');

  let userData = null;
  let userId = null;

  // Cari user berdasarkan username ATAU email
  const snapshot = await usersCol
    .where('username', '==', identity)
    .limit(1)
    .get();

  if (snapshot.empty) {
    const snapEmail = await usersCol
      .where('email', '==', identity)
      .limit(1)
      .get();
    
    if (!snapEmail.empty) {
      userData = snapEmail.docs[0].data();
      userId = snapEmail.docs[0].id;
    }
  } else {
    userData = snapshot.docs[0].data();
    userId = snapshot.docs[0].id;
  }

  if (!userData) {
    const err = new Error('LOGIN GAGAL: Username, Email, atau password salah.');
    err.status = 401;
    throw err;
  }

  // (Logika password compare, jwt sign, dll tetap sama) ...
  const bcrypt = (await import('bcrypt')).default;
  const jwt = (await import('jsonwebtoken')).default;

  const match = await bcrypt.compare(password, userData.passwordHash);
  if (!match) {
    const err = new Error('LOGIN GAGAL: Username, Email, atau password salah.');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { 
      userId, 
      username: userData.username, 
      email: userData.email,
      name: userData.name, 
      role: userData.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      userId, 
      name: userData.name,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatarUrl
    }
  };
};

// 3. INIT ADMIN (Juga pakai UUID)
export const initAdmin = async () => {
  const snap = await usersCol().where('role', '==', 'admin').limit(1).get();
  
  if (snap.empty) {
    const adminId = uuidv4(); // Generate ID Admin
    const hash = await bcrypt.hash('123456', 10);
    
    await usersCol().doc(adminId).set({
      userId: adminId,
      username: 'admin',
      email: 'admin@eoq.com', 
      passwordHash: hash,
      name: 'Administrator',
      role: 'admin',
      avatarUrl: null
    });
    console.log('✅ Default Admin created (UUID): (User: admin / Pass: 123456)');
  }
};

// 4. GET USER PROFILE (Single)
export const getUserProfile = async (userId) => {
  const doc = await usersCol().doc(userId).get();
  if (!doc.exists) {
    const err = new Error('User tidak ditemukan');
    err.status = 404;
    throw err;
  }
  const userData = doc.data();
  delete userData.passwordHash;
  return userData;
};

// 5. GET ALL USERS (Admin Only)
export const getAllUsers = async () => {
  const snapshot = await usersCol().get();
  const users = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    delete data.passwordHash;
    users.push({
      userId: doc.id, // UUID dari Doc ID
      ...data
    });
  });
  return users;
};

// 6. CHANGE PASSWORD (User sendiri)
export const changePassword = async (userId, oldPassword, newPassword) => {
  if (!isPasswordStrong(newPassword)) { // Memanggil exported function
    const err = new Error('Password baru tidak cukup kuat!');
    err.status = 400;
    throw err;
  }

  const doc = await usersCol().doc(userId).get();
  if (!doc.exists) {
    const err = new Error('User tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const userData = doc.data();
  const isMatch = await bcrypt.compare(oldPassword, userData.passwordHash);
  if (!isMatch) {
    const err = new Error('Password lama salah!');
    err.status = 401;
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await usersCol().doc(userId).update({ passwordHash: hash });

  return 'Password berhasil diubah';
};

// 7. RESET PASSWORD BY ADMIN
export const resetPasswordByAdmin = async (adminRole, targetUserId, newPassword) => {
  if (adminRole !== 'admin') {
    const err = new Error('Hanya Admin yang boleh mereset password orang lain');
    err.status = 403;
    throw err;
  }

  if (!isPasswordStrong(newPassword)) { // Memanggil exported function
    const err = new Error('Password baru tidak cukup kuat!');
    err.status = 400;
    throw err;
  }

  const doc = await usersCol().doc(targetUserId).get();
  if (!doc.exists) {
    const err = new Error('User target tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await usersCol().doc(targetUserId).update({ passwordHash: hash });

  return `Password berhasil direset`;
};