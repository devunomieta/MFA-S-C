import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FORWARD_TO = "marysthriftservice@gmail.com"

serve(async (req) => {
    try {
        const payload = await req.json()

        // Resend Inbound Webhook payload contains the email details
        const { from, to, subject, text, html } = payload.data

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Forwarder <onboarding@resend.dev>', // Change to your domain after validation
                to: [FORWARD_TO],
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
