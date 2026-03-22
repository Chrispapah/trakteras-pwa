// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { formatInTimeZone } from "https://esm.sh/date-fns-tz@3.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedToken: { token: string; expires: number } | null = null;

type ChatPayload = {
  uuid: string;
  message: string;
  message_type?: "text" | "image";
  role?: "user" | "assistant";
  conversation_id?: string | null;
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expires > now + 60) {
    return cachedToken.token;
  }

  const clientEmail = Deno.env.get("GOOGLE_SA_CLIENT_EMAIL") || "";
  const privateKey = (Deno.env.get("GOOGLE_SA_PRIVATE_KEY") || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GOOGLE_SA_CLIENT_EMAIL or GOOGLE_SA_PRIVATE_KEY");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/dialogflow",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const b64 = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  const input = `${b64(header)}.${b64(payload)}`;
  const binaryKey = atob(privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, ""));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(binaryKey, (char) => char.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(input),
  );

  const jwt = `${input}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.access_token) {
    throw new Error(`Google Auth Error: ${JSON.stringify(data)}`);
  }

  cachedToken = { token: data.access_token, expires: now + data.expires_in };
  return data.access_token;
}

async function callDialogflowCX(
  sessionId: string,
  text: string,
  params: { uuid: string; current_time: string; session_id: string },
): Promise<string> {
  const projectId = Deno.env.get("GOOGLE_PROJECT_ID");
  const location = Deno.env.get("DIALOGFLOW_LOCATION");
  const agentId = Deno.env.get("DIALOGFLOW_AGENT_ID");

  if (!projectId || !location || !agentId) {
    throw new Error("Missing Dialogflow environment variables");
  }

  const url =
    `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${agentId}/sessions/${sessionId}:detectIntent`;
  const token = await getGoogleAccessToken();

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryInput: {
        text: { text },
        languageCode: "el",
      },
      queryParams: {
        parameters: params,
      },
    }),
  });

  const raw = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`Dialogflow error: ${JSON.stringify(raw)}`);
  }

  const messages = raw?.queryResult?.responseMessages ?? [];
  const finalReply = messages
    .map((entry: { text?: { text?: string[] } }) => entry.text?.text?.[0])
    .filter(Boolean)
    .join("\n");

  return finalReply || "OK.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: "Missing Supabase environment variables" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const payload = await req.json() as ChatPayload;
    const {
      uuid,
      message,
      message_type = "text",
      role = "user",
      conversation_id = null,
    } = payload;

    if (!uuid || typeof uuid !== "string" || !message || typeof message !== "string") {
      return jsonResponse(400, { error: "Missing message or uuid" });
    }

    const validatedTime = formatInTimeZone(
      new Date(),
      "Europe/Athens",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );

    let sessionId = conversation_id || null;

    if (!sessionId) {
      const { data: existingSession, error: sessionError } = await supabase
        .from("sessions")
        .select("session_id")
        .eq("uuid", uuid)
        .order("session_id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.error("[DB] Error fetching session:", sessionError);
      }

      sessionId = existingSession?.session_id || crypto.randomUUID();
    }

    const [sessionUpsert, userMessageInsert] = await Promise.all([
      supabase.from("sessions").upsert(
        {
          session_id: sessionId,
          agent_id: Deno.env.get("DIALOGFLOW_AGENT_ID"),
          uuid,
        },
        { onConflict: "session_id" },
      ),
      supabase.from("Chat").insert({
        uuid,
        role,
        message: String(message),
        message_type,
        sessionid: sessionId,
        conversation_id,
      }),
    ]);

    if (sessionUpsert.error) {
      console.error("[DB] Failed to upsert session:", sessionUpsert.error);
      return jsonResponse(500, { error: "Failed to upsert session" });
    }

    if (userMessageInsert.error) {
      console.error("[DB] Failed to insert user chat message:", userMessageInsert.error);
      return jsonResponse(500, { error: "Failed to insert user message" });
    }

    let replyText = "Παρακαλώ στείλτε κείμενο μαζί με την εικόνα.";

    if (message_type === "text") {
      replyText = await callDialogflowCX(sessionId, String(message), {
        uuid,
        session_id: sessionId,
        current_time: validatedTime,
      });
    }

    const { error: botInsertError } = await supabase.from("Chat").insert({
      uuid,
      role: "assistant",
      message: replyText,
      message_type: "text",
      sessionid: sessionId,
      conversation_id,
    });

    if (botInsertError) {
      console.error("[DB] Failed to insert bot reply:", botInsertError);
      return jsonResponse(500, { error: "Failed to insert assistant message" });
    }

    return jsonResponse(200, {
      uuid,
      session_id: sessionId,
      conversation_id,
      message: replyText,
      response: replyText,
      replyText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[chat] Unhandled exception:", error);
    return jsonResponse(500, { error: message });
  }
});
