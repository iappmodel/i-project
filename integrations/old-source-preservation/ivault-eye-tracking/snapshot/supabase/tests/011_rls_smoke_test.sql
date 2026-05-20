do $$
begin
  -- This file is mostly role-dependent.
  -- In Supabase, run role tests from API integration tests using real JWT/service roles.
  -- SQL-only tests cannot fully simulate auth.uid() unless you set request.jwt.claims.
  raise notice 'RLS policies created. Run API role tests separately.';
end $$;
