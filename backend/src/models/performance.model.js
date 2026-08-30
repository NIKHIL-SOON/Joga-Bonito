import mongoose from "mongoose";
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
    }
  }
);

export const Performance = mongoose.model("performance",performanceSchema)