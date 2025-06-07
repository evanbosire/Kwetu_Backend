const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // ✅ This must match the name used in your Customer model
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messages: [  // ✅ New array for threaded replies
    {
      sender: {
        type: String,
        enum: ['customer', 'service_manager'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
