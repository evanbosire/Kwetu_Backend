const express = require("express");
const Feedback = require("../models/Feedback");
const Booking = require("../models/Booking");

const router = express.Router();

/**
 * @route   POST /
 * @desc    Customer submits new feedback after service is rendered
 * @access  Customer
 */
router.post("/", async (req, res) => {
  try {
    const { bookingId, customerId, message } = req.body;

    // Verify that booking exists, belongs to the customer, and service is rendered
    const booking = await Booking.findOne({
      _id: bookingId,
      customerId: customerId, // Ensure your Booking schema uses this correctly
      serviceRendered: true,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found or not eligible for feedback" });
    }

    // Check if feedback already submitted for this booking
    const existingFeedback = await Feedback.findOne({ booking: bookingId });
    if (existingFeedback) {
      return res
        .status(400)
        .json({ message: "Feedback already exists for this booking" });
    }

    // Create and save feedback
    const feedback = new Feedback({
      booking: bookingId,
      customer: customerId,
      message,
    });

    await feedback.save();

    res.status(201).json(feedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ message: "Failed to create feedback" });
  }
});

/**
 * @route   POST /:id/reply
 * @desc    Service Manager replies to customer feedback
 * @access  Service Manager
 */
router.post("/:id/reply", async (req, res) => {
  try {
    const { message } = req.body;
    const feedbackId = req.params.id;

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        $push: {
          messages: {
            sender: "service_manager",
            message,
          },
        },
      },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error replying to feedback:", error);
    res.status(500).json({ message: "Failed to reply to feedback" });
  }
});

/**
 * @route   POST /:id/response
 * @desc    Customer replies to service manager's message
 * @access  Customer
 */
router.post("/:id/response", async (req, res) => {
  try {
    const { customerId, message } = req.body;
    const feedbackId = req.params.id;

    // Ensure this feedback belongs to the requesting customer
    const feedback = await Feedback.findOne({
      _id: feedbackId,
      customer: customerId,
    });

    if (!feedback) {
      return res
        .status(404)
        .json({ message: "Feedback not found or unauthorized" });
    }

    feedback.messages.push({
      sender: "customer",
      message,
    });

    await feedback.save();

    res.json(feedback);
  } catch (error) {
    console.error("Error adding response:", error);
    res.status(500).json({ message: "Failed to add response" });
  }
});

/**
 * @route   GET /:id
 * @desc    Get full feedback conversation (with booking and customer details)
 * @access  Both (Service Manager & Customer)
 */
router.get("/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("booking", "serviceTitle date")
      .populate("customer", "name email");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

/**
 * @route   GET /service-manager/list
 * @desc    Service Manager fetches all feedbacks
 * @access  Service Manager
 */
router.get("/service-manager/list", async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("booking", "serviceTitle date")
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (error) {
    console.error("Error listing feedbacks:", error);
    res.status(500).json({ message: "Failed to list feedbacks" });
  }
});

/**
 * @route   GET /customer/:customerId
 * @desc    Customer views all their submitted feedbacks
 * @access  Customer
 */
router.get("/customer/:customerId", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ customer: req.params.customerId })
      .populate("booking", "serviceTitle date")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching customer feedbacks:", error);
    res.status(500).json({ message: "Failed to fetch feedbacks" });
  }
});

/**
 * @route   PUT /:id/resolve
 * @desc    Service Manager marks feedback as resolved
 * @access  Service Manager
 */
router.put("/:id/resolve", async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error resolving feedback:", error);
    res.status(500).json({ message: "Failed to resolve feedback" });
  }
});

module.exports = router;
