const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, name, role }
    next();
  } catch {
    res.status(401).json({ message: 'Your session expired. Please log in again' });
  }
};

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role)
    ? next()
    : res.status(403).json({ message: 'Your role cannot access this' });

module.exports = { auth, requireRole };
