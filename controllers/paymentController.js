import supabase from '../config/supabase.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// POST /api/payments/create — Create Razorpay order
export const createPayment = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { ride_id } = req.body

    if (!ride_id) {
      return res.status(400).json({ error: 'ride_id is required' })
    }

    // Get ride details
    const { data: ride } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single()

    if (!ride) return res.status(404).json({ error: 'Ride not found' })
    if (!ride.fare) return res.status(400).json({ error: 'Ride fare not calculated' })

    // Get rider
    const { data: rider } = await supabase
      .from('users')
      .select('id, email')
      .eq('clerk_id', clerkId)
      .single()

    if (!rider) return res.status(404).json({ error: 'User not found' })

    // Check for existing pending payment
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('ride_id', ride_id)
      .eq('status', 'pending')
      .single()

    if (existingPayment && existingPayment.razorpay_order_id) {
      return res.json({ payment: existingPayment, orderId: existingPayment.razorpay_order_id })
    }

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(ride.fare * 100),
      currency: 'INR',
      receipt: `ride_${ride_id.slice(0, 8)}`,
      notes: {
        ride_id,
        rider_id: rider.id,
      },
    })

    // Save payment record
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ride_id,
        rider_id: rider.id,
        driver_id: ride.driver_id,
        amount: ride.fare,
        payment_method: 'razorpay',
        status: 'pending',
        razorpay_order_id: order.id,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      payment: data,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })

  } catch (error) {
    const msg = error?.error?.description || error?.message || JSON.stringify(error)
    console.error('Create payment error:', msg, error)
    res.status(500).json({ error: 'Failed to create payment: ' + msg })
  }
}

// POST /api/payments/confirm — Verify and confirm Razorpay payment
export const confirmPayment = async (req, res) => {
  try {
    const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!payment_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' })
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
    }

    // Update payment status
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        razorpay_payment_id,
      })
      .eq('id', payment_id)
      .select()
      .single()

    if (error) throw error

    // Emit real-time event
    const io = req.app.get('io')
    if (io && data.ride_id) {
      io.to(`ride-${data.ride_id}`).emit('payment-confirmed', {
        rideId: data.ride_id,
        payment: data,
      })
    }

    res.json({ message: 'Payment verified and confirmed', payment: data })

  } catch (error) {
    console.error('Confirm payment error:', error.message)
    res.status(500).json({ error: 'Failed to confirm payment' })
  }
}

// GET /api/payments/history — Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { limit = 20 } = req.query

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    let query = supabase
      .from('payments')
      .select('*, ride:ride_id(pickup_address, dropoff_address, ride_type, distance, created_at, status)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (user.role === 'driver') {
      query = query.eq('driver_id', user.id)
    } else {
      query = query.eq('rider_id', user.id)
    }

    const { data, error } = await query
    if (error) throw error
    res.json({ payments: data || [] })

  } catch (error) {
    console.error('Get payments error:', error.message)
    res.status(500).json({ error: 'Failed to get payment history' })
  }
}
