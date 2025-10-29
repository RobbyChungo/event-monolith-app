import {
  createEventHandler,
  getAllEventsHandler,
} from "../controllers/event.controller";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { broadcast } from "../services/socket";

const prisma = new PrismaClient();

// ✅ Helper: verify and extract user from JWT
async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid token");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new Error("User not found");

  return user;
}

export const registerEventRoutes = (app) => {
  // ✅ CREATE event (ADMIN or ORGANIZER)
  app.post("/events/create", createEventHandler);

  // ✅ GET ALL events (public)
  app.get("/events", getAllEventsHandler);

  // ✅ GET ONE event by ID (public)
  app.get("/events/:id", async ({ params }) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: params.id },
        include: { createdBy: { select: { name: true, email: true, role: true } } },
      });

      if (!event) return { error: "Event not found" };
      return { message: "Event retrieved successfully", event };
    } catch (err) {
      console.error("[getEventById]", err);
      return { error: "Failed to fetch event" };
    }
  });

  // ✅ UPDATE event (only ADMIN or creator)
  app.put("/events/:id", async (ctx) => {
    try {
      const user = await getUserFromToken(ctx.request);
      const { id } = ctx.params;
      const { title, description, date, location } = ctx.body as any;

      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) return { error: "Event not found" };

      if (event.createdById !== user.id && user.role !== "ADMIN") {
        ctx.set.status = 403;
        return { error: "You are not allowed to update this event." };
      }

      const updated = await prisma.event.update({
        where: { id },
        data: { title, description, date: new Date(date), location },
      });

      // Recompute embedding for this event
      try {
        const { ensureEventEmbedding } = await import("../services/recommendation.service");
        await ensureEventEmbedding(id);
      } catch (e) {
        console.warn("[embedding] update failed", e?.message || e);
      }

      broadcast("events", { type: "updated", event: updated });
      return { message: "Event updated successfully", updated };
    } catch (err: any) {
      console.error("[updateEvent]", err);
      ctx.set.status = 400;
      return { error: err.message };
    }
  });

  // ✅ DELETE event (only ADMIN or creator)
  app.delete("/events/:id", async (ctx) => {
    try {
      const user = await getUserFromToken(ctx.request);
      const { id } = ctx.params;

      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) return { error: "Event not found" };

      if (event.createdById !== user.id && user.role !== "ADMIN") {
        ctx.set.status = 403;
        return { error: "You are not allowed to delete this event." };
      }

      await prisma.event.delete({ where: { id } });
      broadcast("events", { type: "deleted", eventId: id });
      return { message: "Event deleted successfully" };
    } catch (err: any) {
      console.error("[deleteEvent]", err);
      ctx.set.status = 400;
      return { error: err.message };
    }
  });

  // ✅ APPROVE event (ADMIN only)
  app.put("/events/:id/approve", async (ctx) => {
    try {
      const user = await getUserFromToken(ctx.request);
      if (user.role !== "ADMIN") {
        ctx.set.status = 403;
        return { error: "Only ADMIN can approve events." };
      }
      const { id } = ctx.params;
      const event = await prisma.event.update({ where: { id }, data: { approved: true } });
      broadcast("events", { type: "approved", eventId: id });
      return { message: "Event approved", event };
    } catch (err: any) {
      console.error("[approveEvent]", err);
      ctx.set.status = 400;
      return { error: err.message };
    }
  });
};
