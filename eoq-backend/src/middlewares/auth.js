import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  // 1. IZINKAN REQUEST OPTIONS (CORS PREFLIGHT)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Akses ditolak. Token hilang.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: true, message: 'Token tidak valid atau kadaluarsa.' });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: true, message: 'Akses ditolak. Anda bukan Admin.' });
    }
    next();
  };
};