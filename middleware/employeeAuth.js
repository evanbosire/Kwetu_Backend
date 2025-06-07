const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateEmployee = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ 
      success: false,
      message: 'No token provided' 
    });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is an employee
    if (!decoded.employeeId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Employee authorization required' 
      });
    }

    req.employeeId = decoded.employeeId;
    req.employeeRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

module.exports = authenticateEmployee;