import { getAISuggestion, getRecommendations, backfillEmbeddings, recomputeMyProfile } from "../controllers/aiController";

export const registerAiRoutes = (app) => {
  app.post("/ai/suggest", getAISuggestion);
  app.get("/ai/recommendations", getRecommendations);
  app.post("/ai/backfill", backfillEmbeddings); // { recomputeUsers?: boolean }
  app.post("/ai/profile/recompute", recomputeMyProfile);
};
