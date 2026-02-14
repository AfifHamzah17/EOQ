import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Utils & DB
import { connectDB } from './src/utils/index.js';

// Import Routes
import authRoutes from './src/routes/auth.js';
import itemRoutes from './src/routes/items.js';
import uploadRoutes from './src/routes/upload.js';
import adminRoutes from './src/routes/admin.js';
import shippingRoutes from './src/routes/shipping.js'; 
import salesRoutes from './src/routes/sales.js';
import eoqRoutes from './src/routes/eoq.js'; 
import dashboardRoutes from './src/routes/dashboard.js';

dotenv.config();

const app = express();

// Koneksi ke MongoDB
connectDB();

// 1. Security
app.use(helmet());

// Static Folder untuk gambar (menggantikan GCS Public Access)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 2. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://eoq-frontend.vercel.app', 'http://169.254.66.16:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Rate Limiter
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 1000,
  message: { error: true, message: 'Terlalu banyak request.' },
});
app.use(limiter);

// 4. Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/items', authLimiter, itemRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/eoq', eoqRoutes); 
app.use('/api/dashboard', dashboardRoutes);

// 6. Health Check
app.get('/', (req, res) => {
  res.json({ message: 'EOQ Backend Running (MongoDB)', status: 'OK' });
});

// 7. Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Server Error' });
});

// 8. Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});