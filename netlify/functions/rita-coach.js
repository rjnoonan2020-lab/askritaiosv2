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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "Server missing OPENAI_API_KEY" }) };

  const mode = (payload.mode || "coach").trim();
  const userText = (payload.userText || "").trim();
  const profile = payload.profile || {};
  const commitments = Array.isArray(payload.commitments) ? payload.commitments : [];
  const history = Array.isArray(payload.history) ? payload.history : [];

  const system = [
    "You are RITA, the coaching companion for Third Act Advisors.",
    "Your job is to help retirees move forward with gentle encouragement and light accountability.",
    "Focus areas: meeting new people, exploring hobbies, exploring encore work, building routine and structure, relationship continuity.",
    "Tone: calm, warm, practical. No guilt. No tough love. No streak language.",
    "Do not request sensitive personal data.",
    "Return STRICT JSON only."
  ].join(" ");

  const modeInstructions = {
    coach: [
      "You are in an ongoing coaching conversation.",
      "Ask one good next question OR offer a short next-step suggestion.",
      "If appropriate, suggest 1 to 3 weekly commitments that are small and realistic.",
      "Commitments should be phrased as simple actions that can be done within 7 days."
    ].join(" "),
    checkin: [
      "This is a weekly check-in.",
      "You will be given commitments with statuses: not_started, in_progress, done.",
      "Respond with encouragement and one reflection question.",
      "End by asking whether the user wants to keep, adjust, or reset."
    ].join(" "),
    keep_or_reset: [
      "User is deciding whether to keep, adjust, or reset commitments.",
      "If most are unfinished, normalize it and offer either keeping one small commitment or resetting.",
      "If some are done, offer keeping and refining.",
      "If all are done, offer a slightly more ambitious set of 1 to 3 new commitments."
    ].join(" "),
  };

  const instruction = modeInstructions[mode] || modeInstructions.coach;

  // Ask model to output JSON with these fields
  const jsonSchemaHint = {
    coach_message: "string",
    profile_update: { "optional_profile_fields": "values" },
    commitment_suggestions: ["string up to 3"],
    action: "optional string: reset_commitments | keep_commitments"
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              `MODE: ${mode}\n` +
              `INSTRUCTIONS: ${instruction}\n\n` +
              `CURRENT_PROFILE (may be empty): ${JSON.stringify(profile)}\n\n` +
              `CURRENT_COMMITMENTS: ${JSON.stringify(commitments)}\n\n` +
              `RECENT_HISTORY: ${JSON.stringify(history)}\n\n` +
              `USER_MESSAGE: ${userText}\n\n` +
              `Return JSON matching this shape (keys can be omitted if not needed):\n${JSON.stringify(jsonSchemaHint)}`
          }
        ]
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: data?.error?.message || "OpenAI request failed" }) };
    }

    // Because we forced json_object, the content should be JSON
    const content = data?.choices?.[0]?.message?.content || "{}";
    let out = {};
    try { out = JSON.parse(content); } catch { out = { coach_message: "I’m here with you. What feels most important right now?" }; }

    return { statusCode: 200, headers, body: JSON.stringify(out) };
  } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error calling OpenAI" }) };
  }
};
