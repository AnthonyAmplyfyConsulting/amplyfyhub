const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = env.match(/APIFY_API_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';

const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token });

async function main() {
  try {
    const run = await client.actor('pkjb7rRAAnLYLwqeo').call({
      searchQueries: ["Plumbers in Austin TX"],
      maxResults: 2
    });
    console.log("Success:", run.id);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();
