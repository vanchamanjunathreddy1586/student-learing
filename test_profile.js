import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_PUBLISHABLE_KEY);

async function testProfileSave() {
  console.log("Creating test user...");
  const email = `test_user_${Date.now()}@example.com`;
  const password = "testPassword123!";

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  console.log("Signed in successfully. JWT:", authData.session?.access_token ? "Exists" : "None");

  const userId = authData.user.id;
  console.log("User ID:", userId);

  console.log("Attempting to UPSERT profile...");
  const { data: profileData, error: profileError } = await supabase
    .from('student_profiles')
    .upsert({
      user_id: userId,
      full_name: "Test User",
      email: email,
      year: "2nd Year",
      college: "Test Institute of Technology",
      profile_completed: true,
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error("Profile UPSERT Error:", profileError);
  } else {
    console.log("Profile UPSERT Success!", profileData);
  }

  // Clean up if we want, but tests are good
}

testProfileSave();
