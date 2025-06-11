// models/EquipmentRequest.js
const mongoose = require("mongoose");

const equipmentRequestSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryItem",
    required: true,
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // This links to your Employee schema
    required: true,
  },
  requestedQuantity: { type: Number, required: true, min: 1 }, // Minimum 1 item
  releasedQuantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      "pending",
      "partially-approved",
      "approved",
      "partially-returned",
      "returned",
    ],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EquipmentRequest", equipmentRequestSchema);
