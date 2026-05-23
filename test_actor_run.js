const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = env.match(/APIFY_API_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';

const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token });

async function main() {
  try {
    const actor = await client.actor('pkjb7rRAAnLYLwqeo').get();
    console.log("Example run input:");
    console.log(actor.exampleRunInput);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();
