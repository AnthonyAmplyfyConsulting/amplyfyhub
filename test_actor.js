const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
async function main() {
  try {
    const run = await client.actor('chieftools/b2b-linkedin-lead-generator').call({
      searchStringsArray: ['Plumbers in Austin TX'],
      searchTerms: ['Plumbers in Austin TX'],
      keywords: 'Plumbers in Austin TX',
      queries: ['Plumbers in Austin TX'],
      query: 'Plumbers in Austin TX',
      search: 'Plumbers in Austin TX',
      keyword: 'Plumbers in Austin TX',
      maxCrawledPlacesPerSearch: 10,
      maxResults: 10,
      limit: 10,
      maxItems: 10,
      language: 'en',
      countryCode: 'us',
    });
    console.log("Success", run);
  } catch (err) {
    console.error("Error calling actor:", err);
  }
}
main();
