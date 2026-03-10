// Fare calculation based on distance and ride type
export function calculateFare(distanceKm, rideType = 'standard') {
  const rates = {
    bike: { baseFare: 20, perKm: 8, minFare: 30 },
    standard: { baseFare: 50, perKm: 15, minFare: 80 },
    premium: { baseFare: 100, perKm: 25, minFare: 150 },
  }

  const rate = rates[rideType] || rates.standard
  const fare = rate.baseFare + (distanceKm * rate.perKm)
  return Math.max(fare, rate.minFare)
}

// Calculate distance between two lat/lng points (Haversine formula)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Radius of Earth in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100 // Round to 2 decimals
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

// Format currency
export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Generate a unique ride OTP (4 digits)
export function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
