import mongoose from "mongoose";

const businessPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    template: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    businessPlanData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    completionStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const BusinessPlan = mongoose.model("BusinessPlan", businessPlanSchema);
export default BusinessPlan;
