
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmrssezhhznmvfflgefc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcnNzZXpoaHpubXZmZmxnZWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzY5NzQsImV4cCI6MjA4NDQxMjk3NH0.BGzHYKXGtpqnFORge-le20RjK46H3zshZWlvypB3A3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('Checking Notifications RLS results...');
  
  // We can't query pg_policies with anon key usually, 
  // but we can try to insert a test notification to see if it fails here too
  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: 'b9e86cf6-7b82-475b-b1e0-84ab74bac090', // The ID from the screenshot
      title: 'RLS TEST',
      message: 'Testing RLS from diagnostic script',
      type: 'general'
    }]);

  if (error) {
    console.log('RLS Check Failed as expected:', error.message, error.code);
  } else {
    console.log('RLS Check Succeeded (Surprisingly!)');
  }
}

checkRLS();
