import { ItemModel, IncomingModel, OutgoingModel } from '../models/ItemModel.js';
// Perhatikan: Kita pakai Named Import { ... } karena di model pakai export const

export const getDashboardData = async () => {
  // 1. Statistik Barang
  const totalItems = await ItemModel.countDocuments();
  
  const itemStats = await ItemModel.aggregate([
    {
      $group: {
        _id: null,
        totalStock: { $sum: "$stock" },
        lowStockCount: {
          $sum: { $cond: [{ $lt: ["$stock", 100] }, 1, 0] }
        }
      }
    }
  ]);

  const stats = itemStats.length > 0 ? itemStats[0] : { totalStock: 0, lowStockCount: 0 };
  const stockValue = stats.totalStock * 10000; // Asumsi Rp 10.000/unit

  // 2. Transaksi Bulan Ini
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const incomingCount = await IncomingModel.countDocuments({ createdAt: { $gte: startOfMonth } });
  const outgoingCount = await OutgoingModel.countDocuments({ createdAt: { $gte: startOfMonth } });
  const monthlyTransactions = incomingCount + outgoingCount;

  // 3. Aktivitas Terakhir
  const recentIn = await IncomingModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const recentOut = await OutgoingModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Mapping
  const mappedIn = recentIn.map(item => ({
    id: item._id,
    itemName: item.itemName,
    qty: item.qty,
    date: item.date,
    type: 'Masuk',
    createdAt: item.createdAt
  }));

  const mappedOut = recentOut.map(item => ({
    id: item._id,
    itemName: item.itemName,
    qty: item.qty,
    date: item.date,
    type: 'Keluar',
    createdAt: item.createdAt
  }));

  // Gabungkan & Sort
  const allActivity = [...mappedIn, ...mappedOut].sort((a, b) => b.createdAt - a.createdAt);
  const recentActivity = allActivity.slice(0, 5);

  return {
    totalItems,
    stockValue,
    lowStock: stats.lowStockCount,
    monthlyTransactions,
    recentActivity
  };
};