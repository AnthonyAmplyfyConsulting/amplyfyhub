const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
async function main() {
  const actor = await client.actor('compass/crawler-google-places').get();
  const build = await client.build(actor.defaultRunOptions.build).get();
  console.log(build);
}
main();
