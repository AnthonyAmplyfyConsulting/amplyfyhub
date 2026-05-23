const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
async function main() {
  try {
    const actor = await client.actor('pkjb7rRAAnLYLwqeo').get();
    console.log("Actor ID:", actor.id);
    console.log("Actor Name:", actor.name);
    console.log("Actor Username:", actor.username);
    console.log("Example Input:", actor.exampleRunInput);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();
