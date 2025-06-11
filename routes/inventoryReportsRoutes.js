const express = require('express');
const router = express.Router();
const Request = require('../models/Request'); 


router.get('/inventory/reports', async (req, res) => {
  try {
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build base query
    const query = {};
    
    // Apply filters
    if (req.query.supplier) {
      query.supplierName = new RegExp(req.query.supplier, 'i');
    }
    
    if (req.query.status) {
      query['items.status'] = req.query.status;
    }
    
    if (req.query.paymentStatus) {
      query['items.paymentStatus'] = req.query.paymentStatus;
    }
    
    if (req.query.inventoryStatus) {
      query['items.inventoryStatus'] = req.query.inventoryStatus;
    }
    
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate + 'T23:59:59.999Z');
      }
    }

    // Get requests with pagination
    const [requests, total] = await Promise.all([
      Request.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Request.countDocuments(query)
    ]);

    // Process items data
    const reports = requests.flatMap(request => 
      request.items.map(item => ({
        requestId: request._id,
        supplier: request.supplierName,
        date: request.createdAt,
        item: {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          status: item.status,
          feedback: item.feedback || 'No feedback'
        },
        financial: {
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
          paymentCode: item.paymentCode,
          paymentStatus: item.paymentStatus
        },
        inventory: {
          status: item.inventoryStatus
        }
      }))
    );

    // Calculate analytics
    const analytics = {
      totalItems: reports.length,
      totalValue: reports.reduce((sum, report) => sum + (report.financial.totalPrice || 0), 0),
      statusDistribution: reports.reduce((acc, report) => {
        acc[report.item.status] = (acc[report.item.status] || 0) + 1;
        return acc;
      }, {}),
      paymentStatus: reports.reduce((acc, report) => {
        acc[report.financial.paymentStatus] = (acc[report.financial.paymentStatus] || 0) + 1;
        return acc;
      }, {}),
      topSuppliers: [...new Set(reports.map(r => r.supplier))]
    };

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      analytics,
      data: reports
    });

  } catch (error) {
    console.error('Inventory reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;