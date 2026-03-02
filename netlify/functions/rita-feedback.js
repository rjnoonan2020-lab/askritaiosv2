exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST" }) };

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}

  // This shows up in Netlify function logs
  console.log("RITA_FEEDBACK", {
    tool: payload.tool,
    vote: payload.vote,
    note: payload.note,
  });

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
