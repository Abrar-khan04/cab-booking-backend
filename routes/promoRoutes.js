import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validatePromo } from '../controllers/promoController.js'

const router = express.Router()

router.post('/validate', requireAuth, validatePromo) // Validate promo code

export default router
