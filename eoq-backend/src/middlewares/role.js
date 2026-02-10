export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: true, 
        message: 'Akses ditolak. Role Anda tidak memiliki izin.' 
      });
    }

    next();
  };
};