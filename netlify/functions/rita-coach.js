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
  const focusArea = payload.focusArea || "General";

  const actionAreas = ["Activity", "Time", "Connections", "Finance & Home"];
  const isActionArea = actionAreas.includes(focusArea);

  const userMessageCount = history.filter(function(m) { return m.role === "user" || m.role === "you"; }).length;
  const commitThreshold = isActionArea ? 3 : 4;
  const areaCommitments = commitments.filter(function(c) { return c.area === focusArea; });
  const mustCommitFinal = userMessageCount >= commitThreshold && areaCommitments.length === 0;
  const commitCount = isActionArea ? "2 or 3" : "1 or 2";

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
    returning: [
      "The user is returning to the focus area: " + focusArea + ".",
      "You have access to their recent conversation history in this area.",
      "Generate a warm, personalized welcome back message that references something specific from their previous conversation.",
      "Ask a fresh follow-up question that moves the conversation forward from where they left off.",
      "Do NOT repeat the standard opener question. Make it feel like picking up a conversation with a trusted coach.",
      "Keep it to 2-3 sentences maximum."
    ].join(" "),
    coach: mustCommitFinal
      ? [
          "You have enough information to suggest commitments NOW.",
          "The user is focused on: " + focusArea + ".",
          isActionArea
            ? "This is an action-oriented topic. Suggest " + commitCount + " specific, concrete commitments completable within 7 days."
            : "This is a reflection-oriented topic. Suggest " + commitCount + " gentle, meaningful commitments — these may include journaling, a single conversation, or one small exploratory action.",
          "Keep your coach_message to one warm sentence of encouragement.",
          "You MUST include commitment_suggestions in your JSON. This is not optional.",
          "Do NOT ask another question. It is time to act."
        ].join(" ")
      : [
          "You are coaching a retiree focused on: " + focusArea + ".",
          isActionArea
            ? "This is an action-oriented topic. Ask one focused practical question to understand what specific steps or barriers the user is facing."
            : "This is a reflection-oriented topic. Ask one warm, open question that helps the user go deeper into what they're feeling or discovering.",
          "Keep your response concise and warm. One question only."
        ].join(" "),
    checkin: [
      "This is a weekly check-in for the focus area: " + focusArea + ".",
      "You will be given commitments with statuses: not_started, in_progress, done.",
      "Acknowledge what was completed with genuine warmth.",
      "For anything not started or in progress, normalize it — there is no failure here.",
      "Respond with encouragement and one reflection question.",
      "End by asking whether the user wants to keep, adjust, or reset their commitments."
    ].join(" "),
    keep_or_reset: [
      "User is deciding whether to keep, adjust, or reset commitments for: " + focusArea + ".",
      "If most are unfinished, normalize it warmly and offer either keeping one small commitment or resetting.",
      "If some are done, celebrate and offer keeping and refining the rest.",
      "If all are done, offer a new set of " + commitCount + " commitments appropriate for " + focusArea + ".",
      isActionArea
        ? "New commitments should be concrete, specific actions."
        : "New commitments can include reflection, journaling, or one small exploratory step.",
      "Always include commitment_suggestions in your response."
    ].join(" "),
  };

  const instruction = modeInstructions[mode] || modeInstructions.coach;

  const jsonSchemaHint = {
    coach_message: "string — your coaching response",
    memory_update: { "optional_profile_fields": "values to remember about this user" },
    commitment_suggestions: ["array of " + commitCount + " specific action strings — REQUIRED when mustCommit is true"],
    action: "optional string: reset_commitments | keep_commitments"
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              `MODE: ${mode}\n` +
              `FOCUS_AREA: ${focusArea}\n` +
              `AREA_TYPE: ${isActionArea ? "action-oriented" : "reflection-oriented"}\n` +
              `INSTRUCTIONS: ${instruction}\n\n` +
              `USER_MESSAGE_COUNT: ${userMessageCount}\n` +
              `MUST_SUGGEST_COMMITMENTS: ${mustCommitFinal ? "YES — commitment_suggestions is REQUIRED" : "not yet"}\n` +
              `COMMIT_COUNT_IF_SUGGESTING: ${commitCount}\n\n` +
              `CURRENT_PROFILE: ${JSON.stringify(profile)}\n\n` +
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
