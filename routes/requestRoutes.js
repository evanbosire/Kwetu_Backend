const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Request = require("../models/Request"); // Make sure you import your Request model
const InventoryItem = require("../models/InventoryStore");

//  Inventory Manager Requests Equipments

router.post("/request-equipment", async (req, res) => {
  try {
    const { supplierName, items } = req.body;

    if (!supplierName || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const request = new Request({
      supplierName,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        feedback: item.feedback || "",
      })),
    });

    const saved = await request.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier Fetch all items with status 'requested'
router.get("/requests/requested-items", async (req, res) => {
  try {
    // Find all requests (no filter)
    const requests = await Request.find();

    // Collect all items with status 'requested'
    const requestedItems = [];

    requests.forEach((request) => {
      request.items.forEach((item) => {
        if (item.status === "requested") {
          requestedItems.push({
            requestId: request._id,
            itemId: item._id,
            supplierName: request.supplierName, // Include supplierName from request
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            feedback: item.feedback,
            status: item.status,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            createdAt: request.createdAt,
          });
        }
      });
    });

    res.json(requestedItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier Approves supply - sets status to 'supplied' and calculates totalPrice
router.patch("/requests/:requestId/items/:itemId/supply", async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { pricePerUnit } = req.body;

    if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
      return res
        .status(400)
        .json({ message: "Valid pricePerUnit is required" });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const item = request.items.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Item not found in request" });

    // Update item values
    item.pricePerUnit = pricePerUnit;
    item.totalPrice = pricePerUnit * item.quantity;
    item.status = "supplied";
    item.inventoryStatus = "pending"; // waiting for inventory manager
    item.paymentStatus = "unpaid"; // payment is pending

    await request.save();

    res.status(200).json({ message: "Item marked as supplied", item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Supplier Rejects supply - sets status to 'supply_rejected'
router.patch(
  "/requests/:requestId/items/:itemId/reject-supply",
  async (req, res) => {
    try {
      const { requestId, itemId } = req.params;

      const request = await Request.findById(requestId);
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      const item = request.items.id(itemId);
      if (!item)
        return res.status(404).json({ message: "Item not found in request" });

      item.status = "supply_rejected";
      item.pricePerUnit = 0;
      item.totalPrice = 0;

      await request.save();

      res.json({ message: "Item supply rejected", item });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Inventory Gets all items with status 'supplied'
router.get("/requests/items/supplied", async (req, res) => {
  try {
    // Find all requests
    const requests = await Request.find();

    // Collect all items with status 'supplied'
    const suppliedItems = [];
    requests.forEach((request) => {
      request.items.forEach((item) => {
        if (item.status === "supplied") {
          suppliedItems.push({
            requestId: request._id,
            itemId: item._id,
            supplierName: request.supplierName,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            feedback: item.feedback,
            status: item.status,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            createdAt: request.createdAt,
          });
        }
      });
    });

    res.json(suppliedItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inventory Gets all items with status 'supply_rejected'
router.get("/requests/items/supply-rejected", async (req, res) => {
  try {
    // Find all requests
    const requests = await Request.find();

    // Collect all items with status 'supply_rejected'
    const rejectedItems = [];
    requests.forEach((request) => {
      request.items.forEach((item) => {
        if (item.status === "supply_rejected") {
          rejectedItems.push({
            requestId: request._id,
            itemId: item._id,
            supplierName: request.supplierName,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            feedback: item.feedback,
            status: item.status,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            createdAt: request.createdAt,
          });
        }
      });
    });

    res.json(rejectedItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inventory Manager Accepts or rejects supplied item and update inventory accordingly
router.post("/process-supply/:requestId/:itemId", async (req, res) => {
  const { requestId, itemId } = req.params;
  const { action } = req.body; // action = 'accept' or 'reject'

  try {
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const item = request.items.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Item not found in request" });

    if (item.status !== "supplied") {
      return res
        .status(400)
        .json({ message: "Item has not been marked as supplied yet" });
    }

    if (action === "accept") {
      // Update inventory
      let inventoryItem = await InventoryItem.findOne({ name: item.name });

      if (inventoryItem) {
        inventoryItem.quantity += item.quantity;
      } else {
        inventoryItem = new InventoryItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        });
      }

      await inventoryItem.save();
      item.inventoryStatus = "accepted";
      item.status = "stored";
    } else if (action === "reject") {
      item.inventoryStatus = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await request.save();
    res.status(200).json({ message: `Item ${action}ed successfully`, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
// Inventory Manager GETs all inventory items that are in the store.
router.get("/store-items", async (req, res) => {
  try {
    const items = await InventoryItem.find({});
    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Finance Manager GET all accepted & unpaid items (ready for payment)
router.get("/accepted-items", async (req, res) => {
  try {
    // Fetch all requests that contain items with inventoryStatus 'accepted'
    const requests = await Request.find({
      "items.inventoryStatus": "accepted",
    });

    const acceptedItems = [];

    requests.forEach((request) => {
      request.items.forEach((item) => {
        if (
          item.inventoryStatus === "accepted" &&
          item.paymentStatus === "unpaid"
        ) {
          acceptedItems.push({
            requestId: request._id,
            supplierName: request.supplierName,
            itemId: item._id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            status: item.status,
            inventoryStatus: item.inventoryStatus,
            paymentStatus: item.paymentStatus,
            paymentCode: item.paymentCode,
            paidAmount: item.paidAmount,
            createdAt: request.createdAt,
          });
        }
      });
    });

    res.status(200).json({ success: true, acceptedItems });
  } catch (error) {
    console.error("Error fetching accepted items:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/pay/:requestId/:itemId", async (req, res) => {
  const { requestId, itemId } = req.params;
  const { paymentCode } = req.body;

  try {
    // Validate paymentCode format
    const isValidCode =
      /^[A-Z0-9]{10}$/.test(paymentCode) &&
      (paymentCode.match(/[0-9]/g) || []).length === 2 &&
      (paymentCode.match(/[A-Z]/g) || []).length === 8;

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment code format (2 digits + 8 uppercase letters)",
      });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }

    const item = request.items.id(itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found in request" 
      });
    }

    if (item.inventoryStatus !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Item must be accepted before payment",
      });
    }

    if (item.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Item has already been paid",
      });
    }

    // Update payment status
    item.paymentStatus = "paid";
    item.paymentCode = paymentCode;
    item.paymentDate = new Date(); // Add payment timestamp

    await request.save();

    // Return more detailed success response
    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        requestId: request._id,
        itemId: item._id,
        paymentStatus: item.paymentStatus,
        paymentCode: item.paymentCode,
        paymentDate: item.paymentDate,
        amount: item.totalPrice
      }
    });

  } catch (err) {
    console.error("Payment processing error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: err.message 
    });
  }
});
//  Supplier downloads the receipt
router.get("/:requestId/:itemId/generate-receipt", async (req, res) => {
  const { requestId, itemId } = req.params;

  try {
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const item = request.items.id(itemId);
    if (
      !item ||
      item.paymentStatus !== "paid" ||
      !item.paymentCode ||
      !item.paidAmount
    ) {
      return res.status(400).json({
        message:
          "Receipt cannot be generated. Payment is either incomplete or missing details.",
      });
    }

    // Directory for receipts
    const receiptsDir = path.join(__dirname, "../public/receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const receiptPath = path.join(receiptsDir, `${requestId}_${itemId}.pdf`);
    const writeStream = fs.createWriteStream(receiptPath);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(writeStream);

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f2f2f2");
    doc.fillColor("black");

    // Header
    doc.fontSize(22).text("Corrugated Sheets Limited", { align: "center" });
    doc.moveDown();
    doc.fontSize(18).text("Supplier Payment Receipt", { align: "center" });
    doc.moveDown();

    // Request Info
    doc
      .fontSize(12)
      .text(`Receipt ID: RCPT-${item._id.toString().slice(-6).toUpperCase()}`);
    doc.text(`Supplier Name: ${request.supplierName || "N/A"}`);
    doc.text(`Request ID: ${request._id}`);
    doc.text(`Item ID: ${item._id}`);
    doc.moveDown();

    // Item Details
    doc.text(`Item Name: ${item.name}`);
    doc.text(`Quantity: ${item.quantity}`);
    doc.text(`Unit: ${item.unit}`);
    doc.text(`Unit Price: ${item.pricePerUnit}`);
    doc.text(`Total Price: ${item.totalPrice}`);
    doc.text(`Paid Amount: ${item.paidAmount}`);
    doc.text(`Payment Code: ${item.paymentCode}`);
    doc.text(
      `Payment Date: ${
        item.paymentDate ? new Date(item.paymentDate).toDateString() : "N/A"
      }`
    );
    doc.text(`Generated On: ${new Date().toDateString()}`);
    doc.moveDown();

    // Footer
    doc
      .fontSize(10)
      .text(
        "Thank you for supplying quality materials to Corrugated Sheets Limited."
      );
    doc.text(
      "We value your partnership and look forward to more business together."
    );
    doc.moveDown();

    doc.end();

    writeStream.on("finish", async () => {
      const receiptUrl = `/receipts/${requestId}_${itemId}.pdf`;

      item.receiptUrl = receiptUrl;
      await request.save();

      res.status(200).json({
        message: "Receipt generated successfully",
        receiptUrl,
      });
    });

    writeStream.on("error", (err) => {
      console.error("Write stream error:", err);
      res.status(500).json({ message: "Error saving receipt file" });
    });
  } catch (err) {
    console.error("Error generating receipt:", err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
