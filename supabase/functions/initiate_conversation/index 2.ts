// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InitiateConversationPayload = {
  uuid: string;
  message: string;
  message_type: "text" | "image";
  role: "user" | "assistant";
};

type ConversationRow = {
  id: string;
  created_at: string;
  chat_title: string | null;
  user: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function buildConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Νέα Συνομιλία";
  return normalized.length > 50 ? `${normalized.slice(0, 50)}...` : normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    );
  }

  let body: InitiateConversationPayload;

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { uuid, message, message_type, role } = body;

  if (!uuid || typeof uuid !== "string") {
    return json({ error: "`uuid` is required and must be a string" }, 400);
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return json({ error: "`message` is required and must be a non-empty string" }, 400);
  }

  if (message_type !== "text" && message_type !== "image") {
    return json({ error: "`message_type` must be either `text` or `image`" }, 400);
  }

  if (!role || typeof role !== "string") {
    return json({ error: "`role` is required and must be a string" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: conversation, error: conversationError } = await supabase
    .from("conversation")
    .insert({
      user: uuid,
      chat_title: buildConversationTitle(message),
    })
    .select("id, created_at, chat_title, user")
    .single<ConversationRow>();

  if (conversationError || !conversation) {
    console.error("Failed to create conversation:", conversationError);
    return json(
      {
        error: "Failed to create conversation",
        details: conversationError?.message ?? null,
      },
      500,
    );
  }

  const authorization = req.headers.get("Authorization");
  const apikey = req.headers.get("apikey") ?? anonKey ?? "";
  const chatPayload = {
    uuid,
    message,
    message_type,
    role,
    conversation_id: conversation.id,
  };

  let chatResponse: Response;

  try {
    chatResponse = await fetch(`${supabaseUrl}/functions/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apikey ? { apikey } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(chatPayload),
    });
  } catch (error) {
    console.error("Failed to call chat function:", error);
    return json(
      {
        error: "Conversation created, but calling chat function failed",
        conversation_id: conversation.id,
        conversation: {
          id: conversation.id,
          title: conversation.chat_title,
          chat_title: conversation.chat_title,
          updated_at: conversation.created_at,
          created_at: conversation.created_at,
          user: conversation.user,
        },
      },
      502,
    );
  }

  const chatData = await chatResponse.json().catch(() => null);

  if (!chatResponse.ok) {
    console.error("Chat function returned error:", chatData);
    return json(
      {
        error: "Conversation created, but chat function returned an error",
        conversation_id: conversation.id,
        conversation: {
          id: conversation.id,
          title: conversation.chat_title,
          chat_title: conversation.chat_title,
          updated_at: conversation.created_at,
          created_at: conversation.created_at,
          user: conversation.user,
        },
        chat_error: chatData,
      },
      502,
    );
  }

  return json({
    success: true,
    conversation_id: conversation.id,
    id: conversation.id,
    title: conversation.chat_title,
    chat_title: conversation.chat_title,
    updated_at: conversation.created_at,
    created_at: conversation.created_at,
    conversation: {
      id: conversation.id,
      title: conversation.chat_title,
      chat_title: conversation.chat_title,
      updated_at: conversation.created_at,
      created_at: conversation.created_at,
      user: conversation.user,
    },
    chat: chatData,
  });
});
