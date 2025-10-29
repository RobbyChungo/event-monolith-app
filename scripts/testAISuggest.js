// Quick test script for the AI suggester endpoint
// Usage:
//   node scripts/testAISuggest.js http://localhost:3000 "Suggest 3 community health events"
//   node scripts/testAISuggest.js http://localhost:3000 --topic health

const fetch = require("node-fetch");

async function main() {
  const base = process.argv[2] || "http://localhost:3000";
  const arg3 = process.argv[3] || "";
  const arg4 = process.argv[4] || "";

  let body = {};
  if (arg3 === "--topic") {
    body.topic = arg4 || "education";
  } else if (arg3) {
    body.prompt = arg3;
  } else {
    body.topic = "technology";
  }

  const res = await fetch(`${base}/ai/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    console.log(res.status, JSON.parse(text));
  } catch {
    console.log(res.status, text);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


