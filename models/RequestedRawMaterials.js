const mongoose = require("mongoose");
const Employee = require("./Employee");

const requestedRawMaterialsSchema = new mongoose.Schema({
  material: {
    type: String,
    required: true,
  },
  requestedQuantity: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "Requested",
      "Approved",
      "Rejected",
      "Pending",
      "Supplied",
      "Accepted",
      "Supply Rejected",
      "Allocated",
      "Partially Allocated",
    ],
    default: "Requested",
  },
  supplier: {
    type: String,
    required: true,
  },
  deliveryDate: {
    type: Date,
    required: true,
  },
  dateRequested: {
    type: Date,
    default: Date.now,
  },
  supplyStatus: {
    type: String,
    enum: ["Not Supplied", "Pending Acceptance", "Accepted", "Rejected"],
    default: "Not Supplied",
  },
  suppliedDate: {
    type: Date,
  },
  acceptanceDate: {
    type: Date,
  },
  remarks: {
    type: String,
  },
  cost: {
    // ✅ Add this field
    type: Number,
    required: false, // Optional, set `true` if cost is always required
  },
  paymentCode: {
    type: String,
    required: false, // Temporarily make this false
  },
  paymentStatus: { type: String, default: "Unpaid" },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer", // Reference to Customer model
    required: false, // Make this required to link each raw material request to a customer
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // This should reference the Employee model
    required: true, // This links the request to an employee (e.g., a Production Manager)
  },
  allocatedBy: {
    // Add this new field
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false,
  },
  allocatedQuantity: {
    type: Number,
    default: 0,
  },
});

const RequestedRawMaterials = mongoose.model(
  "RequestedRawMaterials",
  requestedRawMaterialsSchema
);

module.exports = RequestedRawMaterials;
