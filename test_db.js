import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const email = `testuser_${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!'
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  console.log("User created:", authData.user.id);

  const { data: groupData, error: groupError } = await supabase.from('study_groups').insert({
    name: 'Test Group ' + Date.now(),
    subject: 'Math',
    is_public: true,
    created_by: authData.user.id
  }).select();

  if (groupError) {
    console.error("Group error:", groupError);
  } else {
    console.log("Group created:", groupData);
  }
}

test();
