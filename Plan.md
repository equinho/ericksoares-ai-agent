# 🤖 WhatsApp AI Agent — Plano de Implementação

> Agente de IA de atendimento via WhatsApp usando Z-API + Supabase + Gemini 2.5 Flash

---

## Visão Geral do Fluxo

```text
Lead manda mensagem → Z-API recebe → Webhook → Edge Function
→ Busca histórico no Supabase → Monta payload → Gemini 2.5 Flash
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
- [x] Chamar API do Gemini 2.5 Flash (com timeout 25s)
- [x] Salvar mensagem do lead e resposta do bot
- [x] Enviar resposta via Z-API
- [x] Sempre retornar status 200 (mesmo em erro)

📄 Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

---

## ETAPA 3 — Deploy da Edge Function

- [x] Linkar projeto Supabase via CLI (`supabase link`)
- [x] Definir variáveis de ambiente (secrets):
  - [x] `GEMINI_API_KEY`
  - [x] `ZAPI_INSTANCE_ID`
  - [x] `ZAPI_TOKEN`
  - [x] `ZAPI_CLIENT_TOKEN`
  - [x] `BOT_SYSTEM_PROMPT`
  - [x] `WEBHOOK_SECRET`
- [x] Deploy da função (`supabase functions deploy whatsapp-webhook --no-verify-jwt`)
- [x] Confirmar que o deploy foi bem-sucedido

### Comandos para rodar

```powershell
# 1. Linkar o projeto
npx supabase link --project-ref SEU_PROJECT_REF

# 2. Setar variáveis de ambiente
npx supabase secrets set GEMINI_API_KEY="..." ZAPI_INSTANCE_ID="..." ZAPI_TOKEN="..." ZAPI_CLIENT_TOKEN="..." BOT_SYSTEM_PROMPT="..." WEBHOOK_SECRET="..."

# 3. Fazer deploy
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

> ⚠️ `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis automaticamente nas Edge Functions.

---

## ETAPA 4 — Configuração do Webhook na Z-API

- [x] Acessar painel da Z-API (<https://app.z-api.io>)
- [x] Ir na instância conectada
- [x] Navegar até a seção **Webhooks**
- [x] Configurar o webhook **"Received"** (mensagens recebidas) com a URL abaixo
- [ ] Confirmar que mensagens recebidas disparam o webhook corretamente
- [ ] Testar enviando uma mensagem para o número conectado

```text
https://xisjxjlmadrclyuffjeo.supabase.co/functions/v1/whatsapp-webhook?secret=Er89101214@
```

---

## ETAPA 5 — Teste do Sistema

- [x] Criar script de teste local (`test.ts`) — 4 cenários de teste
- [x] Testar com payload simulado da Z-API (curl direto para a Edge Function em produção)
- [x] Verificar se o Gemini responde corretamente
- [x] Verificar se a resposta chega via Z-API
- [ ] Verificar se a mensagem aparece no banco de dados / dashboard em tempo real

📄 Arquivo: `test.ts`

### Como rodar os testes

```powershell
# 1. Subir a Edge Function localmente
npx supabase functions serve whatsapp-webhook --env-file .env

# 2. Em outro terminal, rodar o teste
npx deno run --allow-net test.ts
```

---

## ETAPA 6 — Checklist Final

- [x] Banco de dados com tabelas criadas e funcionando
- [x] Edge Function deployada e acessível
- [x] Variáveis de ambiente configuradas
- [x] Dashboard web no ar — <https://dashboard-liart-phi-86.vercel.app>
- [x] Webhook da Z-API apontando para a Edge Function
- [ ] Teste de ponta a ponta: mensagem → Gemini → resposta automática (Gemini responde via curl, mas bot não respondeu no WhatsApp — Z-API a verificar)
- [ ] Verificar logs da Edge Function sem erros

---

## ETAPA 7 — Melhorias Identificadas (pós-análise)

### Bugs / Riscos

- [x] **Race condition na criação de conversa** — índice único parcial `UNIQUE(phone) WHERE status = 'active'` + tratamento do erro `23505` na Edge Function.
- [x] **Sem deduplicação de mensagens** — coluna `zapi_message_id` com índice único na tabela `messages`; webhook checa duplicata antes de processar.
- [x] **`touchConversation` redundante** — função e chamada removidas; o trigger do banco já cuida disso.

### Segurança

- [x] **Sem validação do webhook** — variável `WEBHOOK_SECRET` valida query param `?secret=` em toda requisição recebida.

📄 Migration: `database/002_improvements.sql`

---

## ETAPA 8 — Dashboard Web (Next.js + shadcn/ui + Supabase Realtime)

- [x] Criar projeto Next.js 16 em `dashboard/`
- [x] Configurar shadcn/ui + Tailwind (tema escuro)
- [x] Autenticação por senha via `proxy.ts` + cookie httpOnly
- [x] Página de login
- [x] Lista de conversas (sidebar) com status, phone, lead_name, contagem de msgs
- [x] Thread de mensagens com agrupamento por data
- [x] Realtime: novas mensagens aparecem ao vivo via Supabase Realtime
- [x] Painel de detalhes: editar lead_name, notas, mudar status
- [x] Migration de RLS para leitura anon (`database/003_dashboard_rls.sql`)
- [x] Deploy na Vercel — <https://dashboard-liart-phi-86.vercel.app>
- [x] Configurar env vars na Vercel (`vercel env add` — **não usar `-e` flag**, não persiste)
- [x] Corrigir bug de senha com newline — usar `printf` em vez de `echo` ao pipar para `vercel env add`
- [x] Corrigir `middleware.ts` → `proxy.ts` (Next.js 16 renomeou o arquivo de middleware)
- [x] Corrigir erro de Suspense no `/login` — `useSearchParams()` exige boundary `<Suspense>`
- [x] Login funcionando em produção

📄 Diretório: `dashboard/`

### Env vars necessárias na Vercel

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `DASHBOARD_PASSWORD` | Você escolhe |

### Passos para deploy

```bash
# 1. Rodar migration no Supabase SQL Editor
# database/003_dashboard_rls.sql

