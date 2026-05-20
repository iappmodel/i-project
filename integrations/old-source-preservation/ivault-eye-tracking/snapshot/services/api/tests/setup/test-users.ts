import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false
  }
});

export async function signInTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session || !data.user) {
    throw new Error(`Failed to sign in test user: ${error?.message ?? "No session returned"}`);
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

export async function getPrimaryUserToken() {
  return signInTestUser(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
}

export async function getSecondUserToken() {
  return signInTestUser(process.env.SECOND_TEST_USER_EMAIL!, process.env.SECOND_TEST_USER_PASSWORD!);
}

export async function getAdminUserToken() {
  return signInTestUser(process.env.ADMIN_USER_EMAIL!, process.env.ADMIN_USER_PASSWORD!);
}
