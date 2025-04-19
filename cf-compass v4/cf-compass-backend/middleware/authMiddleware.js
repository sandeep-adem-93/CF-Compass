const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Middleware to verify JWT token
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  },

  // Middleware to check if user is a genetic counselor
  isGeneticCounselor: (req, res, next) => {
    if (req.user.role !== 'genetic_counselor') {
      return res.status(403).json({ message: 'Access denied. Genetic counselor role required.' });
    }
    next();
  },

  // Middleware to check if user is a medical receptionist
  isMedicalReceptionist: (req, res, next) => {
    if (req.user.role !== 'medical_receptionist') {
      return res.status(403).json({ message: 'Access denied. Medical receptionist role required.' });
    }
    next();
  }
};

module.exports = authMiddleware; 