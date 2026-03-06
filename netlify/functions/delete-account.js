const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST" }) };

  // Get the user's JWT from the Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: "No token provided" }) };

  // Create a user-scoped client to verify the token
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Verify the user is who they say they are
  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid session" }) };

  // Delete all user data using service role client
  const sbAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Delete in order (child tables first)
    await sbAdmin.from("conversation_history").delete().eq("user_id", user.id);
    await sbAdmin.from("commitments").delete().eq("user_id", user.id);
    await sbAdmin.from("check_ins").delete().eq("user_id", user.id);
    await sbAdmin.from("profiles").delete().eq("id", user.id);

    // Delete the auth user itself
    const { error: deleteError } = await sbAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || "Delete failed" }) };
  }
};
