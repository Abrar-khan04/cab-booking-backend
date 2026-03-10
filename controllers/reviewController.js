import supabase from '../config/supabase.js'

// POST /api/reviews — Submit a review
export const createReview = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { ride_id, driver_id, rating, comment } = req.body

    if (!ride_id || !rating) {
      return res.status(400).json({ error: 'ride_id and rating are required' })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    // Get rider
    const { data: rider } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single()

    if (!rider) return res.status(404).json({ error: 'User not found' })

    // Check if review already exists for this ride
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('ride_id', ride_id)
      .eq('rider_id', rider.id)
      .single()

    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this ride' })
    }

    // Create review
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ride_id,
        rider_id: rider.id,
        driver_id,
        rating,
        comment,
      })
      .select()
      .single()

    if (error) throw error

    // Update driver's average rating
    if (driver_id) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('driver_id', driver_id)

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        await supabase
          .from('users')
          .update({ rating: Math.round(avgRating * 100) / 100 })
          .eq('id', driver_id)
      }
    }

    res.status(201).json({ message: 'Review submitted', review: data })

  } catch (error) {
    console.error('Create review error:', error.message)
    res.status(500).json({ error: 'Failed to submit review' })
  }
}

// GET /api/reviews/driver/:id — Get driver reviews
export const getDriverReviews = async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 20 } = req.query

    const { data, error } = await supabase
      .from('reviews')
      .select('*, rider:rider_id(name, profile_pic)')
      .eq('driver_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error
    res.json({ reviews: data || [] })

  } catch (error) {
    console.error('Get reviews error:', error.message)
    res.status(500).json({ error: 'Failed to get reviews' })
  }
}
