import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createNotification } from "./notification.controller"; // ✅ Correct import
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

// ✅ Create Event
export const createEventHandler = async (ctx) => {
  try {
    console.log("📥 Incoming event creation request");

    // 🔑 Authenticate user
    const user = await getUserFromToken(ctx.request);

    // 🔒 Permission check
    if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
      ctx.set.status = 403;
      return { error: "Only ADMIN or ORGANIZER can create events." };
    }

    // 🧠 Parse request body
    const { title, description, date, location } = ctx.body as any;

    if (!title || !date || !location) {
      ctx.set.status = 400;
      return { error: "Missing required fields: title, date, or location." };
    }

    // 🏗️ Create the event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        createdById: user.id,
      },
    });

    // 🧠 Precompute embedding for personalized recs
    try {
      const { ensureEventEmbedding } = await import("../services/recommendation.service");
      await ensureEventEmbedding(event.id);
    } catch (e) {
      console.warn("[embedding] could not compute for event", e?.message || e);
    }

    // 📡 Trigger real-time notification
    await createNotification({
      eventId: event.id,
      message: `📢 New event created: ${event.title} at ${event.location}`,
    });

    // Websocket broadcast
    broadcast("events", { type: "created", event });

    ctx.set.status = 201;
    console.log("✅ Event created successfully:", event.title);

    return { message: "Event created successfully", event };
  } catch (err: any) {
    console.error("[createEventHandler]", err);
    ctx.set.status = 400;
    return { error: err.message };
  }
};

// ✅ Get All Events
export const getAllEventsHandler = async () => {
  try {
    const events = await prisma.event.findMany({
      include: {
        createdBy: { select: { name: true, email: true, role: true } },
      },
      orderBy: { date: "asc" },
    });

    return { message: "Events retrieved successfully", events };
  } catch (err: any) {
    console.error("[getAllEventsHandler]", err);
    return { error: "Failed to fetch events" };
  }
};
