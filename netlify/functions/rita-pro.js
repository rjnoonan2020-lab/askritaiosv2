exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST" }) };

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const tool = (payload.tool || "").trim();
  const context = (payload.context || "").trim();

  if (!tool || !context) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing tool or context" }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server missing OPENAI_API_KEY" }) };
  }

  const toolPrompts = {
    daily_routine: `Create a practical weekly routine template for a retiree based on the user's context. Use simple headings and bullet points. Include: (1) a weekly overview grid in text form, (2) 5 anchor habits, (3) a social plan, (4) a small starter plan for next 7 days.`,
    purpose_projects: `Turn the user's context into 2 to 4 purpose-driven projects. For each project include: why it fits, first 3 steps, time estimate per week, and a simple success metric. End with a shortlist of 10 prompts to help refine interests.`,
    encore_work: `Propose 3 to 5 encore work paths based on the user's context. Include: what it could look like, best-fit strengths, how to test quickly, and a low-risk 14-day experiment. Include a networking outreach script at the end.`,
    relationship_plan: `Create a relationships plan based on the user's context. Include: key relationships to strengthen, weekly outreach cadence, conversation starters, ways to build new community, and one boundary recommendation.`,
    transition_plan_90: `Create a non-financial 30/60/90 day plan for retirement transition. Include: top priorities, weekly actions, and a short "watch-outs" section. End with 5 reflection questions.`
  };

  const toolInstruction = toolPrompts[tool];
  if (!toolInstruction) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown tool" }) };
  }

  const system = [
    "You are RITA, the AI guide for Third Act Advisors.",
    "You specialize in the non-financial side of retirement transition: purpose, identity, routines, relationships, health, meaning, and encore work.",
    "Tone: calm, structured, encouraging, practical.",
    "Avoid generic filler and avoid corporate jargon.",
    "Do not request sensitive personal data.",
    "Format: clean headings and bullet points. Avoid markdown symbols like ###."
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
          { role: "user", content: `User context:\n${context}\n\nTask:\n${toolInstruction}` }
        ],
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: data?.error?.message || "OpenAI request failed" }) };
    }

    const output = data?.choices?.[0]?.message?.content?.trim() || "";
    return { statusCode: 200, headers, body: JSON.stringify({ output }) };
  } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error calling OpenAI" }) };
  }
};
