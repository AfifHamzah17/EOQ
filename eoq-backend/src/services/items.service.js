//src/services/items.service.js
import { ItemModel, IncomingModel, OutgoingModel } from '../models/ItemModel.js';
import { STORE_PREFIXES } from '../constants/storePrefixes.js'; 

const getCabangFilter = (user) => user.role === 'admin' ? {} : { namaCabang: user.namaCabang };

const generateNextCode = async (cabang) => {
  const prefix = STORE_PREFIXES[cabang] || 'BRG';
  const lastItem = await ItemModel.findOne({ namaCabang: cabang }).sort({ createdAt: -1 });
  if (!lastItem) return `${prefix}-001`;
  const parts = lastItem.code.split('-');
  const lastNum = parseInt(parts[parts.length - 1]);
  return `${prefix}-${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(3, '0')}`;
};

export const processIncomingStock = async (data, user) => {
  const namaCabang = user.role === 'admin' ? data.namaCabang : user.namaCabang;
  if (!namaCabang) throw new Error('Nama cabang wajib diisi.');
  const { date, itemName, qty, shopName } = data;

  let item = await ItemModel.findOne({ name: itemName, shopName: shopName, namaCabang });
  let itemCode, isNew = false;

  if (!item) {
    itemCode = await generateNextCode(namaCabang);
    item = await ItemModel.create({ code: itemCode, name: itemName, shopName: shopName || '-', namaCabang, stock: 0 });
    isNew = true;
  } else { itemCode = item.code; }

  item.stock += parseInt(qty);
  await item.save();
  await IncomingModel.create({ itemCode, date, shopName: shopName || '-', namaCabang, itemName, qty: parseInt(qty), type: 'in' });
  return { message: isNew ? 'Barang baru dicatat' : 'Stok bertambah', code: itemCode, type: 'in' };
};

export const processStockOut = async (data, user) => {
  const namaCabang = user.role === 'admin' ? data.namaCabang : user.namaCabang;
  if (!namaCabang) throw new Error('Nama cabang wajib diisi.');
  const { date, itemName, qty, shopName } = data;

  const item = await ItemModel.findOne({ name: itemName, shopName: shopName, namaCabang });
  if (!item) throw new Error(`Barang "${itemName}" dari toko "${shopName}" di cabang "${namaCabang}" tidak ditemukan!`);
  if (item.stock < parseInt(qty)) throw new Error('Stok tidak mencukupi!');

  item.stock -= parseInt(qty);
  await item.save();
  await OutgoingModel.create({ itemCode: item.code, date, shopName: shopName, namaCabang, itemName, qty: parseInt(qty), type: 'out' });
  return { message: 'Stok berhasil dikurangi', code: item.code, type: 'out' };
};

// FIX: Cari master item dulu, lalu filter history menggunakan KOMBINASI UNIK (Bukan itemCode)
export const getItemHistory = async (itemCode, user) => {
  const item = await ItemModel.findOne({ code: itemCode });
  if (!item) return [];

  // Filter menggunakan kombinasi unik agar data lama yang salah tidak ikut terbaca
  const filter = { 
    itemName: item.name, 
    shopName: item.shopName, 
    namaCabang: item.namaCabang 
  };
  
  if (user.role !== 'admin') {
    filter.namaCabang = user.namaCabang;
  }

  const inList = await IncomingModel.find(filter);
  const outList = await OutgoingModel.find(filter);
  return [...inList.map(d => ({ ...d.toJSON(), collection: 'incoming' })), ...outList.map(d => ({ ...d.toJSON(), collection: 'outgoing' }))].sort((a, b) => b.timestamp - a.timestamp);
};

export const editTransaction = async (id, newData, collectionType) => {
  const Model = collectionType === 'incoming' ? IncomingModel : OutgoingModel;
  const doc = await Model.findById(id);
  if (!doc) throw new Error('Data tidak ditemukan');
  const item = await ItemModel.findOne({ code: doc.itemCode });
  if (!item) throw new Error('Master item hilang');
  if (doc.type === 'in') item.stock -= doc.qty; else item.stock += doc.qty;
  const newQty = parseInt(newData.qty);
  if (newData.type === 'in') item.stock += newQty; else item.stock -= newQty;
  if (item.stock < 0) throw new Error('Stok hasil edit menjadi negatif!');
  await item.save();
  doc.type = newData.type || doc.type; doc.date = newData.date; doc.qty = newQty;
  await doc.save();
  return { message: 'Transaksi diupdate' };
};

export const getItems = async (user) => { return await ItemModel.find(getCabangFilter(user)).sort({ createdAt: -1 }); };
export const createItem = async (data) => { const code = await generateNextCode(data.namaCabang); return await ItemModel.create({ ...data, code, stock: parseInt(data.stock) || 0 }); };
export const updateItem = async (id, data) => { await ItemModel.findByIdAndUpdate(id, { name: data.name, shopName: data.shopName, stock: parseInt(data.stock) }); return { message: 'Updated' }; };
export const deleteItem = async (id) => { await ItemModel.findByIdAndDelete(id); return { message: 'Deleted' }; };

export const getInventoryReport = async (user) => {
  const filter = getCabangFilter(user);
  const items = await ItemModel.find(filter).sort({ createdAt: -1 });
  const inAgg = await IncomingModel.aggregate([{ $match: filter }, { $group: { _id: "$itemCode", totalIn: { $sum: "$qty" } } }]);
  const outAgg = await OutgoingModel.aggregate([{ $match: filter }, { $group: { _id: "$itemCode", totalOut: { $sum: "$qty" } } }]);
  const mapIn = new Map(inAgg.map(i => [i._id, i.totalIn]));
  const mapOut = new Map(outAgg.map(i => [i._id, i.totalOut]));
  return items.map(item => ({ ...item.toJSON(), id: item._id, totalIn: mapIn.get(item.code) || 0, totalOut: mapOut.get(item.code) || 0 }));
};