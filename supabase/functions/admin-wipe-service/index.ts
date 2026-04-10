import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Check admin status of caller
    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('is_admin, is_superadmin')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.is_admin) throw new Error('Forbidden: Admins only')

    const payload = await req.json()
    const { scope, dataOnly } = payload

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
      if (!callerProfile.is_superadmin) throw new Error('Forbidden: Superadmin access required for this scope')
      query = query.eq('is_superadmin', false)
    } else {
      throw new Error('Invalid scope: ' + scope)
    }

    const { data: targets, error: targetError } = await query
    if (targetError) throw targetError

    const targetIds = (targets || []).map(t => t.id)
    if (targetIds.length === 0) {
        return new Response(JSON.stringify({ message: 'No users found to wipe', success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Perform wipe
    if (dataOnly) {
       // Delete from profiles (cascades down to other user data)
       const { error: deleteError } = await serviceClient.from('profiles').delete().in('id', targetIds)
       if (deleteError) throw deleteError
    } else {
       // Delete from auth (cascades down to profiles and other data)
       for (const id of targetIds) {
          const { error: authError } = await serviceClient.auth.admin.deleteUser(id)
          if (authError) console.error(`Failed to delete auth user ${id}:`, authError)
       }
    }

    // Log the action in activity_logs
    await serviceClient.from('activity_logs').insert({
        user_id: user.id,
        action: 'BULK_USER_WIPE',
        details: {
            scope,
            data_only: dataOnly,
            user_count: targetIds.length
        },
        ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'edge-function'
    })

    return new Response(JSON.stringify({ success: true, count: targetIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Wipe Service Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
