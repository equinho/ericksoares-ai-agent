// =====================================================
// WhatsApp AI Agent — Script de Teste
// Simula o payload que a Z-API enviaria para o webhook
// =====================================================
// Uso:
//   npx deno run --allow-net test.ts
//   ou
//   deno run --allow-net test.ts
//
// Para testar localmente, rode antes:
//   npx supabase functions serve whatsapp-webhook --env-file .env
// =====================================================

// ── Configuração ─────────────────────────────────────
// Altere para a URL da sua Edge Function deployada ou local
const EDGE_FUNCTION_URL =
  "http://localhost:54321/functions/v1/whatsapp-webhook";

// ── Payloads de Teste ────────────────────────────────

// 1. Mensagem normal de texto (deve ser processada)
const payloadMensagemTexto = {
  phone: "5511999999999",
  fromMe: false,
  type: "chat",
  body: "Olá, gostaria de saber mais sobre os serviços de vocês!",
  messageId: "ABCDEF123456",
  instanceId: "test-instance",
  text: {
    message: "Olá, gostaria de saber mais sobre os serviços de vocês!",
  },
};

// 2. Mensagem do próprio bot (deve ser ignorada)
const payloadFromMe = {
  phone: "5511999999999",
  fromMe: true,
  type: "chat",
  body: "Resposta automática do bot",
  text: {
    message: "Resposta automática do bot",
  },
};

// 3. Mensagem de imagem (deve ser ignorada)
const payloadImagem = {
  phone: "5511999999999",
  fromMe: false,
  type: "image",
  body: "",
  caption: "Uma foto qualquer",
};

// 4. Mensagem de áudio (deve ser ignorada)
const payloadAudio = {
  phone: "5511999999999",
  fromMe: false,
  type: "audio",
  body: "",
};

// ── Função de Teste ──────────────────────────────────
async function enviarTeste(
  nome: string,
  payload: Record<string, unknown>,
  esperado: string
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📧 TESTE: ${nome}`);
  console.log(`   Esperado: ${esperado}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(`   Status HTTP: ${response.status}`);
    console.log(`   Resposta:`, JSON.stringify(data, null, 2));

    // Validação
    if (response.status === 200) {
      console.log(`   ✅ Status 200 OK`);
    } else {
      console.log(`   ❌ Status inesperado: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`   ❌ Erro na requisição:`, (error as Error).message);
    return null;
  }
}

// ── Executar Testes ──────────────────────────────────
async function main() {
  console.log("🚀 Iniciando testes do WhatsApp AI Agent");
  console.log(`   URL: ${EDGE_FUNCTION_URL}`);
  console.log(`   Horário: ${new Date().toISOString()}`);

  // Teste 1: Mensagem de texto normal → deve processar e responder
  await enviarTeste(
    "Mensagem de texto normal",
    payloadMensagemTexto,
    "status: ok (processada pelo Gemini)"
  );

  // Teste 2: Mensagem fromMe → deve ignorar
  await enviarTeste(
    "Mensagem fromMe (do próprio bot)",
    payloadFromMe,
    "status: ignored, reason: fromMe"
  );

  // Teste 3: Mensagem de imagem → deve ignorar
  await enviarTeste(
    "Mensagem de imagem",
    payloadImagem,
    "status: ignored, reason: not_text"
  );

  // Teste 4: Mensagem de áudio → deve ignorar
  await enviarTeste(
    "Mensagem de áudio",
    payloadAudio,
    "status: ignored, reason: not_text"
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Todos os testes executados!");
  console.log(`${"=".repeat(60)}\n`);
}

main();
