import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

serve(async (req) => {
    try {
        const payload = await req.json()
        const { record } = payload

        // 1. Get student profile for the push token
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', record.user_id)
            .single()

        if (profileError || !profile?.push_token) {
            return new Response(JSON.stringify({ message: 'No push token found' }), { status: 200 })
        }

        // 2. Format the message for Expo
        const message = {
            to: profile.push_token,
            sound: 'default',
            title: record.title,
            body: record.message,
            data: {
                ...record.metadata,
                notificationId: record.id
            },
        }

        // 3. Send to Expo
        const response = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        })

        const result = await response.json()

        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }
})
