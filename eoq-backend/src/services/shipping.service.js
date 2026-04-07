// src/services/shipping.service.js
import { ShippingModel } from '../models/ShippingModel.js';
import { STORE_PREFIXES } from '../constants/storePrefixes.js'; // <- Import dari sini biar sama

const getCabangFilter = (user) => user.role === 'admin' ? {} : { namaCabang: user.namaCabang };

const generateShippingNo = async (cabang) => {
  const prefix = STORE_PREFIXES[cabang] || 'SHP';
  const last = await ShippingModel.findOne({ namaCabang: cabang }).sort({ createdAt: -1 });
  if (!last) return `${prefix}-SHP-001`;
  const parts = last.shippingNo.split('-');
  const lastNum = parseInt(parts[parts.length - 1]);
  return `${prefix}-SHP-${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(3, '0')}`;
};

export const createShipping = async (data, user) => {
  const namaCabang = user.role === 'admin' ? data.namaCabang : user.namaCabang;
  if (!namaCabang) throw new Error('Nama cabang wajib diisi');
  return await ShippingModel.create({ 
    shippingNo: data.shippingNo || await generateShippingNo(namaCabang), 
    date: data.date, 
    name: data.name, 
    price: parseInt(data.price), 
    namaCabang 
  });
};

export const getAllShippings = async (user) => { 
  return await ShippingModel.find(getCabangFilter(user)).sort({ createdAt: -1 }); 
};

export const getShippingById = async (id, user) => {
  const ship = await ShippingModel.findById(id);
  if (!ship) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && ship.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  return ship;
};

export const updateShipping = async (id, data, user) => {
  const ship = await ShippingModel.findById(id);
  if (!ship) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && ship.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  await ShippingModel.findByIdAndUpdate(id, { 
    shippingNo: data.shippingNo, 
    date: data.date, 
    name: data.name, 
    price: parseInt(data.price) 
  });
  return { message: 'Updated' };
};

export const deleteShipping = async (id, user) => {
  const ship = await ShippingModel.findById(id);
  if (!ship) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && ship.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  await ShippingModel.findByIdAndDelete(id);
  return { message: 'Deleted' };
};

export const uploadShippingCsv = async (dataArray, user) => {
  const results = [];
  for (const row of dataArray) { 
    try { 
      results.push({ error: false, message: 'Berhasil', data: await createShipping(row, user) }); 
    } catch (err) { 
      results.push({ error: true, message: err.message, data: row }); 
    } 
  }
  return { message: 'Proses CSV selesai', results };
};