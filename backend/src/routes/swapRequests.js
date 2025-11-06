import express from 'express';
import mongoose from 'mongoose';
import SwapRequest from '../models/SwapRequest.js';
import Event from '../models/Event.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get incoming swap requests
router.get('/incoming', async (req, res) => {
  try {
    const requests = await SwapRequest.find({ recipient_id: req.user._id })
      .populate('requester_id', 'name email')
      .populate('requester_event_id')
      .populate('recipient_event_id')
      .sort({ created_at: -1 });

    res.json({ data: requests });
  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ error: 'Failed to fetch incoming requests', message: error.message });
  }
});

// Get outgoing swap requests
router.get('/outgoing', async (req, res) => {
  try {
    const requests = await SwapRequest.find({ requester_id: req.user._id })
      .populate('recipient_id', 'name email')
      .populate('requester_event_id')
      .populate('recipient_event_id')
      .sort({ created_at: -1 });

    res.json({ data: requests });
  } catch (error) {
    console.error('Get outgoing requests error:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing requests', message: error.message });
  }
});

// Create a swap request - Supports both naming conventions
router.post('/', async (req, res) => {
  try {
    // Support both naming conventions from requirements
    const mySlotId = req.body.mySlotId || req.body.requester_event_id;
    const theirSlotId = req.body.theirSlotId || req.body.recipient_event_id;

    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: 'Both event IDs are required (mySlotId and theirSlotId)' });
    }

    // Verify both events exist and are swappable
    const [requesterEvent, recipientEvent] = await Promise.all([
      Event.findById(mySlotId),
      Event.findById(theirSlotId),
    ]);

    if (!requesterEvent || !recipientEvent) {
      return res.status(404).json({ error: 'One or both events not found' });
    }

    // Verify requester owns the requester event
    if (requesterEvent.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not own the requester event' });
    }

    // Verify both events are swappable
    if (requesterEvent.status !== 'SWAPPABLE' || recipientEvent.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'One or both events are no longer swappable' });
    }

    // Create swap request
    const swapRequest = new SwapRequest({
      requester_id: req.user._id,
      requester_event_id: mySlotId,
      recipient_id: recipientEvent.user_id,
      recipient_event_id: theirSlotId,
      status: 'PENDING',
    });

    await swapRequest.save();

    // Update both events to SWAP_PENDING
    await Promise.all([
      Event.findByIdAndUpdate(mySlotId, { status: 'SWAP_PENDING' }),
      Event.findByIdAndUpdate(theirSlotId, { status: 'SWAP_PENDING' }),
    ]);

    const populatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate('requester_id', 'name email')
      .populate('recipient_id', 'name email')
      .populate('requester_event_id')
      .populate('recipient_event_id');

    res.status(201).json({ data: populatedRequest });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ error: 'Failed to create swap request', message: error.message });
  }
});

// Respond to a swap request (accept/reject) - Supports both endpoint naming conventions
router.put('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }

    const swapRequest = await SwapRequest.findById(id)
      .populate('requester_event_id')
      .populate('recipient_event_id');

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Verify user is the recipient
    if (swapRequest.recipient_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to respond to this request' });
    }

    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Swap request is no longer pending' });
    }

    // Ensure both events still exist
    if (!swapRequest.requester_event_id || !swapRequest.recipient_event_id) {
      return res.status(404).json({ error: 'One or both events no longer exist' });
    }

    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';
    swapRequest.status = newStatus;
    await swapRequest.save();

    if (accept) {
      // Swap the events
      const requesterEvent = swapRequest.requester_event_id;
      const recipientEvent = swapRequest.recipient_event_id;

      if (!requesterEvent || !recipientEvent) {
        return res.status(404).json({ error: 'Events not found for swapping' });
      }

      // Swap user_ids
      const tempUserId = requesterEvent.user_id;
      requesterEvent.user_id = recipientEvent.user_id;
      recipientEvent.user_id = tempUserId;

      // Set both to BUSY
      requesterEvent.status = 'BUSY';
      recipientEvent.status = 'BUSY';

      await Promise.all([
        requesterEvent.save(),
        recipientEvent.save(),
      ]);
    } else {
      // Set both events back to SWAPPABLE
      await Promise.all([
        Event.findByIdAndUpdate(swapRequest.requester_event_id, { status: 'SWAPPABLE' }),
        Event.findByIdAndUpdate(swapRequest.recipient_event_id, { status: 'SWAPPABLE' }),
      ]);
    }

    const updatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate('requester_id', 'name email')
      .populate('recipient_id', 'name email')
      .populate('requester_event_id')
      .populate('recipient_event_id');

    res.json({ data: updatedRequest });
  } catch (error) {
    console.error('Respond to swap request error:', error);
    res.status(500).json({ error: 'Failed to respond to swap request', message: error.message });
  }
});

// Also support POST /api/swap-response/:requestId endpoint as specified in requirements
export const swapResponseHandler = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept } = req.body;

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }

    const swapRequest = await SwapRequest.findById(requestId)
      .populate('requester_event_id')
      .populate('recipient_event_id');

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Verify user is the recipient
    if (swapRequest.recipient_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to respond to this request' });
    }

    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Swap request is no longer pending' });
    }

    if (!swapRequest.requester_event_id || !swapRequest.recipient_event_id) {
      return res.status(404).json({ error: 'One or both events no longer exist' });
    }

    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';
    swapRequest.status = newStatus;
    await swapRequest.save();

    if (accept) {
      const requesterEvent = swapRequest.requester_event_id;
      const recipientEvent = swapRequest.recipient_event_id;

      if (!requesterEvent || !recipientEvent) {
        return res.status(404).json({ error: 'Events not found for swapping' });
        }

      const tempUserId = requesterEvent.user_id;
      requesterEvent.user_id = recipientEvent.user_id;
      recipientEvent.user_id = tempUserId;

      requesterEvent.status = 'BUSY';
      recipientEvent.status = 'BUSY';

      await Promise.all([
        requesterEvent.save(),
        recipientEvent.save(),
      ]);
    } else {
      await Promise.all([
        Event.findByIdAndUpdate(swapRequest.requester_event_id, { status: 'SWAPPABLE' }),
        Event.findByIdAndUpdate(swapRequest.recipient_event_id, { status: 'SWAPPABLE' }),
      ]);
    }

    const updatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate('requester_id', 'name email')
      .populate('recipient_id', 'name email')
      .populate('requester_event_id')
      .populate('recipient_event_id');

    res.json({ data: updatedRequest });
  } catch (error) {
    console.error('Respond to swap request error:', error);
    res.status(500).json({ error: 'Failed to respond to swap request', message: error.message });
  }
};

export default router;
