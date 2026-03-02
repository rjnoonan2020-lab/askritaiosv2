// netlify/functions/ask-rita.js

exports.handler = async (event) => {
  // Basic CORS headers (safe even if you don't need cross-domain yet)
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Use POST" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const question = (payload.question || "").trim();
  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing question" }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server missing OPENAI_API_KEY" }),
    };
  }

  const system = [
    "You are RITA, a helpful retirement transition guide.",
    "You provide practical, encouraging guidance on the non-financial side of retirement: purpose, identity, routines, relationships, health, and optional return-to-work or encore career planning.",
    "Keep answers structured, plain English, and actionable.",
    "Include a short checklist and 2-4 follow-up questions at the end.",
  ].join(" ");

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: data?.error?.message || "OpenAI request failed",
        }),
      };
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || "";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error calling OpenAI" }),
    };
  }
};
