const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); 

// Alternative version with pagination
router.get('/bookings/summary-paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find({})
        .select('customerName customerEmail customerPhone service serviceTitle hours totalPrice createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments()
    ]);

    const formattedBookings = bookings.map(booking => ({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceId: booking.service,
      serviceTitle: booking.serviceTitle,
      hours: booking.hours,
      totalPrice: booking.totalPrice,
      bookingDate: booking.createdAt
    }));

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      count: formattedBookings.length,
      totalBookings: total,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching paginated bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking data'
    });
  }
});

module.exports = router;