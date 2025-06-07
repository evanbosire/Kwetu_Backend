const express = require("express");
const Feedback = require("../models/Feedback");
const router = express.Router();

// 1️⃣ CUSTOMER sends initial feedback
router.post("/", async (req, res) => {
  try {
    const { customerId, bookingId, message } = req.body;

    const newFeedback = new Feedback({
      customer: customerId,
      booking: bookingId,
      messages: [
        {
          sender: "customer",
          message,
        },
      ],
    });

    // Save the feedback first
    const savedFeedback = await newFeedback.save();

    // Populate only the booking.customerName
    const populatedFeedback = await Feedback.findById(savedFeedback._id)
      .populate("booking", "customerName");

    res.status(201).json(populatedFeedback);
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
    const { customerId, message } = req.body;
    const feedback = await Feedback.findOne({
      _id: req.params.id,
      customer: customerId,
    });

    if (!feedback) {
      return res
        .status(403)
        .json({ message: "Not allowed or feedback not found" });
    }

    feedback.messages.push({ sender: "customer", message });
    await feedback.save();

    res.json(feedback);
  } catch (error) {
    console.error("Error adding customer response:", error);
    res.status(500).json({ message: "Failed to respond" });
  }
});

// 4️⃣ Get entire conversation (either role can fetch)
router.get("/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("customer", "name email")
      .populate("booking", "serviceTitle date");

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
