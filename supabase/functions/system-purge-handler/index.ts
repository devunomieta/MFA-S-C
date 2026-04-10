import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        console.error("Missing Authorization header")
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`Auth header received: ${authHeader.substring(0, 20)}...`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    console.log("Wipe service invoked. Checking user session...")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
        console.error("Authentication failed:", authError)
        return new Response(JSON.stringify({ error: 'Unauthorized', message: authError?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`Authenticated as ${user.email}. Checking privileges...`)
    
    // Check admin status of caller
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin, is_superadmin')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile?.is_admin) {
        console.error("Privilege check failed:", profileError || "Not an admin")
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    const { scope, dataOnly } = payload

    console.log(`Payload received - Scope: ${scope}, DataOnly: ${dataOnly}`)

    // Create service client for admin actions
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Identify target users
    let query = serviceClient.from('profiles').select('id, email, is_admin, is_superadmin')
    
    if (scope === 'non-admin') {
      query = query.eq('is_admin', false)
    } else if (scope === 'all-except-super') {
      if (!callerProfile.is_superadmin) {
          return new Response(JSON.stringify({ error: 'Forbidden: Superadmin access required for this scope' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      query = query.eq('is_superadmin', false)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid scope: ' + scope }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`Starting wipe with scope: ${scope}, dataOnly: ${dataOnly}`)
    const { data: targets, error: targetError } = await query
    if (targetError) throw targetError

    const targetIds = (targets || []).map(t => t.id)
    console.log(`Found ${targetIds.length} target users to wipe.`)

    if (targetIds.length === 0) {
        return new Response(JSON.stringify({ message: 'No users found to wipe', success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Perform wipe
    if (dataOnly) {
       console.log("Performing DATA ONLY wipe...")
       const { error: deleteError } = await serviceClient.from('profiles').delete().in('id', targetIds)
       if (deleteError) throw deleteError
    } else {
       console.log("Performing COMPLETE AUTH wipe...")
       for (const id of targetIds) {
          const { error: authError } = await serviceClient.auth.admin.deleteUser(id)
          if (authError) console.error(`Failed to delete auth user ${id}:`, authError)
       }
    }

    // Log the action in activity_logs
    try {
        console.log("Logging bulk wipe action...")
        const { error: logError } = await serviceClient.from('activity_logs').insert({
            user_id: user.id,
            action: 'BULK_USER_WIPE',
            details: {
                scope,
                data_only: dataOnly,
                user_count: targetIds.length
            },
            ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'edge-function'
        })
        if (logError) console.error("Activity log insert failed (non-blocking):", logError)
    } catch (logCatch) {
        console.error("Failed to log activity (non-blocking):", logCatch)
    }

    console.log("Wipe completed successfully.")
    return new Response(JSON.stringify({ success: true, count: targetIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Wipe Service Critical Error:", error)
    const errorMsg = error.message || "An unexpected error occurred during the wipe process"
    return new Response(JSON.stringify({ error: errorMsg, message: errorMsg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
