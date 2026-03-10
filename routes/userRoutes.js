import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  syncUser,
  getProfile,
  updateProfile,
  getAvailableDrivers,
  toggleAvailability,
} from '../controllers/userController.js'

const router = express.Router()

// Public
router.post('/sync', syncUser)                     // Sync user from Clerk
router.get('/drivers', getAvailableDrivers)         // List available drivers

// Protected (require auth)
router.get('/profile', requireAuth, getProfile)     // Get my profile
router.put('/profile', requireAuth, updateProfile)  // Update my profile
router.put('/availability', requireAuth, toggleAvailability) // Toggle driver online/offline

export default router
