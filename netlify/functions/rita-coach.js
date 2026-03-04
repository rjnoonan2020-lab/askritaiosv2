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
  const profile = payload.profile || {};const focusArea = payload.focusArea || "General";
  const commitments = Array.isArray(payload.commitments) ? payload.commitments : [];
  const history = Array.isArray(payload.history) ? payload.history : [];

  // Force commitments after 3 user messages
  const userMessageCount = history.filter(m => m.role === "user").length;
  const mustCommit = userMessageCount >= 3;

  const system = [
    "You are RITA, a warm and practical retirement transition coach for Third Act Advisors.",
    "Your job is to help retirees move forward with gentle encouragement and light accountability.",
    "Focus areas: identity beyond work, finding purpose and meaning, building new routines, relationships, hobbies, encore careers, volunteering, and contribution.",
    "Tone: calm, warm, practical, encouraging. No guilt. No tough love. No streak language.",
    "You are NOT a search engine. You are a coach. Always move the conversation toward action.",
    "Do not request sensitive personal data.",
    "Return STRICT JSON only — no markdown, no explanation outside the JSON."
  ].join(" ");

  const modeInstructions = {
    coach: mustCommit
      ? [
          "You have enough information to suggest commitments NOW.",
          "Based on the conversation so far, suggest exactly 2-3 specific, small weekly commitments.",
          "Commitments must be concrete actions completable within 7 days.",
          "Good examples based on this conversation: 'Check the coffee shop schedule online tonight', 'Plan to attend music night on Tuesday', 'Text one friend to join you at the coffee shop'.",
          "Keep your coach_message short — one warm sentence of encouragement plus the commitments.",
          "You MUST include commitment_suggestions in your JSON. This is not optional.",
          "Do NOT ask another question. It is time to act."
        ].join(" ")
      : [
          "You are in an ongoing coaching conversation with a retiree.",
          "Ask one warm, focused question to understand what matters most to them.",
          "After 3 user messages you will be required to suggest commitments, so gather what you need now.",
          "Keep responses concise and warm."
        ].join(" "),
    checkin: [
      "This is a weekly check-in.",
      "You will be given commitments with statuses: not_started, in_progress, done.",
      "Acknowledge what was completed with genuine warmth.",
      "For anything not started or in progress, normalize it — there is no failure here.",
      "Respond with encouragement and one reflection question.",
      "End by asking whether the user wants to keep, adjust, or reset their commitments."
    ].join(" "),
    keep_or_reset: [
      "User is deciding whether to keep, adjust, or reset commitments.",
      "If most are unfinished, normalize it warmly and offer either keeping one small commitment or resetting.",
      "If some are done, celebrate and offer keeping and refining the rest.",
      "If all are done, offer a slightly more ambitious set of 1 to 3 new commitments.",
      "Always include commitment_suggestions in your response.",
      "Always end with a specific suggestion for next week."
    ].join(" "),
  };

  const instruction = modeInstructions[mode] || modeInstructions.coach;

  const jsonSchemaHint = {
    coach_message: "string — your coaching response",
    memory_update: { "optional_profile_fields": "values to remember about this user" },
    commitment_suggestions: ["up to 3 specific action strings — REQUIRED when mustCommit is true"],
    action: "optional string: reset_commitments | keep_commitments"
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              `MODE: ${mode}\n` +
              `INSTRUCTIONS: ${instruction}\n\n` +
              `USER_MESSAGE_COUNT: ${userMessageCount}\n` +
              `MUST_SUGGEST_COMMITMENTS: ${mustCommit ? "YES — commitment_suggestions is REQUIRED in your response" : "not yet"}\n\n` +
              `FOCUS_AREA: The user has chosen to focus on "${focusArea}" today. Keep your coaching questions and commitment suggestions specifically relevant to this area.\n\n` +`CURRENT_PROFILE: ${JSON.stringify(profile)}\n\n` +
              `CURRENT_COMMITMENTS: ${JSON.stringify(commitments)}\n\n` +
              `CONVERSATION_HISTORY: ${JSON.stringify(history)}\n\n` +
              `USER_MESSAGE: ${userText}\n\n` +
              `Return JSON:\n${JSON.stringify(jsonSchemaHint)}`
          }
        ]
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: data?.error?.message || "OpenAI request failed" }) };
    }

    const content = data?.choices?.[0]?.message?.content || "{}";
    let out = {};
    try { out = JSON.parse(content); } catch { out = { coach_message: "I'm here with you. What feels most important right now?" }; }

    return { statusCode: 200, headers, body: JSON.stringify(out) };
  } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error calling OpenAI" }) };
  }
};
