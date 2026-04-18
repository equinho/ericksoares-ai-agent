# 🤖 WhatsApp AI Agent — Plano de Implementação

> Agente de IA de atendimento via WhatsApp usando Z-API + Supabase + Gemini 2.0 Flash

---

## Visão Geral do Fluxo

```
Lead manda mensagem → Z-API recebe → Webhook → Edge Function
→ Busca histórico no Supabase → Monta payload → Gemini 2.0 Flash
→ Salva resposta → Devolve via Z-API → Lead recebe resposta
```

---

## ETAPA 1 — Banco de Dados (Supabase SQL)

- [x] Criar tabela `conversations` (id, phone, created_at, updated_at, status, lead_name, notes)
- [x] Criar tabela `messages` (id, conversation_id, role, content, created_at)
- [x] Criar índice em `conversations(phone)`
- [x] Criar índice em `messages(conversation_id)`
- [x] Habilitar RLS nas duas tabelas
- [x] Criar policy permissiva para `service_role`
- [x] Criar trigger para auto-update do `updated_at`
- [x] **Rodar o script SQL no Supabase SQL Editor**

📄 Arquivo: `database/001_create_tables.sql`

---

## ETAPA 2 — Edge Function (Supabase)

- [x] Criar função `whatsapp-webhook` em TypeScript
- [x] Receber POST da Z-API
- [x] Ignorar mensagens `fromMe === true`
- [x] Ignorar mensagens que não sejam `text` ou `chat`
- [x] Extrair phone e texto da mensagem
- [x] Buscar ou criar conversation no banco
- [x] Buscar últimas 20 mensagens do histórico
- [x] Montar payload com system prompt + histórico + nova mensagem
- [x] Chamar API do Gemini 2.0 Flash (com timeout 25s)
- [x] Salvar mensagem do lead e resposta do bot
- [x] Atualizar `updated_at` da conversation
- [x] Enviar resposta via Z-API
- [x] Sempre retornar status 200 (mesmo em erro)

📄 Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

---

## ETAPA 3 — Deploy da Edge Function

- [ ] Linkar projeto Supabase via CLI (`supabase link`)
- [ ] Definir variáveis de ambiente (secrets):
  - [ ] `GEMINI_API_KEY`
  - [ ] `ZAPI_INSTANCE_ID`
  - [ ] `ZAPI_TOKEN`
  - [ ] `ZAPI_CLIENT_TOKEN`
  - [ ] `BOT_SYSTEM_PROMPT`
- [ ] Deploy da função (`supabase functions deploy whatsapp-webhook --no-verify-jwt`)
- [ ] Confirmar que o deploy foi bem-sucedido

### Comandos para rodar:

```powershell
# 1. Linkar o projeto
npx supabase link --project-ref SEU_PROJECT_REF

# 2. Setar variáveis de ambiente
npx supabase secrets set GEMINI_API_KEY="..." ZAPI_INSTANCE_ID="..." ZAPI_TOKEN="..." ZAPI_CLIENT_TOKEN="..." BOT_SYSTEM_PROMPT="..."

# 3. Fazer deploy
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

> ⚠️ `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis automaticamente nas Edge Functions.

---

## ETAPA 4 — Configuração do Webhook na Z-API

- [ ] Acessar painel da Z-API (https://app.z-api.io)
- [ ] Ir na instância conectada
- [ ] Navegar até a seção **Webhooks**
- [ ] Configurar o webhook **"Received"** (mensagens recebidas) com a URL:
  ```
  https://{SEU_PROJECT_REF}.supabase.co/functions/v1/whatsapp-webhook
  ```
- [ ] Salvar configuração
- [ ] Testar enviando uma mensagem para o número conectado

---

## ETAPA 5 — Teste do Sistema

- [ ] Criar script de teste local (`test.ts`)
- [ ] Testar com payload simulado da Z-API
- [ ] Verificar se a mensagem aparece no banco de dados
- [ ] Verificar se o Gemini responde corretamente
- [ ] Verificar se a resposta chega via Z-API

---

## ETAPA 6 — Checklist Final

- [ ] Banco de dados com tabelas criadas e funcionando
- [ ] Edge Function deployada e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook da Z-API apontando para a Edge Function
- [ ] Teste de ponta a ponta: mensagem → resposta automática
- [ ] Logs da Edge Function sem erros

---

## 📌 Próximo Passo

**→ ETAPA 3: Deploy da Edge Function**

Preciso dos valores das variáveis de ambiente para montar os comandos.

---

*Última atualização: 17/04/2026*