# 2. Fazer deploy na Vercel
cd dashboard
vercel --prod
```

---

## ETAPA 9 — Painel de Controle do Agente

### 9.1 — Editor de Prompt
- [x] Página `/settings/prompt` no dashboard
- [x] Textarea com o conteúdo atual (lido da tabela `agent_settings`)
- [x] Botão "Salvar" com estado de loading e confirmação ✓
- [x] Histórico de versões com botão "Restaurar" (painel lateral)
- [x] Atalho Ctrl+S / ⌘S para salvar
- [x] Indicador de alterações não salvas
- [x] Edge Function lê prompt do banco (fallback para env var)

📄 Migration: `database/004_agent_settings.sql`

---

### 9.2 — Base de Conhecimento (Memória do Bot)
- [x] Tabela `knowledge_files` (id, name, content, file_size, created_at)
- [x] Página `/settings/knowledge` com upload e listagem
- [x] Upload de `.txt` e `.md` via drag & drop ou clique (até 10MB)
- [x] Upload via Route Handler (`/api/knowledge/upload`) — evita limite do Server Action
- [x] Preview do conteúdo em painel lateral ao clicar no arquivo
- [x] Deletar arquivos individualmente
- [x] Edge Function injeta os arquivos no contexto do Gemini
- [x] Truncar contexto da knowledge base em 200K chars para não exceder limite de tokens do Gemini

📄 Migration: `database/005_knowledge_files.sql`

---

### 9.3 — Respostas Rápidas (Templates)
- [x] Tabela `quick_replies` (id, title, content, created_at)
- [x] Página `/settings/quick-replies` com CRUD completo
- [x] Adicionar, editar inline e deletar com confirmação visual

📄 Migration: `database/006_quick_replies.sql`

---

### 9.4 — Analytics
- [x] Página `/analytics` no dashboard
- [x] Cards: total de leads, ativas, fechadas, mensagens hoje
- [x] Gráfico de barras: mensagens por dia (últimos 14 dias)

---

### 9.5 — Navegação (NavRail)
- [x] Nav rail lateral com ícones (Conversas / Analytics / Configurações)
- [x] Tooltips ao hover, estado ativo destacado
- [x] Layout com route group `(app)` — sem duplicação de código

---

### Pendente

| Feature | Complexidade |
|---|---|
| Modo Humano / Takeover (pausar bot por conversa) | Média |
| Blacklist de números | Baixa |

---

## Bugs Resolvidos (pós-ETAPA 9)

- [x] **Upload de arquivo falha ("This page couldn't load")** — substituído Server Action por Route Handler (`/api/knowledge/upload`) com FormData; Server Actions têm limite de body size mesmo com `bodySizeLimit` configurado
- [x] **PostgreSQL rejeita bytes nulos** — conteúdo do arquivo sanitizado com `.replace(/\u0000/g, "")` antes do INSERT
- [x] **Bot ignorava todas as mensagens** — Z-API envia `type: "ReceivedCallback"`, não `"text"` ou `"chat"`; filtro corrigido para checar presença do texto extraído
- [x] **Gemini retornava erro 400 (token limit exceeded)** — knowledge base sem truncamento causava payloads de >1M tokens; limitado a 200K chars por request

---

## Próximos Passos (Retomar Desenvolvimento)

| Feature | Complexidade |
| --- | --- |
| Modo Humano / Takeover (pausar bot por conversa) | Média |
| Blacklist de números | Baixa |
| Verificar mensagens no dashboard em tempo real | Baixa |

---

*Última atualização: 19/04/2026*
