import { SalesModel } from '../models/SalesModel.js';

const generateSalesNo = async () => {
  const last = await SalesModel.findOne().sort({ createdAt: -1 });
  if (!last) return 'PJL-001';
  
  const lastCode = last.salesNo; 
  const lastNum = parseInt(lastCode.split('-')[1]);
  
  if (isNaN(lastNum)) return 'PJL-001';
  
  const nextNum = lastNum + 1;
  return `PJL-${String(nextNum).padStart(3, '0')}`;
};

export const createSale = async (data) => {
  const inputDate = new Date(data.date);
  inputDate.setHours(0, 0, 0, 0); 

  const existing = await SalesModel.findOne({ 
    date: { $gte: inputDate, $lt: new Date(inputDate.getTime() + 24*60*60*1000) } 
  });
  
  if (existing) {
    throw new Error(`Tanggal ${data.date} sudah ada di database. Hanya boleh 1 data per tanggal.`);
  }

  const salesNo = data.salesNo || await generateSalesNo();

  const newSale = await SalesModel.create({
    salesNo,
    date: data.date,
    remainingMoney: parseInt(data.remainingMoney) || 0,
    expense: parseInt(data.expense) || 0,
    totalAll: parseInt(data.totalAll) || 0,
    serba35: parseInt(data.serba35) || 0,
    serba50: parseInt(data.serba50) || 0, 
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
  if (data.date) {
    const inputDate = new Date(data.date);
    inputDate.setHours(0, 0, 0, 0);
    
    const existing = await SalesModel.findOne({ 
      date: { $gte: inputDate, $lt: new Date(inputDate.getTime() + 24*60*60*1000) },
      _id: { $ne: id } 
    });

    if (existing) {
      throw new Error(`Tanggal ${data.date} sudah digunakan oleh data lain.`);
    }
  }

  const updateData = {
    salesNo: data.salesNo, 
    date: data.date,
    remainingMoney: parseInt(data.remainingMoney) || 0,
    expense: parseInt(data.expense) || 0,
    totalAll: parseInt(data.totalAll) || 0,
    serba35: parseInt(data.serba35) || 0,
    serba50: parseInt(data.serba50) || 0,
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
      if (!row.salesNo) row.salesNo = await generateSalesNo();
      
      const created = await createSale(row); 
      results.push({ error: false, message: 'Berhasil', data: created });
    } catch (err) {
      results.push({ error: true, message: err.message, data: row });
    }
  }
  
  return { message: 'Proses upload selesai', results };
};