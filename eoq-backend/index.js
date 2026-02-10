// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';

// // Import Routes
// import authRoutes from './src/routes/auth.js';
// import itemRoutes from './src/routes/items.js';
// import uploadRoutes from './src/routes/upload.js';
// import adminRoutes from './src/routes/admin.js';
// import shippingRoutes from './src/routes/shipping.js'; 

// // Load Environment Variables
// dotenv.config();

// const app = express();

// // 1. Security Headers (Helmet)
// app.use(helmet());

// // 2. CORS Policy
// app.use(cors({
//   origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // <--- TAMBAHKAN PATCH
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));

// // 3. Global Rate Limiting (15 Request per 10 Menit)
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, 
//   max: 1000,
//   message: { error: true, message: 'Terlalu banyak request dikirim ke server. Tunggu sebentar...' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use(limiter);

// // 4. Body Parser (Sesuaikan limit untuk upload file)
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // 5. Routes Registration
// app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes);

// // 6. Routes berikut ini BUTUH TOKEN
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 300,
// });

// app.use('/api/items', authLimiter, itemRoutes);
// app.use('/api/upload', uploadRoutes);
// app.use('/api/shipping', shippingRoutes);

// // 7. Health Check
// app.get('/', (req, res) => {
//   res.json({ message: 'EOQ Backend Running', status: 'OK', security: 'Active' });
// });

// // 8. Error Handling Middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
  
//   if (err.code === 'LIMIT_FILE_SIZE') {
//     return res.status(400).json({ error: true, message: 'Ukuran file terlalu besar (Max 1MB)' });
//   }
  
//   if (err.status === 401) {
//     return res.status(401).json({ error: true, message: 'Akses ditolak. Token tidak valid atau hilang.' });
//   }

//   if (err.status === 403) {
//     return res.status(403).json({ error: true, message: 'Akses ditolak. Anda bukan Admin.' });
//   }

//   res.status(err.status || 500).json({ error: true, message: err.message || 'Terjadi kesalahan server' });
// });

// // 9. Start Server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
//   console.log(`🛡️  Security Active (Helmet + Rate Limit)`);
//   console.log(`📦 Project: ${process.env.GCLOUD_PROJECT_ID}`);
// });

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import Routes
import authRoutes from './src/routes/auth.js';
import itemRoutes from './src/routes/items.js';
import uploadRoutes from './src/routes/upload.js';
import adminRoutes from './src/routes/admin.js';
import shippingRoutes from './src/routes/shipping.js'; 

// Load Environment Variables
dotenv.config();

const app = express();

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS Policy (Dinamis untuk Local & Production)
// Jika ada env var ALLOWED_ORIGINS, gunakan itu. Jika tidak, izinkan localhost.
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://eoq-frontend.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Global Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 1000,
  message: { error: true, message: 'Terlalu banyak request dikirim ke server. Tunggu sebentar...' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 4. Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// 6. Routes berikut ini BUTUH TOKEN
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

app.use('/api/items', authLimiter, itemRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shipping', shippingRoutes);

// 7. Health Check
app.get('/', (req, res) => {
  res.json({ message: 'EOQ Backend Running', status: 'OK', security: 'Active' });
});

// 8. Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: true, message: 'Ukuran file terlalu besar (Max 1MB)' });
  }
  
  if (err.status === 401) {
    return res.status(401).json({ error: true, message: 'Akses ditolak. Token tidak valid atau hilang.' });
  }

  if (err.status === 403) {
    return res.status(403).json({ error: true, message: 'Akses ditolak. Anda bukan Admin.' });
  }

  res.status(err.status || 500).json({ error: true, message: err.message || 'Terjadi kesalahan server' });
});

// 9. Start Server (JANGAN DIUBAH PORT-NYA)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`🛡️  Security Active (Helmet + Rate Limit)`);
  console.log(`📦 Project: ${process.env.GCLOUD_PROJECT_ID}`);
});