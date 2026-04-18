// supabase/functions/whatsapp-webhook/index.ts
// Edge Function para processar mensagens do WhatsApp via Z-API + Gemini 2.0 Flash

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Variáveis de Ambiente ──────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const BOT_SYSTEM_PROMPT = Deno.env.get("BOT_SYSTEM_PROMPT") ?? "Você é um assistente útil.";

// ─── Cliente Supabase (com service_role para bypassar RLS) ──────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Constantes ─────────────────────────────────────────────────────
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_TIMEOUT_MS = 25_000;
const MAX_HISTORY_MESSAGES = 20;

// ─── Helper: Enviar mensagem via Z-API ──────────────────────────────
async function sendZApiMessage(phone: string, message: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[Z-API] Erro ao enviar mensagem:", response.status, body);
  } else {
    console.log("[Z-API] Mensagem enviada com sucesso para", phone);
  }
}

// ─── Helper: Chamar Gemini 2.0 Flash ────────────────────────────────
async function callGemini(
  messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API erro ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini retornou resposta vazia ou formato inesperado");
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Helper: Buscar ou criar conversa ───────────────────────────────
async function getOrCreateConversation(phone: string): Promise<string> {
  // Buscar conversa existente para este telefone
  const { data: existing, error: fetchError } = await supabase
    .from("conversations")
    .select("id")
    .eq("phone", phone)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing && !fetchError) {
    console.log("[DB] Conversa existente encontrada:", existing.id);
    return existing.id;
  }

  // Criar nova conversa
  const { data: newConv, error: createError } = await supabase
    .from("conversations")
    .insert({ phone })
    .select("id")
    .single();

  if (createError || !newConv) {
    throw new Error(`Erro ao criar conversa: ${createError?.message}`);
  }

  console.log("[DB] Nova conversa criada:", newConv.id);
  return newConv.id;
}

// ─── Helper: Buscar histórico de mensagens ──────────────────────────
async function getMessageHistory(
  conversationId: string
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (error) {
    console.error("[DB] Erro ao buscar histórico:", error.message);
    return [];
  }

  return data ?? [];
}

// ─── Helper: Salvar mensagem no banco ───────────────────────────────
async function saveMessage(
  conversationId: string,
  role: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content });

  if (error) {
    console.error("[DB] Erro ao salvar mensagem:", error.message);
  }
}

// ─── Helper: Atualizar updated_at da conversa ───────────────────────
async function touchConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    console.error("[DB] Erro ao atualizar conversa:", error.message);
  }
}

// ─── Helper: Extrair telefone do payload da Z-API ───────────────────
function extractPhone(payload: Record<string, unknown>): string {
  // Z-API envia o telefone em diferentes campos dependendo da versão
  const phone =
    (payload.phone as string) ||
    (payload.from as string) ||
    (payload.chatId as string) ||
    "";

  // Remover sufixos como @c.us ou @s.whatsapp.net
  return phone.replace(/@.*$/, "");
}

// ─── Helper: Extrair texto do payload da Z-API ─────────────────────
function extractText(payload: Record<string, unknown>): string {
  // O campo text pode estar em diferentes locais
  const text = (payload.text as Record<string, unknown>)?.message as string;
  if (text) return text;

  // Fallback para campo message diretamente
  if (typeof payload.message === "string") return payload.message;

  // Fallback para body
  if (typeof payload.body === "string") return payload.body;

  return "";
}

// ─── Main Handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Aceitar apenas POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    console.log("[Webhook] Payload recebido:", JSON.stringify(payload));

    // ── 1. Ignorar mensagens enviadas pelo próprio bot ──
    if (payload.fromMe === true) {
      console.log("[Webhook] Mensagem fromMe ignorada");
      return new Response(JSON.stringify({ status: "ignored", reason: "fromMe" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 2. Ignorar mensagens que não sejam de texto ──
    const messageType = payload.type || payload.messageType || "";
    if (messageType !== "text" && messageType !== "chat") {
      console.log("[Webhook] Tipo de mensagem ignorado:", messageType);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not_text", type: messageType }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Extrair dados ──
    const phone = extractPhone(payload);
    const userMessage = extractText(payload);

    if (!phone || !userMessage) {
      console.error("[Webhook] Phone ou mensagem vazio:", { phone, userMessage });
      return new Response(
        JSON.stringify({ status: "error", reason: "missing_phone_or_message" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Webhook] Mensagem de ${phone}: "${userMessage}"`);

    // ── 4. Buscar ou criar conversa ──
    const conversationId = await getOrCreateConversation(phone);

    // ── 5. Buscar histórico ──
    const history = await getMessageHistory(conversationId);

    // ── 6. Montar array de mensagens para o Gemini ──
    // Converter histórico para formato Gemini (role: user/model)
    const geminiMessages = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Adicionar a nova mensagem do lead
    geminiMessages.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    // ── 7. Chamar Gemini ──
    let botResponse: string;
    try {
      botResponse = await callGemini(geminiMessages, BOT_SYSTEM_PROMPT);
      console.log(`[Gemini] Resposta: "${botResponse.substring(0, 100)}..."`);
    } catch (error) {
      console.error("[Gemini] Erro na chamada:", (error as Error).message);
      // Retornar 200 mesmo assim para a Z-API não reenviar
      return new Response(
        JSON.stringify({ status: "error", reason: "gemini_failed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ── 8. Salvar mensagens no banco ──
    await saveMessage(conversationId, "user", userMessage);
    await saveMessage(conversationId, "assistant", botResponse);

    // ── 9. Atualizar updated_at da conversa ──
    await touchConversation(conversationId);

    // ── 10. Enviar resposta via Z-API ──
    await sendZApiMessage(phone, botResponse);

    // ── 11. Retornar 200 ──
    return new Response(
      JSON.stringify({ status: "ok", conversationId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Webhook] Erro geral:", (error as Error).message);
    // Sempre retornar 200 para a Z-API não reenviar
    return new Response(
      JSON.stringify({ status: "error", reason: (error as Error).message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
