// Concurrency test: fire multiple RSVP requests in parallel
// Usage: node scripts/rsvpConcurrencyTest.js http://localhost:3000 EVENT_ID TOKEN1 TOKEN2 TOKEN3

const fetch = require("node-fetch");

async function rsvp(base, eventId, token, response) {
  const res = await fetch(`${base}/events/${eventId}/rsvp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response }),
  });
  const text = await res.text();
  return { status: res.status, body: safeJson(text) };
}

function safeJson(t) {
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  const base = process.argv[2] || "http://localhost:3000";
  const eventId = process.argv[3];
  const tokens = process.argv.slice(4);
  if (!eventId || tokens.length === 0) {
    console.error("Usage: node scripts/rsvpConcurrencyTest.js <baseUrl> <eventId> <token...>");
    process.exit(1);
  }

  console.log(`[concurrency] base=${base} eventId=${eventId} tokens=${tokens.length}`);

  // Mix responses to create pressure
  const choices = ["YES", "MAYBE", "YES", "YES", "NO"]; 
  const jobs = tokens.map((t, i) => rsvp(base, eventId, t, choices[i % choices.length]));
  const results = await Promise.allSettled(jobs);

  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      console.log(`#${idx + 1}`, r.value.status, r.value.body);
    } else {
      console.log(`#${idx + 1} ERR`, r.reason);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


