//src/services/sales.service.js
import { SalesModel } from '../models/SalesModel.js';
import { STORE_PREFIXES } from '../constants/storePrefixes.js'; 

const getCabangFilter = (user) => user.role === 'admin' ? {} : { namaCabang: user.namaCabang };

const generateNextSalesNo = async (cabang) => {
  const prefix = STORE_PREFIXES[cabang] || 'BRG';
  
  const lastSale = await SalesModel.findOne({ namaCabang: cabang })
    .sort({ createdAt: -1 })
    .select('salesNo')
    .limit(1);

  if (!lastSale) return `${prefix}-PJL-001`;

  const parts = lastSale.salesNo.split('-');
  const lastNum = parseInt(parts[parts.length - 1]);
  return `${prefix}-PJL-${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(3, '0')}`;
};

export const createSale = async (data, user) => {
  const namaCabang = user.role === 'admin' ? data.namaCabang : user.namaCabang;
  if (!namaCabang) throw new Error('Nama cabang wajib diisi.');

  const salesNo = await generateNextSalesNo(namaCabang);

  // FIX: ...data ditaruh paling depan agar salesNo & namaCabang dari backend tidak tertimpa data kosong dari frontend
  const newSale = await SalesModel.create({
    ...data,
    salesNo,
    namaCabang
  });

  return newSale;
};

export const getAllSales = async (user) => { 
  return await SalesModel.find(getCabangFilter(user)).sort({ createdAt: -1 }); 
};

export const getSaleById = async (id, user) => {
  const sale = await SalesModel.findById(id);
  if (!sale) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && sale.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  return sale;
};

export const updateSale = async (id, data, user) => {
  const sale = await SalesModel.findById(id);
  if (!sale) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && sale.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  
  await SalesModel.findByIdAndUpdate(id, { 
    salesNo: data.salesNo, 
    date: data.date, 
    remainingMoney: parseInt(data.remainingMoney) || 0, 
    expense: parseInt(data.expense) || 0, 
    totalAll: parseInt(data.totalAll) || 0, 
    serba35: parseInt(data.serba35) || 0, 
    serba50: parseInt(data.serba50) || 0, 
    serba75: parseInt(data.serba75) || 0 
  });
  
  return { message: 'Data penjualan berhasil diperbarui' };
};

export const deleteSale = async (id, user) => {
  const sale = await SalesModel.findById(id);
  if (!sale) throw new Error('Data tidak ditemukan');
  if (user.role !== 'admin' && sale.namaCabang !== user.namaCabang) throw new Error('Akses ditolak');
  await SalesModel.findByIdAndDelete(id);
  return { message: 'Data penjualan berhasil dihapus' };
};

export const uploadSalesCsv = async (dataArray, user) => {
  const results = [];
  for (const row of dataArray) { 
    try { 
      results.push({ error: false, message: 'Berhasil', data: await createSale(row, user) }); 
    } catch (err) { 
      results.push({ error: true, message: err.message, data: row }); 
    } 
  }
  return { message: 'Proses upload selesai', results };
};