const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  unit: String,
  feedback: { type: String },
  status: {
    type: String,
    enum: [
      "requested",
      "approved",
      "rejected",
      "supplied",
      "supply_rejected",
      "stored",
    ],
    default: "requested",
  },
  inventoryStatus: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  paymentCode: String,
  paidAmount: Number,
  pricePerUnit: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "unpaid",
  },
});

const requestSchema = new mongoose.Schema({
  supplierName: {
    type: String,
    required: true,
  },
  items: [itemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Request", requestSchema);