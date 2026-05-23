const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

async function main() {
  const build = await client.actor('leadsbrary/google-maps-email-extractor').get();
  console.log(JSON.stringify(build, null, 2));
}
main();
