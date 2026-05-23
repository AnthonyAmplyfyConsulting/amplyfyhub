const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
async function main() {
  const actor = await client.actor('chieftools/b2b-linkedin-lead-generator').get();
  console.log(actor.exampleRunInput);
}
main();
