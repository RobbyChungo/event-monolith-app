import { PrismaClient } from "@prisma/client";
import { getIO } from "../services/socket"; // ✅ use the helper

const prisma = new PrismaClient();

// ✅ Create and emit a notification
export const createNotification = async ({
  eventId,
  message,
}: {
  eventId: string;
  message: string;
}) => {
  // 🧱 Store notification in the database
  const notification = await prisma.notification.create({
    data: { message, eventId },
  });

  try {
    const io = getIO(); // ✅ now works
    io.emit("notification", notification);
    console.log("📡 Notification emitted:", message);
  } catch (err) {
    console.warn("⚠️ Socket not initialized yet:", (err as any)?.message);
  }

  return notification;
};

// ✅ Get all notifications
export const getAllNotifications = async () => {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
  });
};

// ✅ Handler: get notifications for a specific event (used by route)
export const getNotificationsHandler = async (ctx: any) => {
  const { id } = ctx.params as { id: string };
  const notifications = await prisma.notification.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
  });
  return { notifications };
};
