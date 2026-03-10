import supabase from '../config/supabase.js'

// POST /api/users/sync — Sync user from Clerk to Supabase
export const syncUser = async (req, res) => {
  try {
    const { clerk_id, email, name, phone, role, profile_pic } = req.body

    if (!clerk_id || !email) {
      return res.status(400).json({ error: 'clerk_id and email are required' })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerk_id)
      .single()

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({ email, name, phone, profile_pic, updated_at: new Date().toISOString() })
        .eq('clerk_id', clerk_id)
        .select()
        .single()

      if (error) throw error
      return res.json({ message: 'User updated', user: data })
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_id,
        email,
        name: name || email.split('@')[0],
        phone,
        role: role || 'rider',
        profile_pic,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ message: 'User created', user: data })

  } catch (error) {
    console.error('Sync user error:', error.message)
    res.status(500).json({ error: 'Failed to sync user' })
  }
}

// GET /api/users/profile — Get current user profile
export const getProfile = async (req, res) => {
  try {
    const clerkId = req.auth.userId

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: data })
  } catch (error) {
    console.error('Get profile error:', error.message)
    res.status(500).json({ error: 'Failed to get profile' })
  }
}

// PUT /api/users/profile — Update profile
export const updateProfile = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { name, phone, profile_pic, role } = req.body

    const updates = {}
    if (name) updates.name = name
    if (phone) updates.phone = phone
    if (profile_pic) updates.profile_pic = profile_pic
    if (role && ['rider', 'driver'].includes(role)) updates.role = role

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (error) throw error
    res.json({ message: 'Profile updated', user: data })
  } catch (error) {
    console.error('Update profile error:', error.message)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}

// GET /api/users/drivers — List available drivers
export const getAvailableDrivers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, profile_pic, rating, current_lat, current_lng')
      .eq('role', 'driver')
      .eq('is_available', true)

    if (error) throw error
    res.json({ drivers: data || [] })
  } catch (error) {
    console.error('Get drivers error:', error.message)
    res.status(500).json({ error: 'Failed to get drivers' })
  }
}

// PUT /api/users/availability — Toggle driver availability
export const toggleAvailability = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { is_available, lat, lng } = req.body

    const updates = { is_available }
    if (lat) updates.current_lat = lat
    if (lng) updates.current_lng = lng

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (error) throw error
    res.json({ message: `Driver is now ${is_available ? 'online' : 'offline'}`, user: data })
  } catch (error) {
    console.error('Toggle availability error:', error.message)
    res.status(500).json({ error: 'Failed to update availability' })
  }
}
