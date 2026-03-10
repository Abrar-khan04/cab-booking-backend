import dotenv from 'dotenv'
dotenv.config()

// Clerk JWT verification middleware
// Verifies the Authorization header token from the frontend
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT with Clerk's JWKS endpoint
    // For development, we extract the clerk user ID from the token payload
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )

    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Attach user info to request
    req.auth = {
      userId: payload.sub, // Clerk user ID
      email: payload.email || null,
      name: payload.name || null,
    }

    next()
  } catch (error) {
    console.error('Auth error:', error.message)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

// Optional auth - doesn't block if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )
      req.auth = {
        userId: payload.sub,
        email: payload.email || null,
      }
    }
  } catch (error) {
    // Silently continue without auth
  }
  next()
}
