import { suggestWithGemini } from "../services/aiSuggester";
import jwt from "jsonwebtoken";
import { recommendForUser } from "../services/recommendation.service";

export const getAISuggestion = async (ctx) => {
  try {
    const body = (ctx.body || {}) as { prompt?: string; topic?: string; count?: number };
    const queryTopic = (ctx.query?.topic as string) || undefined;
    const queryCount = Number(ctx.query?.count as string) || undefined;
    const topic = body.topic || queryTopic;
    const count = body.count ?? queryCount ?? 5;

    // Allow either a direct prompt or a simple topic like "health" or "education"
    const effectivePrompt = body.prompt?.trim()
      || (topic ? `Suggest 5 event ideas about ${topic}. For each, provide a short title and one-sentence description.` : "");

    const result = await suggestWithGemini(effectivePrompt, count);
    return result;
  } catch (err: any) {
    console.error("[AI Suggestion Error]", err);
    ctx.set.status = 500;
    return { error: "Failed to generate suggestion" };
  }
};

// Personalized recommendations for the authenticated user
export const getRecommendations = async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.set.status = 401;
      return { error: "Unauthorized" };
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    const limit = Number((ctx.query?.limit as string) || 5);
    const recs = await recommendForUser(userId, limit);

    return { message: "Recommendations generated", recommendations: recs };
  } catch (err: any) {
    console.error("[AI Recommendations Error]", err);
    ctx.set.status = 500;
    return { error: "Failed to generate recommendations" };
  }
};

// Backfill embeddings for all events (and optionally recompute all users)
export const backfillEmbeddings = async (ctx) => {
  try {
    const { recomputeUsers } = (ctx.body || {}) as { recomputeUsers?: boolean };
    const { backfillEventEmbeddings, recomputeAllUserProfiles } = await import("../services/recommendation.service");
    const result = await backfillEventEmbeddings();
    let users: any = null;
    if (recomputeUsers) users = await recomputeAllUserProfiles();
    return { message: "Backfill complete", events: result, users };
  } catch (err: any) {
    console.error("[AI Backfill Error]", err);
    ctx.set.status = 500;
    return { error: "Failed to backfill embeddings" };
  }
};

// Recompute the current user's profile embedding manually
export const recomputeMyProfile = async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.set.status = 401;
      return { error: "Unauthorized" };
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { recomputeUserProfile } = await import("../services/recommendation.service");
    const profile = await recomputeUserProfile(decoded.userId);
    return { message: "Profile recomputed", profile };
  } catch (err: any) {
    console.error("[AI Profile Recompute Error]", err);
    ctx.set.status = 500;
    return { error: "Failed to recompute profile" };
  }
};
