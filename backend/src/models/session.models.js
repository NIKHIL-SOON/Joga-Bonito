import mongoose from 'mongoose';

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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'performance',
      required: [true, 'performance ID is required'],
      index: true,
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