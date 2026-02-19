-- Custom Access Token Hook
-- Injects per-BU role map into JWT app_metadata claims
-- Called by Supabase Auth on every token issuance (login, refresh)

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE  -- reads DB, doesn't write
AS $$
DECLARE
  claims         JSONB;
  bu_memberships JSONB;
BEGIN
  -- Build array of {id, role} objects for all BU memberships
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', business_unit_id, 'role', role)
      ORDER BY business_unit_id
    ),
    '[]'::jsonb
  )
  INTO bu_memberships
  FROM public.user_business_units
  WHERE user_id = (event->>'user_id');

  claims := event->'claims';

  -- Ensure app_metadata exists
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject business_units array into app_metadata
  claims := jsonb_set(claims, '{app_metadata,business_units}', bu_memberships);

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permissions: supabase_auth_admin must be able to execute the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from roles that should NOT call the hook directly
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- CRITICAL: The hook's SELECT on user_business_units needs explicit permission
-- because RLS is enabled on that table. Add a policy for supabase_auth_admin.
CREATE POLICY "supabase_auth_admin_select" ON public.user_business_units
FOR SELECT TO supabase_auth_admin
USING (true);

-- Also grant the underlying table access
GRANT SELECT ON TABLE public.user_business_units TO supabase_auth_admin;
