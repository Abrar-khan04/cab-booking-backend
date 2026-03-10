import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  createReview,
  getDriverReviews,
} from '../controllers/reviewController.js'

const router = express.Router()

router.post('/', requireAuth, createReview)          // Submit review
router.get('/driver/:id', getDriverReviews)           // Get driver reviews (public)

export default router
