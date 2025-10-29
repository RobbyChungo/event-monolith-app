import { rsvpEventHandler, getEventRSVPsHandler } from "../controllers/rsvp.controller";

export const registerRsvpRoutes = (app) => {
  app.post("/events/:id/rsvp", rsvpEventHandler);
  app.get("/events/:id/rsvps", getEventRSVPsHandler);
};
