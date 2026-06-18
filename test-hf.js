const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config({ path: "server/.env" });
const client = new InferenceClient(process.env.HF_TOKEN);
(async () => {
    try {
        const stream = client.chatCompletionStream({
            model: "google/gemma-4-12B",
            messages: [{ role: "user", content: "Halo" }]
        });
        for await (const chunk of stream) { console.log(chunk); }
    } catch(e) {
        console.error("HF Error:", e.message);
    }
})();
