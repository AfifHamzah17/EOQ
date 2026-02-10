// Service ini HANYA menghitung matematika (Logic Pure)
// Tidak perlu Database, menerima input D, S, H dan output Q

export const calculateEOQ = (d, s, h) => {
  // Validasi Input
  if (!d || !s || !h || d <= 0 || s <= 0 || h <= 0) {
    throw new Error('Parameter D, S, H harus lebih besar dari 0');
  }

  // --- RUMUS EOQ (Sama persis dengan Python) ---
  // EOQ = sqrt(2DS/H)
  const Q = Math.sqrt((2 * d * s) / h);

  // --- Hitung Komponen Biaya ---
  // Total Ordering Cost = (D / Q) * S
  const orderingCost = (d / Q) * s;

  // Total Holding Cost = (Q / 2) * H
  const holdingCost = (Q / 2) * h;

  // Total Cost
  const totalCost = orderingCost + holdingCost;

  // Frekuensi = D / Q
  const frequency = Math.round(d / Q);

  return {
    q: Math.round(Q),
    orderingCost,
    holdingCost,
    totalCost,
    frequency
  };
};