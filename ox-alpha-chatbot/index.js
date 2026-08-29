import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OX_ALPHA_API_KEY,
  baseURL: "https://oxalpha.run/api/v1",
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: "ox-alpha",
      messages: [
        {
          role: "user",
          content: "Hello! Tell me who you are in one sentence.",
        },
      ],
    });

    console.log("\nOx Alpha Response:");
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("\nAPI Error:");
    console.error(error.message);
  }
}

main();