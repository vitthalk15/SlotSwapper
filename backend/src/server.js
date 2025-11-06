import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import swapRequestRoutes, { swapResponseHandler } from './routes/swapRequests.js';
import profileRoutes from './routes/profiles.js';
import { authenticateToken } from './middleware/auth.js';
import Event from './models/Event.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://slot-swapper-xi.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server / curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// Explicitly handle preflight
app.options('*', cors());

app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swap-sync');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('\n📋 To fix this error:');
    console.error('   1. Make sure MongoDB is running locally, OR');
    console.error('   2. Update MONGODB_URI in backend/.env file with your MongoDB Atlas connection string');
    console.error('\n   See backend/MONGODB_SETUP.md for detailed instructions\n');
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/swap-requests', swapRequestRoutes);
app.use('/api/profiles', profileRoutes);

// Required endpoint: GET /api/swappable-slots (as specified in requirements)
app.get('/api/swappable-slots', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({
      status: 'SWAPPABLE',
      user_id: { $ne: req.user._id },
    })
      .populate('user_id', 'name email')
      .sort({ start_time: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ error: 'Failed to fetch swappable slots', message: error.message });
  }
});

// Required endpoint: POST /api/swap-request (as specified in requirements)
app.post('/api/swap-request', authenticateToken, async (req, res) => {
  try {
    const SwapRequest = (await import('./models/SwapRequest.js')).default;
    const { mySlotId, theirSlotId } = req.body;

    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: 'Both event IDs are required (mySlotId and theirSlotId)' });
    }

    const [requesterEvent, recipientEvent] = await Promise.all([
      Event.findById(mySlotId),
      Event.findById(theirSlotId),
    ]);

    if (!requesterEvent || !recipientEvent) {
      return res.status(404).json({ error: 'One or both events not found' });
    }

    if (requesterEvent.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not own the requester event' });
    }

    if (requesterEvent.status !== 'SWAPPABLE' || recipientEvent.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'One or both events are no longer swappable' });
    }

    const SwapReq = new SwapRequest({
      requester_id: req.user._id,
      requester_event_id: mySlotId,
      recipient_id: recipientEvent.user_id,
      recipient_event_id: theirSlotId,
      status: 'PENDING',
    });

    await SwapReq.save();

    await Promise.all([
      Event.findByIdAndUpdate(mySlotId, { status: 'SWAP_PENDING' }),
      Event.findByIdAndUpdate(theirSlotId, { status: 'SWAP_PENDING' }),
    ]);

    const populatedRequest = await (await import('./models/SwapRequest.js')).default
      .findById(SwapReq._id)
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

// Required endpoint: POST /api/swap-response/:requestId (as specified in requirements)
app.post('/api/swap-response/:requestId', authenticateToken, swapResponseHandler);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Swap Sync API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked', originTried: req.headers.origin });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
