import mongoose from "mongoose";

const swotQuadrantSchema = new mongoose.Schema(
  {
    strengths: { type: [mongoose.Schema.Types.Mixed], default: [] },
    weaknesses: { type: [mongoose.Schema.Types.Mixed], default: [] },
    opportunities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    threats: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["swot", "porter", "business_plan"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    // Optional structured storage for SWOT quadrant items (the "4 forces" in SWOT).
    // We keep it flexible (Mixed) to support existing item shapes from the frontend.
    swotData: {
      type: swotQuadrantSchema,
      default: undefined,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const Analysis = mongoose.model("Analysis", analysisSchema);
export default Analysis;
