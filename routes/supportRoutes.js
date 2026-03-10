import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createTicket, getUserTickets } from '../controllers/supportController.js'

const router = express.Router()

router.post('/tickets', requireAuth, createTicket)    // Create ticket
router.get('/tickets', requireAuth, getUserTickets)    // Get my tickets

export default router
