const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');

const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function main() {
  const { data: contacts, error: fetchErr } = await supabase.from('outreach_contacts').select('user_id').limit(1);
  const uid = contacts && contacts.length > 0 ? contacts[0].user_id : null;
  
  if (!uid) {
    console.error("Could not find a user_id from existing contacts. Cannot insert.");
    return;
  }

  const { data, error } = await supabase
    .from('outreach_contacts')
    .insert([{
      user_id: uid,
      name: 'Tony Pernerewski',
      business: 'Tony Testing LLC',
      email: 'tonypernerewski@gmail.com',
      phone: '4757313866',
      email_status: 'pending',
      source: 'manual_test'
    }])
    .select();
    
  if (error) console.error("Error inserting:", error);
  else console.log("Success! Inserted:", data);
}
main();
