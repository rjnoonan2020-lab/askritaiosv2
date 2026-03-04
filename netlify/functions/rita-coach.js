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
  const shouldSuggestCommitments = history.length >= 4 && commitments.length === 0;

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
    coach: [
      "You are in an ongoing coaching conversation with a retiree.",
      "Your goal is to move from reflection toward action within 3-4 exchanges.",
      "After 2 exchanges, always suggest 1 to 3 specific weekly commitments.",
      "Commitments must be small, concrete actions completable within 7 days.",
      "Example commitments: 'Visit the Museum of Science and Industry website and find the volunteer page', 'Call one local museum this week to ask about volunteer opportunities', 'Spend 20 minutes researching electricity exhibits near Chicago'.",
      "Always include commitment_suggestions in your JSON response after the second exchange.",
      "Ask one focused follow-up question AND provide the commitments — do both together.",
      "Never just answer like a search engine. Always coach toward a next step."
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
      "Always end with a specific suggestion for next week."
    ].join(" "),
  };

  const instruction = modeInstructions[mode] || modeInstructions.coach;

  const jsonSchemaHint = {
    coach_message: "string — your coaching response",
    memory_update: { "optional_profile_fields": "values to remember about this user" },
    commitment_suggestions: ["up to 3 specific action strings"],
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
              `COMMITMENT_REQUIRED: ${shouldSuggestCommitments ? "YES — you MUST include commitment_suggestions in your response. This is mandatory. Suggest 1-3 specific actions the user can take this week based on the conversation so far." : "optional"}\n\n` +
              `CURRENT_PROFILE (may be empty): ${JSON.stringify(profile)}\n\n` +
              `CURRENT_COMMITMENTS: ${JSON.stringify(commitments)}\n\n` +
              `CONVERSATION_HISTORY (last 12 messages): ${JSON.stringify(history)}\n\n` +
              `USER_MESSAGE: ${userText}\n\n` +
              `Return JSON matching this shape (omit keys not needed):\n${JSON.stringify(jsonSchemaHint)}`
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
