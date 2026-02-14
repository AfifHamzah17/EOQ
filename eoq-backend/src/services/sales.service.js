import { SalesModel } from '../models/SalesModel.js';

// Helper: Generate PJL-001
const generateSalesNo = async () => {
  const last = await SalesModel.findOne().sort({ createdAt: -1 });
  if (!last) return 'PJL-001';
  
  const lastCode = last.salesNo; // "PJL-001"
  const lastNum = parseInt(lastCode.split('-')[1]);
  
  if (isNaN(lastNum)) return 'PJL-001';
  
  const nextNum = lastNum + 1;
  return `PJL-${String(nextNum).padStart(3, '0')}`;
};

export const createSale = async (data) => {
  const salesNo = data.salesNo || await generateSalesNo();

  // Parse semua field angka ke Integer
  const newSale = await SalesModel.create({
    salesNo,
    date: data.date,
    remainingMoney: parseInt(data.remainingMoney) || 0,
    expense: parseInt(data.expense) || 0,
    totalAll: parseInt(data.totalAll) || 0,
    serba35: parseInt(data.serba35) || 0,
    serba75: parseInt(data.serba75) || 0,
  });

  return newSale;
};

export const getAllSales = async () => {
  return await SalesModel.find().sort({ createdAt: -1 });
};

export const getSaleById = async (id) => {
  const sale = await SalesModel.findById(id);
  if (!sale) throw new Error('Data penjualan tidak ditemukan');
  return sale;
};

export const updateSale = async (id, data) => {
  const updateData = {
    salesNo: data.salesNo, // Bisa diedit manual jika perlu
    date: data.date,
    remainingMoney: parseInt(data.remainingMoney) || 0,
    expense: parseInt(data.expense) || 0,
    totalAll: parseInt(data.totalAll) || 0,
    serba35: parseInt(data.serba35) || 0,
    serba75: parseInt(data.serba75) || 0,
  };

  await SalesModel.findByIdAndUpdate(id, updateData);
  return { message: 'Data penjualan berhasil diperbarui' };
};

export const deleteSale = async (id) => {
  await SalesModel.findByIdAndDelete(id);
  return { message: 'Data penjualan berhasil dihapus' };
};

export const uploadSalesCsv = async (dataArray) => {
  const results = [];
  
  for (const row of dataArray) {
    try {
      // Cek duplikat opsional, atau langsung buat baru
      // Jika salesNo kosong di CSV, generate otomatis
      if (!row.salesNo) row.salesNo = await generateSalesNo();
      
      const created = await createSale(row);
      results.push({ error: false, message: 'Berhasil', data: created });
    } catch (err) {
      results.push({ error: true, message: err.message, data: row });
    }
  }
  
  return { message: 'Proses upload selesai', results };
};