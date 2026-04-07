// src/services/eoq.service.js
import { ItemModel } from '../models/ItemModel.js';
import { ShippingModel } from '../models/ShippingModel.js';

// FUNGSI: Mengambil daftar nama cabang yang ada di database
export const getDistinctCabang = async () => {
  try {
    const cabangs = await ItemModel.distinct('namaCabang');
    return cabangs.filter(c => c && c.trim() !== '').sort();
  } catch (error) {
    console.error("Error Fetch Cabangs:", error);
    throw error;
  }
};

// UBAH: Filter berdasarkan namaCabang
export const getEOQParameters = async (namaCabang) => {
  try {
    console.log(`>>> Mengambil data EOQ untuk cabang: ${namaCabang}`);

    // 1. Hitung D (Total Stok) BERDASARKAN CABANG
    const itemMatch = namaCabang ? { namaCabang: namaCabang } : {};
    const itemStats = await ItemModel.aggregate([
      { $match: itemMatch },
      { $group: { _id: null, totalStock: { $sum: "$stock" } } }
    ]);

    // 2. Hitung S (Rata-rata Harga Pengiriman) JUGA BERDASARKAN CABANG
    const shipMatch = namaCabang ? { namaCabang: namaCabang } : {};
    const shippingStats = await ShippingModel.aggregate([
      { $match: { ...shipMatch, price: { $ne: null, $exists: true, $type: "number" } } },
      { $group: { _id: null, avgShippingCost: { $avg: "$price" } } }
    ]);

    const D = itemStats.length > 0 ? itemStats[0].totalStock : 0;
    const S = shippingStats.length > 0 ? shippingStats[0].avgShippingCost : 0;

    return {
      totalStock: D,
      avgShippingCost: S
    };

  } catch (error) {
    console.error("Error Service:", error);
    throw error; 
  }
};