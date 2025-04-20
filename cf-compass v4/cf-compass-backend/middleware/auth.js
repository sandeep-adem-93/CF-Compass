const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    console.log('=== Auth Middleware ===');
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'none');
    
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token exists:', !!token);
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded successfully:', {
      userId: decoded.userId,
      role: decoded.role
    });
    
    // Add user from payload to request
    req.user = decoded;
    console.log('User added to request:', {
      userId: req.user.userId,
      role: req.user.role
    });
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    console.error('Error stack:', error.stack);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Role-based access control middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    console.log('=== Role Check Middleware ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);
    
    if (!req.user || !req.user.role) {
      console.log('No user or role found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log('User role not authorized');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('Role check passed');
    next();
  };
};

module.exports = { auth, checkRole }; 