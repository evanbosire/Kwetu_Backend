const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: String, // 'customer' or 'service_manager'
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const feedbackSchema = new mongoose.Schema(
  {
    customerEmail: {  // Changed from customer ObjectId to email string
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    customerName: {
      type: String,
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

// Add index for faster queries by email
feedbackSchema.index({ customerEmail: 1 });
feedbackSchema.index({ booking: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);