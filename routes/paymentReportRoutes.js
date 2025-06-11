const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');


router.get('/payment-reports', async (req, res) => {
  try {
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build base query with optional filters
    const baseQuery = {};
    
    if (req.query.coach) {
      baseQuery.coachName = new RegExp(req.query.coach, 'i');
    }
    
    if (req.query.paymentCode) {
      baseQuery.paymentCode = req.query.paymentCode;
    }

    // Get bookings with pagination
    const [bookings, total] = await Promise.all([
      Booking.find(baseQuery)
        .select('customerName customerEmail customerPhone service serviceTitle hours totalPrice paymentCode coachName createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(baseQuery)
    ]);

    // Get feedback for these bookings in a single query
    const bookingIds = bookings.map(b => b._id);
    const feedbackMap = await Feedback.aggregate([
      { $match: { booking: { $in: bookingIds } } },
      { $unwind: "$messages" },
      { $match: { "messages.sender": "customer" } },
      { 
        $group: {
          _id: "$booking",
          latestFeedback: { $last: "$messages.message" }
        }
      }
    ]).then(results => 
      results.reduce((map, item) => {
        map[item._id.toString()] = item.latestFeedback;
        return map;
      }, {})
    );

    // Combine data
    const reports = bookings.map(booking => ({
      customer: {
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone
      },
      service: {
        id: booking.service,
        title: booking.serviceTitle,
        hours: booking.hours
      },
      payment: {
        code: booking.paymentCode,
        amount: booking.totalPrice,
        date: booking.createdAt
      },
      coach: booking.coachName,
      feedback: feedbackMap[booking._id.toString()] || "No feedback yet"
    }));

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      data: reports
    });

  } catch (error) {
    console.error('Payment reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;