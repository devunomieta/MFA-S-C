import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FORWARD_TO = "marysthriftservice@gmail.com"

serve(async (req) => {
    try {
        const authHeader = req.headers.get('x-webhook-secret')
        const secretToken = Deno.env.get('FUNCTION_SECRET_TOKEN')
        
        if (secretToken && authHeader !== secretToken) {
            console.error("Unauthorized inbound forwarder attempt")
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const payload = await req.json()
        const { from, to, subject, text, html } = payload.data

        const forwardTo = Deno.env.get('FORWARD_TO_EMAIL') || 'marysthriftservice@gmail.com'

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Forwarder <onboarding@resend.dev>',
                to: [forwardTo],
                subject: `[FWD] ${subject}`,
                html: `
          <p><strong>From:</strong> ${from}</p>
          <p><strong>To:</strong> ${to}</p>
          <hr/>
          ${html || text}
        `,
            }),
        })

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
