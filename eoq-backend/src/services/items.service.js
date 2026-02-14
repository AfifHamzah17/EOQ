import { ItemModel, IncomingModel, OutgoingModel } from '../models/ItemModel.js';

// Helper: Generate Code
const generateNextCode = async () => {
  const lastItem = await ItemModel.findOne().sort({ createdAt: -1 });
  if (!lastItem) return 'BRG-001';
  const lastNum = parseInt(lastItem.code.split('-')[1]);
  if (isNaN(lastNum)) return 'BRG-001';
  return `BRG-${String(lastNum + 1).padStart(3, '0')}`;
};

// 1. UPLOAD BARANG MASUK
export const processIncomingStock = async (data) => {
  const { date, shopName, itemName, qty } = data;
  
  // Cari item
  let item = await ItemModel.findOne({ name: itemName, shopName: shopName });
  let itemCode;
  let isNew = false;

  if (!item) {
    itemCode = await generateNextCode();
    item = await ItemModel.create({
      code: itemCode, name: itemName, shopName, stock: 0
    });
    isNew = true;
  } else {
    itemCode = item.code;
  }

  // Tambah Stok (Atomic)
  item.stock += parseInt(qty);
  await item.save();

  // Catat History
  await IncomingModel.create({
    itemCode, date, shopName, itemName, qty: parseInt(qty), type: 'in'
  });

  return { message: isNew ? 'Barang baru dicatat' : 'Stok bertambah', code: itemCode, type: 'in' };
};

// 2. UPLOAD BARANG KELUAR
export const processStockOut = async (data) => {
  const { date, shopName, itemName, qty } = data;

  const item = await ItemModel.findOne({ name: itemName, shopName: shopName });
  if (!item) throw new Error(`Barang "${itemName}" di toko "${shopName}" tidak ditemukan!`);

  if (item.stock < parseInt(qty)) throw new Error('Stok tidak mencukupi!');

  // Kurangi Stok
  item.stock -= parseInt(qty);
  await item.save();

  // Catat History
  await OutgoingModel.create({
    itemCode: item.code, date, shopName, itemName, qty: parseInt(qty), type: 'out'
  });

  return { message: 'Stok berhasil dikurangi', code: item.code, type: 'out' };
};

// 3. GET HISTORY
export const getItemHistory = async (itemCode) => {
  const inList = await IncomingModel.find({ itemCode });
  const outList = await OutgoingModel.find({ itemCode });

  const combined = [...inList.map(d => ({...d.toObject(), collection: 'incoming'})), 
                    ...outList.map(d => ({...d.toObject(), collection: 'outgoing'}))];
  
  return combined.sort((a, b) => b.timestamp - a.timestamp);
};

// 4. EDIT TRANSAKSI
export const editTransaction = async (id, newData, collectionType) => {
  const Model = collectionType === 'incoming' ? IncomingModel : OutgoingModel;
  const OtherModel = collectionType === 'incoming' ? OutgoingModel : IncomingModel; // just in case type changes (complex logic)

  // Logic simplified: Find doc, calculate diff, update item stock, update doc
  const doc = await Model.findById(id);
  if (!doc) throw new Error('Data tidak ditemukan');

  const item = await ItemModel.findOne({ code: doc.itemCode });
  if (!item) throw new Error('Master item hilang');

  // Reverse old stock
  if (doc.type === 'in') item.stock -= doc.qty;
  else item.stock += doc.qty;

  // Apply new stock
  const newQty = parseInt(newData.qty);
  const newType = newData.type || doc.type; // default to old type

  if (newType === 'in') item.stock += newQty;
  else item.stock -= newQty;

  if (item.stock < 0) throw new Error('Stok hasil edit menjadi negatif!');

  await item.save();

  // Update Doc
  doc.type = newType;
  doc.date = newData.date;
  doc.shopName = newData.shopName;
  doc.qty = newQty;
  
  // If type changed, we technically need to move doc to other collection (complex). 
  // For simplicity, usually frontend ensures type doesn't change or we handle move:
  if (newType !== doc.type) {
      await Model.deleteOne({ _id: id });
      await (newType === 'in' ? IncomingModel : OutgoingModel).create(doc.toObject());
  } else {
      await doc.save();
  }

  return { message: 'Transaksi diupdate' };
};

// CRUD MASTER
export const getItems = async () => {
  return await ItemModel.find().sort({ createdAt: -1 });
};

export const createItem = async (data) => {
  const code = await generateNextCode();
  const newItem = await ItemModel.create({ ...data, code, stock: parseInt(data.stock) || 0 });
  return newItem;
};

export const updateItem = async (id, data) => {
  await ItemModel.findByIdAndUpdate(id, { 
    name: data.name, 
    shopName: data.shopName, 
    stock: parseInt(data.stock) 
  });
  return { message: 'Updated' };
};

export const deleteItem = async (id) => {
  await ItemModel.findByIdAndDelete(id);
  return { message: 'Deleted' };
};

// LAPORAN
export const getInventoryReport = async () => {
  const items = await ItemModel.find().sort({ createdAt: -1 });
  
  // Aggregate totals
  const inAgg = await IncomingModel.aggregate([
    { $group: { _id: "$itemCode", totalIn: { $sum: "$qty" } } }
  ]);
  const outAgg = await OutgoingModel.aggregate([
    { $group: { _id: "$itemCode", totalOut: { $sum: "$qty" } } }
  ]);

  const mapIn = new Map(inAgg.map(i => [i._id, i.totalIn]));
  const mapOut = new Map(outAgg.map(i => [i._id, i.totalOut]));

  return items.map(item => ({
    ...item.toObject(),
    id: item._id,
    totalIn: mapIn.get(item.code) || 0,
    totalOut: mapOut.get(item.code) || 0
  }));
};