// models/InventoryItem.js
const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema({
  name: String,
  quantity: { type: Number, default: 0, min: 0 },
  unit: String,
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
