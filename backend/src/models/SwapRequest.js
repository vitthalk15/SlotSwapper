import mongoose from 'mongoose';

const swapRequestSchema = new mongoose.Schema({
  requester_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requester_event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient_event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
swapRequestSchema.index({ requester_id: 1, created_at: -1 });
swapRequestSchema.index({ recipient_id: 1, created_at: -1 });

export default mongoose.model('SwapRequest', swapRequestSchema);

