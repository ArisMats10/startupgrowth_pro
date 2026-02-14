import mongoose from "mongoose";

const advisorMessageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const advisorConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: {
      type: [advisorMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

advisorConversationSchema.index({ user: 1, updatedAt: -1 });

const AdvisorConversation = mongoose.model("AdvisorConversation", advisorConversationSchema);

export default AdvisorConversation;
