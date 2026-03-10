/**
 * CabBooking API Test Script
 * 
 * Tests all API endpoints against the running backend.
 * Run: node tests/api-test.js
 * 
 * Prerequisites:
 *   - Backend running on localhost:5000
 *   - At least one user synced to Supabase
 */

const BASE_URL = 'http://localhost:5000/api'

// Counters
let passed = 0
let failed = 0
const results = []

function log(status, test, detail = '') {
    const icon = status === 'PASS' ? '✅' : '❌'
    results.push({ status, test, detail })
    console.log(`${icon} ${test}${detail ? ' — ' + detail : ''}`)
    if (status === 'PASS') passed++
    else failed++
}

async function request(endpoint, options = {}) {
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        })
        const data = await res.json()
        return { status: res.status, ok: res.ok, data }
    } catch (err) {
        return { status: 0, ok: false, data: { error: err.message } }
    }
}

// ==========================================
// TEST SUITE
// ==========================================

async function runTests() {
    console.log('\n🧪 CabBooking API Test Suite')
    console.log('═'.repeat(50))

    // ------- HEALTH -------
    console.log('\n📋 Health Check')
    {
        const res = await request('/health')
        if (res.ok && res.data.status === 'ok') {
            log('PASS', 'GET /api/health', `status: ${res.data.status}, websocket: ${res.data.websocket}`)
        } else {
            log('FAIL', 'GET /api/health', 'Server not responding')
            console.log('\n⚠️  Backend is not running! Start it with: cd backend && npm run dev')
            return
        }
    }

    // ------- USERS -------
    console.log('\n👤 User Endpoints')
    {
        // Sync user (public endpoint)
        const testUser = {
            clerk_id: 'test_user_' + Date.now(),
            email: `test${Date.now()}@example.com`,
            name: 'Test Rider',
            role: 'rider',
        }

        const syncRes = await request('/users/sync', {
            method: 'POST',
            body: JSON.stringify(testUser),
        })
        if (syncRes.status === 201 && syncRes.data.user) {
            log('PASS', 'POST /api/users/sync (create)', `user: ${syncRes.data.user.name}`)
        } else {
            log('FAIL', 'POST /api/users/sync (create)', JSON.stringify(syncRes.data))
        }

        // Sync again (update)
        testUser.name = 'Updated Rider'
        const updateRes = await request('/users/sync', {
            method: 'POST',
            body: JSON.stringify(testUser),
        })
        if (updateRes.ok && updateRes.data.user?.name === 'Updated Rider') {
            log('PASS', 'POST /api/users/sync (update)', 'name updated correctly')
        } else {
            log('FAIL', 'POST /api/users/sync (update)', JSON.stringify(updateRes.data))
        }

        // Sync without required fields
        const badSync = await request('/users/sync', {
            method: 'POST',
            body: JSON.stringify({ name: 'No ID' }),
        })
        if (badSync.status === 400) {
            log('PASS', 'POST /api/users/sync (validation)', 'correctly rejects missing clerk_id')
        } else {
            log('FAIL', 'POST /api/users/sync (validation)', `expected 400, got ${badSync.status}`)
        }

        // Get drivers (public)
        const driversRes = await request('/users/drivers')
        if (driversRes.ok && Array.isArray(driversRes.data.drivers)) {
            log('PASS', 'GET /api/users/drivers', `found ${driversRes.data.drivers.length} driver(s)`)
        } else {
            log('FAIL', 'GET /api/users/drivers', JSON.stringify(driversRes.data))
        }
    }

    // ------- AUTH -------
    console.log('\n🔒 Authentication')
    {
        // No token
        const noAuth = await request('/users/profile')
        if (noAuth.status === 401) {
            log('PASS', 'GET /api/users/profile (no token)', 'correctly returns 401')
        } else {
            log('FAIL', 'GET /api/users/profile (no token)', `expected 401, got ${noAuth.status}`)
        }

        // Bad token
        const badAuth = await request('/users/profile', {
            headers: { Authorization: 'Bearer invalid_token' },
        })
        if (badAuth.status === 401) {
            log('PASS', 'GET /api/users/profile (bad token)', 'correctly returns 401')
        } else {
            log('FAIL', 'GET /api/users/profile (bad token)', `expected 401, got ${badAuth.status}`)
        }

        // No token on rides
        const noAuthRides = await request('/rides', { method: 'POST', body: JSON.stringify({}) })
        if (noAuthRides.status === 401) {
            log('PASS', 'POST /api/rides (no token)', 'correctly returns 401')
        } else {
            log('FAIL', 'POST /api/rides (no token)', `expected 401, got ${noAuthRides.status}`)
        }
    }

    // ------- RIDES -------
    console.log('\n🚗 Ride Endpoints')
    {
        // Get available rides (requires auth but let's test the endpoint exists)
        const availRes = await request('/rides/available', {
            headers: { Authorization: 'Bearer invalid' },
        })
        // Should return 401 since bad token
        if (availRes.status === 401) {
            log('PASS', 'GET /api/rides/available (auth check)', 'requires authentication')
        } else {
            log('FAIL', 'GET /api/rides/available (auth check)', `got ${availRes.status}`)
        }
    }

    // ------- REVIEWS -------
    console.log('\n⭐ Review Endpoints')
    {
        // Get driver reviews (public)
        const reviewsRes = await request('/reviews/driver/00000000-0000-0000-0000-000000000000')
        if (reviewsRes.ok && Array.isArray(reviewsRes.data.reviews)) {
            log('PASS', 'GET /api/reviews/driver/:id', `found ${reviewsRes.data.reviews.length} review(s)`)
        } else {
            log('FAIL', 'GET /api/reviews/driver/:id', JSON.stringify(reviewsRes.data))
        }

        // Submit review without auth
        const noAuthReview = await request('/reviews', {
            method: 'POST',
            body: JSON.stringify({ ride_id: 'test', rating: 5 }),
        })
        if (noAuthReview.status === 401) {
            log('PASS', 'POST /api/reviews (no auth)', 'correctly requires auth')
        } else {
            log('FAIL', 'POST /api/reviews (no auth)', `expected 401, got ${noAuthReview.status}`)
        }
    }

    // ------- PAYMENTS -------
    console.log('\n💳 Payment Endpoints')
    {
        // Payment history without auth
        const noAuthPayment = await request('/payments/history')
        if (noAuthPayment.status === 401) {
            log('PASS', 'GET /api/payments/history (no auth)', 'correctly requires auth')
        } else {
            log('FAIL', 'GET /api/payments/history (no auth)', `expected 401, got ${noAuthPayment.status}`)
        }

        // Create payment without auth
        const noAuthCreate = await request('/payments/create', {
            method: 'POST',
            body: JSON.stringify({ ride_id: 'test' }),
        })
        if (noAuthCreate.status === 401) {
            log('PASS', 'POST /api/payments/create (no auth)', 'correctly requires auth')
        } else {
            log('FAIL', 'POST /api/payments/create (no auth)', `expected 401, got ${noAuthCreate.status}`)
        }
    }

    // ------- SUMMARY -------
    console.log('\n' + '═'.repeat(50))
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
    if (failed === 0) {
        console.log('🎉 All tests passed!\n')
    } else {
        console.log(`⚠️  ${failed} test(s) failed. Check the output above.\n`)
    }
}

runTests()
