import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createNotification } from "./notification.controller"; // ✅ notify on RSVP
import { broadcast } from "../services/socket";

const prisma = new PrismaClient();

// ✅ Helper: extract and verify user from token
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

// ✅ RSVP to Event
export const rsvpEventHandler = async (ctx) => {
  try {
    const user = await getUserFromToken(ctx.request);
    const { id: eventId } = ctx.params;
    const { response } = ctx.body as { response: string };

    if (!response || !["YES", "NO", "MAYBE"].includes(response.toUpperCase())) {
      ctx.set.status = 400;
      return { error: "Missing or invalid response (YES, NO, or MAYBE)" };
    }

    // ✅ Transaction to avoid race conditions / double-booking
    const result = await prisma.$transaction(async (tx) => {
      // Upsert RSVP
      const existing = await tx.rSVP.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
      });
      const rsvp = existing
        ? await tx.rSVP.update({
            where: { userId_eventId: { userId: user.id, eventId } },
            data: { response },
          })
        : await tx.rSVP.create({ data: { userId: user.id, eventId, response } });

      // Fetch event for notification and optional capacity check
      const event = await tx.event.findUnique({ where: { id: eventId } });

      return { rsvp, event };
    });

    const { rsvp, event } = result;

    // ✅ Notify event creator (outside transaction)
    if (event) {
      await createNotification(
        `${user.name || "A user"} responded ${response.toUpperCase()} to ${event.title}`,
        eventId
      );
    }

    // Update the user's profile embedding after RSVP
    try {
      const { recomputeUserProfile, recommendForUser, trainModelAsync } = await import("../services/recommendation.service");
      await recomputeUserProfile(user.id);

      // Personalized suggestions
      const suggestions = await recommendForUser(user.id, 5);

      // Realtime broadcasts
      broadcast("rsvps", { userId: user.id, eventId, response });

      // Optional: capacity full broadcast if schema supports `capacity`
      try {
        const eventWithCounts = await prisma.event.findUnique({ where: { id: eventId } });
        const capacity = (eventWithCounts as any)?.capacity;
        if (capacity && Number.isFinite(capacity)) {
          const yesCount = await prisma.rSVP.count({ where: { eventId, response: "YES" as any } });
          if (yesCount >= capacity) broadcast("events", { type: "event_full", eventId });
        }
      } catch {}

      // Fire-and-forget background training
      trainModelAsync();

      ctx.set.status = 200;
      return { confirmed: true, rsvp, suggestions };
    } catch (e) {
      console.warn("[profile] recompute failed", e?.message || e);
      ctx.set.status = 200;
      return { confirmed: true, rsvp };
    }
  } catch (err: any) {
    console.error("[rsvpEventHandler]", err);
    ctx.set.status = 400;
    return { error: err.message };
  }
};

// ✅ Get All RSVPs for an Event
export const getEventRSVPsHandler = async (ctx) => {
  try {
    const { id: eventId } = ctx.params;
    const rsvps = await prisma.rSVP.findMany({
      where: { eventId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    ctx.set.status = 200;
    return { message: "RSVPs retrieved successfully", rsvps };
  } catch (err: any) {
    console.error("[getEventRSVPsHandler]", err);
    ctx.set.status = 500;
    return { error: "Failed to fetch RSVPs" };
  }
};
