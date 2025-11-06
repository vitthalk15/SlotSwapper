import express from 'express';
import Event from '../models/Event.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all events for the authenticated user
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ user_id: req.user._id })
      .sort({ start_time: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  try {
    const { title, start_time, end_time, status } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const event = new Event({
      user_id: req.user._id,
      title,
      start_time: startDate,
      end_time: endDate,
      status: status || 'BUSY',
    });

    await event.save();

    res.status(201).json({ data: event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event', message: error.message });
  }
});

// Update an event
router.put('/:id', async (req, res) => {
  try {
    const { title, start_time, end_time, status } = req.body;
    const event = await Event.findOne({ _id: req.params.id, user_id: req.user._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: 'Cannot modify events with pending swaps' });
    }

    if (title) event.title = title;
    if (start_time) event.start_time = new Date(start_time);
    if (end_time) event.end_time = new Date(end_time);
    if (status) event.status = status;

    await event.save();

    res.json({ data: event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event', message: error.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, user_id: req.user._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.deleteOne();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event', message: error.message });
  }
});

// Get swappable events (for marketplace)
router.get('/swappable', async (req, res) => {
  try {
    const events = await Event.find({
      status: 'SWAPPABLE',
      user_id: { $ne: req.user._id },
    })
      .populate('user_id', 'name email')
      .sort({ start_time: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Get swappable events error:', error);
    res.status(500).json({ error: 'Failed to fetch swappable events', message: error.message });
  }
});

// Get user's swappable events
router.get('/my-swappable', async (req, res) => {
  try {
    const events = await Event.find({
      user_id: req.user._id,
      status: 'SWAPPABLE',
    })
      .sort({ start_time: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Get my swappable events error:', error);
    res.status(500).json({ error: 'Failed to fetch your swappable events', message: error.message });
  }
});

export default router;

