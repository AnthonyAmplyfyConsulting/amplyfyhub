import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

async function main() {
  try {
    console.log("Testing Anthropic Key...");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 10,
      messages: [{ role: "user", content: "Hello" }]
    });
    console.log("Success! Response:", msg.content[0].text);
  } catch (error) {
    console.error("Anthropic API Error:", error.message);
  }
}
main();
