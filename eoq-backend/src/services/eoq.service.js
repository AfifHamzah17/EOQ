// src/services/eoq.service.js
import { ItemModel } from '../models/ItemModel.js';
import { ShippingModel } from '../models/ShippingModel.js';

export const getEOQParameters = async () => {
  try {
    console.log(">>> Mengambil data EOQ...");

    // 1. Hitung D (Total Stok)
    // PASTIKAN NAMA FIELD '$stock' SESUAI DATABASE ANDA
    const itemStats = await ItemModel.aggregate([
      { $group: { _id: null, totalStock: { $sum: "$stock" } } }
    ]);

    // 2. Hitung S (Rata-rata Harga Pengiriman)
    const shippingStats = await ShippingModel.aggregate([
      { $match: { price: { $ne: null, $exists: true, $type: "number" } } },
      { $group: { _id: null, avgShippingCost: { $avg: "$price" } } }
    ]);

    const D = itemStats.length > 0 ? itemStats[0].totalStock : 0;
    const S = shippingStats.length > 0 ? shippingStats[0].avgShippingCost : 0;

    // KEMBALIKAN HASIL (RETURN)
    return {
      totalStock: D,
      avgShippingCost: S
    };

  } catch (error) {
    console.error("Error Service:", error);
    // LEMPAR ERROR KE ROUTES
    throw error; 
  }
};