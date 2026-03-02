export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let payload = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const question = (payload.question || "").trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const system = [
    "You are RITA, a helpful retirement transition guide.",
    "You provide practical, encouraging guidance on the non-financial side of retirement: purpose, identity, routines, relationships, health, and optional return-to-work or encore career planning.",
    "Keep answers structured, plain English, and actionable.",
    "Include a short checklist and 2-4 follow-up questions at the end."
  ].join(" ");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question }
        ]
      })
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return new Response(JSON.stringify({
        error: data?.error?.message || "OpenAI request failed"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error calling OpenAI" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
