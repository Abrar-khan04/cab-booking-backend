import supabase from '../config/supabase.js'
import { calculateFare, calculateDistance, generateOTP } from '../utils/helpers.js'

// POST /api/rides — Create a new ride request
export const createRide = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const {
      pickup_address, pickup_lat, pickup_lng,
      dropoff_address, dropoff_lat, dropoff_lng,
      ride_type, stops, promo_code, discount
    } = req.body

    if (!pickup_address || !dropoff_address) {
      return res.status(400).json({ error: 'Pickup and dropoff addresses are required' })
    }

    // Get rider from DB
    const { data: rider } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single()

    if (!rider) {
      return res.status(404).json({ error: 'User not found. Please sync your profile first.' })
    }

    // 🚫 Drivers cannot book rides — they must switch to Rider mode first
    if (rider.role === 'driver') {
      return res.status(403).json({ error: 'You are in Driver mode. Switch to Rider mode in your Profile to book a ride.' })
    }

    // Calculate distance and fare
    let distance = null
    let fare = null
    if (pickup_lat && pickup_lng && dropoff_lat && dropoff_lng) {
      distance = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
      fare = calculateFare(distance, ride_type || 'standard')
    }

    // Apply discount if promo code used
    let finalFare = fare
    if (discount && fare) {
      finalFare = Math.max(fare - discount, 0)
    }

    // Create ride
    const { data, error } = await supabase
      .from('rides')
      .insert({
        rider_id: rider.id,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dropoff_address,
        dropoff_lat,
        dropoff_lng,
        ride_type: ride_type || 'standard',
        distance,
        fare: finalFare,
        status: 'requested',
        stops: stops || [],
        promo_code: promo_code || null,
        discount: discount || 0,
      })
      .select()
      .single()

    if (error) throw error

    // 🔌 Notify drivers of new ride
    const io = req.app.get('io')
    if (io) {
      io.to('drivers').emit('new-ride', { ride: data })
    }

    res.status(201).json({ message: 'Ride requested', ride: data })

  } catch (error) {
    console.error('Create ride error:', error.message)
    res.status(500).json({ error: 'Failed to create ride' })
  }
}

// GET /api/rides — Get user's rides (rider or driver)
export const getUserRides = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { status, limit = 20 } = req.query

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    // Build query based on role
    let query = supabase
      .from('rides')
      .select('*, rider:rider_id(name, profile_pic, rating), driver:driver_id(name, profile_pic, rating)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (user.role === 'driver') {
      query = query.eq('driver_id', user.id)
    } else {
      query = query.eq('rider_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ rides: data || [] })
  } catch (error) {
    console.error('Get rides error:', error.message)
    res.status(500).json({ error: 'Failed to get rides' })
  }
}

// GET /api/rides/:id — Get single ride
export const getRideById = async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('rides')
      .select('*, rider:rider_id(name, email, phone, profile_pic, rating), driver:driver_id(name, email, phone, profile_pic, rating)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Ride not found' })
    }

    res.json({ ride: data })
  } catch (error) {
    console.error('Get ride error:', error.message)
    res.status(500).json({ error: 'Failed to get ride' })
  }
}

// PUT /api/rides/:id/status — Update ride status
export const updateRideStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const clerkId = req.auth.userId

    const validStatuses = ['accepted', 'arriving', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    // Get the user
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    const updates = { status }

    // If driver accepts, assign them to the ride
    if (status === 'accepted' && user.role === 'driver') {

      // 🚫 First fetch the ride to make sure the driver is not also the rider
      const { data: rideCheck } = await supabase
        .from('rides')
        .select('rider_id')
        .eq('id', id)
        .single()

      if (rideCheck && rideCheck.rider_id === user.id) {
        return res.status(403).json({ error: 'You cannot accept your own ride request.' })
      }

      updates.driver_id = user.id
    }

    // 🔢 Generate OTP when driver marks 'arriving' at pickup
    if (status === 'arriving') {
      updates.otp = generateOTP()
    }

    const { data, error } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', id)
      .select('*, rider:rider_id(name, profile_pic), driver:driver_id(name, profile_pic)')
      .single()

    if (error) throw error

    // 🔌 Emit real-time events
    const io = req.app.get('io')
    if (io) {
      io.to(`ride-${id}`).emit('ride-status-updated', { rideId: id, status, ride: data })
      if (status === 'accepted') io.to('drivers').emit('ride-accepted', { rideId: id })
      // Send OTP to rider's ride room when driver is arriving
      if (status === 'arriving' && updates.otp) {
        io.to(`ride-${id}`).emit('ride-otp', { rideId: id, otp: updates.otp })
      }
    }

    res.json({ message: `Ride ${status}`, ride: data })

  } catch (error) {
    console.error('Update ride status error:', error.message)
    res.status(500).json({ error: 'Failed to update ride status' })
  }
}

// POST /api/rides/:id/verify-otp — Driver enters OTP to start the ride
export const verifyOTP = async (req, res) => {
  try {
    const { id } = req.params
    const { otp } = req.body

    if (!otp) return res.status(400).json({ error: 'OTP is required' })

    const { data: ride } = await supabase
      .from('rides').select('otp, status').eq('id', id).single()

    if (!ride) return res.status(404).json({ error: 'Ride not found' })
    if (ride.status !== 'arriving') return res.status(400).json({ error: 'Ride is not in arriving state' })
    if (ride.otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Incorrect OTP. Ask the rider for the correct code.' })
    }

    // OTP correct — start the ride, clear OTP from DB
    const { data, error } = await supabase
      .from('rides')
      .update({ status: 'in_progress', otp: null })
      .eq('id', id)
      .select('*, rider:rider_id(name, profile_pic), driver:driver_id(name, profile_pic)')
      .single()

    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`ride-${id}`).emit('ride-status-updated', { rideId: id, status: 'in_progress', ride: data })

    res.json({ message: 'OTP verified! Ride started.', ride: data })

  } catch (error) {
    console.error('Verify OTP error:', error.message)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
}

// GET /api/rides/available — Get available rides for drivers
export const getAvailableRides = async (req, res) => {
  try {
    const clerkId = req.auth.userId

    // Get current driver's user id
    const { data: driver } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single()

    if (!driver) return res.status(404).json({ error: 'User not found' })

    // 🚫 Exclude rides that were posted by this same user
    const { data, error } = await supabase
      .from('rides')
      .select('*, rider:rider_id(name, profile_pic, rating)')
      .eq('status', 'requested')
      .is('driver_id', null)
      .neq('rider_id', driver.id)   // <-- KEY: exclude own rides
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ rides: data || [] })
  } catch (error) {
    console.error('Get available rides error:', error.message)
    res.status(500).json({ error: 'Failed to get available rides' })
  }
}
