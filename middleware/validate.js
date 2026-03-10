// Input validation & sanitization middleware

// Sanitize string inputs — strip dangerous characters
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str
    return str
        .replace(/<[^>]*>/g, '')     // Strip HTML tags
        .replace(/[<>'"`;]/g, '')    // Strip dangerous chars
        .trim()
}

// Deep-sanitize an object
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value)
        } else {
            sanitized[key] = value
        }
    }
    return sanitized
}

// Middleware to sanitize all request bodies
export const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body)
    }
    next()
}

// Validate UUID format
export const validateUUID = (paramName = 'id') => (req, res, next) => {
    const value = req.params[paramName]
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (value && !uuidRegex.test(value)) {
        return res.status(400).json({ error: `Invalid ${paramName} format` })
    }
    next()
}

// Validate ride creation input
export const validateRideInput = (req, res, next) => {
    const { pickup_address, dropoff_address, ride_type } = req.body

    if (!pickup_address || typeof pickup_address !== 'string' || pickup_address.length < 3) {
        return res.status(400).json({ error: 'Valid pickup address is required (min 3 chars)' })
    }

    if (!dropoff_address || typeof dropoff_address !== 'string' || dropoff_address.length < 3) {
        return res.status(400).json({ error: 'Valid dropoff address is required (min 3 chars)' })
    }

    const validTypes = ['bike', 'standard', 'premium']
    if (ride_type && !validTypes.includes(ride_type)) {
        return res.status(400).json({ error: `Invalid ride type. Must be: ${validTypes.join(', ')}` })
    }

    // Validate lat/lng if provided
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.body
    if (pickup_lat !== undefined) {
        if (typeof pickup_lat !== 'number' || pickup_lat < -90 || pickup_lat > 90) {
            return res.status(400).json({ error: 'Invalid pickup latitude' })
        }
    }
    if (pickup_lng !== undefined) {
        if (typeof pickup_lng !== 'number' || pickup_lng < -180 || pickup_lng > 180) {
            return res.status(400).json({ error: 'Invalid pickup longitude' })
        }
    }
    if (dropoff_lat !== undefined) {
        if (typeof dropoff_lat !== 'number' || dropoff_lat < -90 || dropoff_lat > 90) {
            return res.status(400).json({ error: 'Invalid dropoff latitude' })
        }
    }
    if (dropoff_lng !== undefined) {
        if (typeof dropoff_lng !== 'number' || dropoff_lng < -180 || dropoff_lng > 180) {
            return res.status(400).json({ error: 'Invalid dropoff longitude' })
        }
    }

    next()
}

// Validate review input
export const validateReviewInput = (req, res, next) => {
    const { ride_id, rating, comment } = req.body

    if (!ride_id) {
        return res.status(400).json({ error: 'ride_id is required' })
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' })
    }

    if (comment && (typeof comment !== 'string' || comment.length > 500)) {
        return res.status(400).json({ error: 'Comment must be a string under 500 characters' })
    }

    next()
}

// Validate payment input
export const validatePaymentInput = (req, res, next) => {
    const { ride_id, amount } = req.body

    if (!ride_id) {
        return res.status(400).json({ error: 'ride_id is required' })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 50000) {
        return res.status(400).json({ error: 'Invalid amount (must be 1-50000)' })
    }

    next()
}
