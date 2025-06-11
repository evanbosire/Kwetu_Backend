const express = require("express");
const router = express.Router();
const InventoryItem = require("../models/InventoryStore");
const EquipmentRequest = require("../models/EquipmentRequest");



// Gym coach Views available inventory items
router.get('/inventory-items', async (req, res) => {
  try {
    const items = await InventoryItem.find({})
      .sort({ name: 1 });

    res.status(200).json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching inventory' });
  }
});

// Gym Coach: Submits a new equipment request
router.post('/equipment-requests', async (req, res) => {
  try {
    const { itemId, requestedQuantity } = req.body;

    // Validate minimum quantity
    if (requestedQuantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must request at least 1 item' 
      });
    }

    const item = await InventoryItem.findById(itemId);
    
    // Check item exists
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Check stock availability
    if (item.quantity < requestedQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${item.quantity} ${item.name}(s) available in stock`,
        availableQuantity: item.quantity
      });
    }

    // Create request
    const request = await EquipmentRequest.create({ 
      itemId, 
      requestedQuantity
    });

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating request' });
  }
});


// Inventory Manager: Views all equipment requests from the coach
router.get('/equipment-requests', async (req, res) => {
  try {
    const requests = await EquipmentRequest.find({})
      .populate('itemId', 'name unit quantity')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
});

// Inventory Manager: Approves and releases equipment
router.patch('/equipment-requests/:requestId/release', async (req, res) => {
  try {
    const { releaseQuantity } = req.body;
    const request = await EquipmentRequest.findById(req.params.requestId)
      .populate('itemId');
    
    // Validate request exists
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Validate minimum release
    if (releaseQuantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must release at least 1 item' 
      });
    }

    // Calculate maximum available
    const maxAvailable = Math.min(
      request.itemId.quantity,
      request.requestedQuantity - request.releasedQuantity
    );

    // Validate sufficient stock
    if (releaseQuantity > maxAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot release ${releaseQuantity} items. Maximum requested to release is: ${maxAvailable}`,
        maxAvailable
      });
    }

    // Update inventory
    request.itemId.quantity -= releaseQuantity;
    await request.itemId.save();

    // Update request status
    request.releasedQuantity += releaseQuantity;
    request.status = request.releasedQuantity === request.requestedQuantity 
      ? 'approved' 
      : 'partially-approved';
    request.updatedAt = new Date();
    await request.save();

    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error releasing items' });
  }
});


// Gym coach gets released equipments to him
router.get('/equipment/released', async (req, res) => {
  try {
    // Find all equipment requests with 'approved', 'partially-approved', or 'partially-returned' status
    const releasedEquipment = await EquipmentRequest.find({
      status: { $in: ['approved', 'partially-approved', 'partially-returned'] }
    })
      .populate('itemId', 'name unit') // Populate item details
      .populate('coachId', 'firstName lastName email role') // Populate employee details (who requested)
      .select('itemId coachId requestedQuantity releasedQuantity returnedQuantity status updatedAt')
      .sort({ updatedAt: -1 });

    // Format response
    const result = releasedEquipment.map(req => ({
      requestId: req._id,
      item: {
        id: req.itemId._id,
        name: req.itemId.name,
        unit: req.itemId.unit,
      },
      coach: req.coachId ? {
        id: req.coachId._id,
        name: `${req.coachId.firstName} ${req.coachId.lastName}`,
        email: req.coachId.email,
        role: req.coachId.role,
      } : null,
      totalRequested: req.requestedQuantity,
      totalReleased: req.releasedQuantity,
      totalReturned: req.returnedQuantity,
      currentlyHeld: req.releasedQuantity - req.returnedQuantity,
      status: req.status,
      lastUpdated: req.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      equipment: result,
    });

  } catch (error) {
    console.error('Error fetching released equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching released equipment',
    });
  }
});
// Gym Coach: Returns equipment to inventory
router.patch('/equipment-requests/:requestId/return', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { returnQuantity } = req.body;

    if (!returnQuantity || isNaN(returnQuantity) || returnQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'You must return at least 1 item',
      });
    }

    const request = await EquipmentRequest.findById(requestId).populate('itemId');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Equipment request not found',
      });
    }

    if (!['approved', 'partially-approved', 'partially-returned'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Request is not eligible for return',
      });
    }

    const maxReturnable = request.releasedQuantity - request.returnedQuantity;

    if (returnQuantity > maxReturnable) {
      return res.status(400).json({
        success: false,
        message: `Cannot return ${returnQuantity} items. Maximum returnable: ${maxReturnable}`,
        maxReturnable,
      });
    }

    request.itemId.quantity += returnQuantity;
    await request.itemId.save();

    request.returnedQuantity += returnQuantity;
    request.status =
      request.returnedQuantity === request.releasedQuantity
        ? 'returned'
        : 'partially-returned';
    request.updatedAt = new Date();

    await request.save({ validateBeforeSave: false }); // ✅ skip required fields validation

    res.status(200).json({
      success: true,
      message: 'Items returned successfully',
      request,
    });

  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning items',
      error: error.message,
    });
  }
});





module.exports = router;
