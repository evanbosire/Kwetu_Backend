const express = require("express");
const Feedback = require("../models/Feedback");
const Customer = require("../models/Customer");
const router = express.Router();

// 1️⃣ CUSTOMER sends initial feedback
router.post("/post-feedback", async (req, res) => {
  try {
    const { customerEmail, bookingId, message } = req.body;

    // 1. Find customer by email to get their name
    const customer = await Customer.findOne({ email: customerEmail }).select('customerName');
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 2. Create the feedback with email instead of customerId
    const newFeedback = new Feedback({
      customerEmail, // Using email directly
      customerName: customer.customerName,
      booking: bookingId,
      messages: [{
        sender: "customer",
        message,
      }],
    });

    const savedFeedback = await newFeedback.save();

    // Populate just the booking info (customer is now just email)
    const populatedFeedback = await Feedback.findById(savedFeedback._id)
      .populate("booking", "serviceTitle");

    res.status(201).json({
      ...populatedFeedback.toObject(),
      customer: { email: customerEmail, name: customer.customerName }
    });
    
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ message: "Failed to create feedback" });
  }
});

// 2️⃣ SERVICE MANAGER replies to a feedback thread
router.post("/:id/reply", async (req, res) => {
  try {
    const { message } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    feedback.messages.push({ sender: "service_manager", message });
    await feedback.save();

    res.json(feedback);
  } catch (error) {
    console.error("Error replying to feedback:", error);
    res.status(500).json({ message: "Failed to reply to feedback" });
  }
});

// 3️⃣ CUSTOMER replies again in the thread
router.post("/:id/customer-response", async (req, res) => {
  try {
    const { customerEmail, message } = req.body;
    
    // Find feedback by ID and verify the email matches
    const feedback = await Feedback.findOne({
      _id: req.params.id,
      customerEmail: customerEmail.toLowerCase() // Case-insensitive match
    });

    if (!feedback) {
      return res.status(403).json({ message: "Not allowed or feedback not found" });
    }

    feedback.messages.push({ sender: "customer", message });
    await feedback.save();

    res.json(feedback);
  } catch (error) {
    console.error("Error adding customer response:", error);
    res.status(500).json({ message: "Failed to respond" });
  }
});

// 📥 Get all feedbacks (for service manager to view)
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("booking", "serviceTitle");

    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching all feedbacks:", error);
    res.status(500).json({ message: "Failed to fetch feedbacks" });
  }
});

// 📥 Get feedbacks for specific customer (using email)
router.get("/customer/:email", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ 
      customerEmail: req.params.email.toLowerCase() 
    }).populate("booking", "serviceTitle");

    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching customer feedbacks:", error);
    res.status(500).json({ message: "Failed to fetch feedbacks" });
  }
});

// 📥 Get single feedback by ID
router.get("/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("booking", "serviceTitle");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

module.exports = router;