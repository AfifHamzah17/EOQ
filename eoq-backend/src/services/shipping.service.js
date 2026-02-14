import { ShippingModel } from '../models/ShippingModel.js';

const generateShippingNo = async () => {
  const last = await ShippingModel.findOne().sort({ createdAt: -1 });
  if (!last) return 'SHP-001';
  const lastNum = parseInt(last.shippingNo.split('-')[1]);
  return `SHP-${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(3, '0')}`;
};

export const createShipping = async (data) => {
  const shippingNo = data.shippingNo || await generateShippingNo();
  const price = parseInt(data.price); // Asumsi input sudah integer atau string angka

  const newShip = await ShippingModel.create({
    shippingNo,
    date: data.date,
    name: data.name,
    price
  });
  return newShip;
};

export const getAllShippings = async () => {
  return await ShippingModel.find().sort({ createdAt: -1 });
};

export const getShippingById = async (id) => {
  const ship = await ShippingModel.findById(id);
  if (!ship) throw new Error('Data tidak ditemukan');
  return ship;
};

export const updateShipping = async (id, data) => {
  await ShippingModel.findByIdAndUpdate(id, {
    shippingNo: data.shippingNo,
    date: data.date,
    name: data.name,
    price: parseInt(data.price)
  });
  return { message: 'Updated' };
};

export const deleteShipping = async (id) => {
  await ShippingModel.findByIdAndDelete(id);
  return { message: 'Deleted' };
};

export const uploadShippingCsv = async (dataArray) => {
  const results = [];
  for (const row of dataArray) {
    try {
      const res = await createShipping(row); // Reuse create logic
      results.push({ error: false, message: 'Berhasil', data: res });
    } catch (err) {
      results.push({ error: true, message: err.message, data: row });
    }
  }
  return { message: 'Proses CSV selesai', results };
};