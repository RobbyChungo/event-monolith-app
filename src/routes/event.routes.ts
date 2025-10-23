import { Router } from 'express'
import { createEvent, getEvents } from '../controllers/eventController'

const router = Router()

router.post('/', createEvent)  // POST /events
router.get('/', getEvents)     // GET /events

export default router
