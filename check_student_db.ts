
import { getSharedSupabaseClient } from './template/core/client.ts';

async function checkStudent() {
  const supabase = getSharedSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'sakthi123@gmail.com')
    .single();

  if (error) {
    console.error('Error fetching student:', error);
  } else {
    console.log('Student Profile:', JSON.stringify(data, null, 2));
  }

  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*');

  if (classesError) {
    console.error('Error fetching classes:', classesError);
  } else {
    console.log('Available Classes:', JSON.stringify(classes, null, 2));
  }
}

checkStudent();
