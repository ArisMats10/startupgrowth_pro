import express from "express";
import { protectedRoute } from "../middleware/protectedRoutes.js";
import {
  createBusinessPlan,
  deleteBusinessPlan,
  createAnalysis,
  deleteAnalysis,
  generateAnalyticsInsights,
  generateBusinessPlanInsights,
  generateBusinessPlanSection,
  compareBusinessPlans,
  generateMentoringInsights,
  generateAndSaveSwotAiForAnalysis,
  generatePorterForceInsights,
  generatePortersInsights,
  generateSwotInsights,
  getBusinessPlan,
  getLatestSwotItems,
  getAnalysis,
  getLatestAnalysis,
  getLatestPorterForceInsights,
  listBusinessPlans,
  listAnalyses,
  renameAnalysis,
  updateBusinessPlan,
  updateAnalysis,
  saveSwotItems,
} from "../controllers/toolsControllers.js";
import {
  appendAdvisorConversationMessages,
  createAdvisorConversation,
  deleteAdvisorConversation,
  generateAdvisorResponse,
  getLatestAdvisorConversation,
} from "../controllers/advisorControllers.js";

const router = express.Router();

router.post("/swot/insights", protectedRoute, generateSwotInsights);
router.post("/swot/analyses/:id/ai", protectedRoute, generateAndSaveSwotAiForAnalysis);
router.post("/swot/items", protectedRoute, saveSwotItems);
router.get("/swot/items", protectedRoute, getLatestSwotItems);
router.post("/porter/insights", protectedRoute, generatePortersInsights);
router.post("/porter/force-insights", protectedRoute, generatePorterForceInsights);
router.get("/porter/force-insights", protectedRoute, getLatestPorterForceInsights);
router.post("/business-plan/section", protectedRoute, generateBusinessPlanSection);
router.post("/business-plan/insights", protectedRoute, generateBusinessPlanInsights);
router.post("/business-plan/compare", protectedRoute, compareBusinessPlans);

router.post("/analytics/insights", protectedRoute, generateAnalyticsInsights);
router.post("/mentoring/insights", protectedRoute, generateMentoringInsights);

// AI Business Advisor response generation does NOT require login.
router.post("/advisor/respond", generateAdvisorResponse);

router.get("/advisor/conversations/latest", protectedRoute, getLatestAdvisorConversation);
router.post("/advisor/conversations", protectedRoute, createAdvisorConversation);
router.delete("/advisor/conversations/:id", protectedRoute, deleteAdvisorConversation);
router.post(
  "/advisor/conversations/:id/messages",
  protectedRoute,
  appendAdvisorConversationMessages
);

router.post("/business-plan/plans", protectedRoute, createBusinessPlan);
router.get("/business-plan/plans", protectedRoute, listBusinessPlans);
router.get("/business-plan/plans/:id", protectedRoute, getBusinessPlan);
router.patch("/business-plan/plans/:id", protectedRoute, updateBusinessPlan);
router.delete("/business-plan/plans/:id", protectedRoute, deleteBusinessPlan);

router.post("/analyses", protectedRoute, createAnalysis);

router.get("/analyses", protectedRoute, listAnalyses);
router.get("/analyses/latest", protectedRoute, getLatestAnalysis);
router.get("/analyses/:id", protectedRoute, getAnalysis);
router.patch("/analyses/:id/title", protectedRoute, renameAnalysis);
router.patch("/analyses/:id", protectedRoute, updateAnalysis);
router.delete("/analyses/:id", protectedRoute, deleteAnalysis);

export default router;
