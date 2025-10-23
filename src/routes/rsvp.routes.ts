import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { rsvpToEvent, getEventRsvps } from '../controllers/rsvp.controller'

const router = Router()

router.post('/events/:id/rsvp', requireAuth, rsvpToEvent)
router.get('/events/:id/rsvps', getEventRsvps)

export default router
