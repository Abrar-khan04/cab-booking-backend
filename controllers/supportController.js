import supabase from '../config/supabase.js'

// POST /api/support/tickets — Create a support ticket
export const createTicket = async (req, res) => {
  try {
    const clerkId = req.auth.userId
    const { category, subject, description, ride_id } = req.body

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Category, subject, and description are required' })
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('clerk_id', clerkId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        category,
        subject,
        description,
        ride_id: ride_id || null,
        status: 'open',
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Ticket created successfully', ticket: data })
  } catch (error) {
    console.error('Create ticket error:', error.message)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
}

// GET /api/support/tickets — Get user's tickets
export const getUserTickets = async (req, res) => {
  try {
    const clerkId = req.auth.userId

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ tickets: data || [] })
  } catch (error) {
    console.error('Get tickets error:', error.message)
    res.status(500).json({ error: 'Failed to get tickets' })
  }
}
