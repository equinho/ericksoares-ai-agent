// supabase/functions/whatsapp-webhook/index.ts
// Edge Function para processar mensagens do WhatsApp via Z-API + Gemini 2.5 Flash

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Variáveis de Ambiente ──────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const BOT_SYSTEM_PROMPT_FALLBACK = Deno.env.get("BOT_SYSTEM_PROMPT") ?? "Você é um assistente útil.";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

// ─── Cliente Supabase (com service_role para bypassar RLS) ──────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Constantes ─────────────────────────────────────────────────────
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GEMINI_TIMEOUT_MS = 25_000;
const MAX_HISTORY_MESSAGES = 20;

// ─── Helper: Buscar prompt do banco (fallback para env var) ─────────
async function getSystemPrompt(): Promise<string> {
  const { data } = await supabase
    .from("agent_settings")
    .select("value")
    .eq("key", "system_prompt")
    .maybeSingle();

  const dbPrompt = data?.value?.trim();
  if (dbPrompt) return dbPrompt;

  return BOT_SYSTEM_PROMPT_FALLBACK;
}

// ─── Helper: Buscar base de conhecimento ────────────────────────────
const MAX_KNOWLEDGE_CHARS = 200_000; // ~50k tokens, deixa espaço pro histórico

async function getKnowledgeContext(): Promise<string> {
  const { data } = await supabase
    .from("knowledge_files")
    .select("name, content");

  if (!data || data.length === 0) return "";

  let combined = "";
  for (const f of data) {
    const section = `### ${f.name}\n${f.content}\n\n`;
    if (combined.length + section.length > MAX_KNOWLEDGE_CHARS) {
      const remaining = MAX_KNOWLEDGE_CHARS - combined.length;
      if (remaining > 100) combined += section.slice(0, remaining) + "\n...[truncado]";
      break;
    }
    combined += section;
  }

  return "\n\n---\n## Base de Conhecimento\n\n" + combined;
}

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

// ─── Helper: Chamar Gemini 2.5 Flash ────────────────────────────────
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

// ─── Helper: Buscar ou criar conversa (protegido contra race condition) ──
async function getOrCreateConversation(phone: string): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("phone", phone)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    console.log("[DB] Conversa existente encontrada:", existing.id);
    return existing.id;
  }

  const { data: newConv, error: createError } = await supabase
    .from("conversations")
    .insert({ phone })
    .select("id")
    .single();

  // Violação do índice único parcial — outra request criou a conversa simultaneamente
  if (createError?.code === "23505") {
    const { data: raceConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("phone", phone)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (raceConv) {
      console.log("[DB] Conversa recuperada após race condition:", raceConv.id);
      return raceConv.id;
    }

    throw new Error("Falha ao obter conversa após conflito de inserção");
  }

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
  content: string,
  zapiMessageId?: string
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      ...(zapiMessageId ? { zapi_message_id: zapiMessageId } : {}),
    });

  if (error) {
    console.error("[DB] Erro ao salvar mensagem:", error.message);
  }
}

// ─── Helper: Extrair telefone do payload da Z-API ───────────────────
function extractPhone(payload: Record<string, unknown>): string {
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
  const text = (payload.text as Record<string, unknown>)?.message as string;
  if (text) return text;

  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.body === "string") return payload.body;

  return "";
}

// ─── Main Handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Validação do secret do webhook ──────────────────────────────
  if (WEBHOOK_SECRET) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (secret !== WEBHOOK_SECRET) {
      console.warn("[Webhook] Secret inválido — requisição ignorada");
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
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

    // ── 2. Extrair dados ──
    const phone = extractPhone(payload);
    const userMessage = extractText(payload);

    // ── 3. Ignorar se não for mensagem de texto ──
    // Z-API envia type="ReceivedCallback"; filtramos pela presença do texto
    if (!userMessage) {
      const messageType = payload.type || payload.messageType || "";
      console.log("[Webhook] Mensagem sem texto ignorada:", messageType);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not_text", type: messageType }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    const zapiMessageId = (payload.messageId as string) || (payload.id as string) || "";

    if (!phone) {
      console.error("[Webhook] Phone vazio no payload");
      return new Response(
        JSON.stringify({ status: "error", reason: "missing_phone" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 4. Deduplicação por messageId ──
    if (zapiMessageId) {
      const { data: duplicate } = await supabase
        .from("messages")
        .select("id")
        .eq("zapi_message_id", zapiMessageId)
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        console.log("[Webhook] Mensagem duplicada ignorada:", zapiMessageId);
        return new Response(
          JSON.stringify({ status: "ignored", reason: "duplicate" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[Webhook] Mensagem de ${phone}: "${userMessage}"`);

    // ── 5. Buscar ou criar conversa ──
    const conversationId = await getOrCreateConversation(phone);

    // ── 6. Buscar histórico ──
    const history = await getMessageHistory(conversationId);

    // ── 7. Montar array de mensagens para o Gemini ──
    const geminiMessages = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    geminiMessages.push({ role: "user", parts: [{ text: userMessage }] });

    // ── 8. Chamar Gemini ──
    const [systemPrompt, knowledgeContext] = await Promise.all([
      getSystemPrompt(),
      getKnowledgeContext(),
    ]);
    const fullSystemInstruction = systemPrompt + knowledgeContext;

    let botResponse: string;
    try {
      botResponse = await callGemini(geminiMessages, fullSystemInstruction);
      console.log(`[Gemini] Resposta: "${botResponse.substring(0, 100)}..."`);
    } catch (error) {
      const msg = (error as Error).message;
      console.error("[Gemini] Erro na chamada:", msg);
      return new Response(
        JSON.stringify({ status: "error", reason: "gemini_failed", detail: msg }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 9. Salvar mensagens no banco ──
    await saveMessage(conversationId, "user", userMessage, zapiMessageId);
    await saveMessage(conversationId, "assistant", botResponse);

    // ── 10. Enviar resposta via Z-API ──
    await sendZApiMessage(phone, botResponse);

    return new Response(
      JSON.stringify({ status: "ok", conversationId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Webhook] Erro geral:", (error as Error).message);
    return new Response(
      JSON.stringify({ status: "error", reason: (error as Error).message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
