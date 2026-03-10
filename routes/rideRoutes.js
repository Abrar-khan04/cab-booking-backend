import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  createRide,
  getUserRides,
  getRideById,
  updateRideStatus,
  getAvailableRides,
  verifyOTP,
} from '../controllers/rideController.js'

const router = express.Router()

// All ride routes require authentication
router.post('/', requireAuth, createRide)
router.get('/', requireAuth, getUserRides)
router.get('/available', requireAuth, getAvailableRides)
router.get('/:id', requireAuth, getRideById)
router.put('/:id/status', requireAuth, updateRideStatus)
router.post('/:id/verify-otp', requireAuth, verifyOTP)

export default router

