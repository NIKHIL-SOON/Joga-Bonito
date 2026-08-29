import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 1, // e.g., 0.86 for 86%
    },
    timeTaken: {
      type: Number,
      default: 0, // Time in seconds
    },
    mistakes: {
      type: Number,
      default: 0,
      min: 0,
    },
    hintsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageLatencyMs: {
      type: Number,
      default: 0, // Response latency in milliseconds
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    gameId: {
      type: String,
      required: [true, 'Game ID is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'abandoned'],
      default: 'in-progress',
      index: true,
    },
    performance: {
      type: performanceSchema,
      default: () => ({}),
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model('Session', sessionSchema);