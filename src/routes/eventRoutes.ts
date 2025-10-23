import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: '✅ Event routes working fine!' })
})

export default router
