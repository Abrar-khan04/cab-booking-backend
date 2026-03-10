import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  createPayment,
  confirmPayment,
  getPaymentHistory,
} from '../controllers/paymentController.js'

const router = express.Router()

router.post('/create', requireAuth, createPayment)     // Create payment
router.post('/confirm', requireAuth, confirmPayment)    // Confirm payment
router.get('/history', requireAuth, getPaymentHistory)  // Get payment history

export default router
