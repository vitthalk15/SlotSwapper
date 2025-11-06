import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  start_time: {
    type: Date,
    required: true,
  },
  end_time: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'],
    default: 'BUSY',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
eventSchema.index({ user_id: 1, start_time: 1 });
eventSchema.index({ status: 1, start_time: 1 });

export default mongoose.model('Event', eventSchema);

