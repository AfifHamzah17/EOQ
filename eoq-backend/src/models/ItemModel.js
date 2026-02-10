// src/models/ItemModel.js

// Skema Master Barang (Total Stok per Toko)
export const ItemSchema = {
  CODE: 'code',          // Kode Barang (BRG-001)
  NAME: 'name',          // Nama Barang
  SHOP_NAME: 'shopName', // Nama Toko / Supplier (UNIK BERSAMA NAME)
  STOCK: 'stock',        // Total Stok Saat Ini
  CREATED_AT: 'createdAt'
};

// Skema Riwayat Barang Masuk (Log Transaksi)
export const IncomingSchema = {
  ID: 'id',
  ITEM_CODE: 'itemCode',   // Kode Barang (Relasi ke Master)
  DATE: 'date',            // Tanggal Masuk
  SHOP_NAME: 'shopName',   // Nama Toko/Supplier
  ITEM_NAME: 'itemName',   // Nama Barang (Disimpan ulang)
  QTY: 'qty',              // Jumlah Barang Masuk
  TIMESTAMP: 'timestamp'
};

// Helper Create Barang
export const createItemEntity = (data) => {
  return {
    [ItemSchema.CODE]: data.code,
    [ItemSchema.NAME]: data.name,
    [ItemSchema.SHOP_NAME]: data.shopName, // Sertakan Toko
    [ItemSchema.STOCK]: parseInt(data.stock) || 0,
    [ItemSchema.CREATED_AT]: new Date()
  };
};