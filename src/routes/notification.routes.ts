import { getNotificationsHandler } from "../controllers/notification.controller";

export const registerNotificationRoutes = (app) => {
  // ✅ Get all notifications for a specific event
  app.get("/events/:id/notifications", getNotificationsHandler);
};
