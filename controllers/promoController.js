import supabase from '../config/supabase.js'

// POST /api/promo/validate — Validate a promo code
export const validatePromo = async (req, res) => {
    try {
        const { code } = req.body

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Promo code is required' })
        }

        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase().trim())
            .single()

        if (error || !promo) {
            return res.status(404).json({ error: 'Invalid promo code' })
        }

        // Check if promo is active
        if (!promo.is_active) {
            return res.status(400).json({ error: 'This promo code has expired' })
        }

        // Check expiry date
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return res.status(400).json({ error: 'This promo code has expired' })
        }

        // Check usage limit
        if (promo.max_uses && promo.times_used >= promo.max_uses) {
            return res.status(400).json({ error: 'This promo code has reached its usage limit' })
        }

        res.json({
            valid: true,
            code: promo.code,
            discount_type: promo.discount_type, // 'percentage' or 'flat'
            discount_value: promo.discount_value,
            max_discount: promo.max_discount || null,
            description: promo.description || '',
        })

    } catch (error) {
        console.error('Promo validation error:', error.message)
        res.status(500).json({ error: 'Failed to validate promo code' })
    }
}

// Increment promo usage (called internally after ride is created with promo)
export const usePromoCode = async (code) => {
    try {
        const { data: promo } = await supabase
            .from('promo_codes')
            .select('times_used')
            .eq('code', code)
            .single()

        if (promo) {
            await supabase
                .from('promo_codes')
                .update({ times_used: (promo.times_used || 0) + 1 })
                .eq('code', code)
        }
    } catch (err) {
        console.error('Use promo error:', err.message)
    }
}
