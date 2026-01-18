import { openrouter } from "./lib/openrouter.js";

async function run() {
    const response = await openrouter.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
            { role: "user", content: "Say hello again so I know this works." }
        ],
    });

    console.log(response.choices[0].message.content);
}

run().catch(console.error);
