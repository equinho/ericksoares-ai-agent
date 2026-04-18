# 🔒 Segurança — Checklist de Vulnerabilidades

> Este documento é o **guia de segurança do projeto**. Toda implementação nova deve ser comparada contra este checklist antes de ser considerada pronta.

---

## 🔑 1. Gerenciamento de Secrets e API Keys

- [x] **Nenhuma API key hardcoded no código-fonte**
  - Todas as chaves lidas via `Deno.env.get()` (variáveis de ambiente do Supabase)
  - Verificado em: `supabase/functions/whatsapp-webhook/index.ts`
- [x] **Arquivo `.env.example` presente** com nomes das variáveis (sem valores reais)
- [x] **Arquivo `.gitignore` configurado** para ignorar `.env`, `.env.local`, `.env.production`
- [ ] **Secrets setados via `supabase secrets set`** (não em arquivos commitados)
- [ ] **Rotação periódica de chaves** — definir processo para trocar chaves a cada 90 dias

> [!CAUTION]
> **NUNCA** commite arquivos `.env` com valores reais. Use apenas `supabase secrets set` para definir variáveis em produção.

---

## 🛡️ 2. Autenticação e Autorização

- [x] **RLS (Row Level Security) habilitado** nas tabelas `conversations` e `messages`
- [x] **Policies restritas ao `service_role`** — nenhum acesso público direto ao banco
- [x] **Edge Function usa `SUPABASE_SERVICE_ROLE_KEY`** (disponível automaticamente, nunca exposta ao cliente)
- [ ] **JWT verification desabilitado intencionalmente** (`--no-verify-jwt`) — necessário para receber webhooks da Z-API
  - Mitigação: validar origem do webhook (ver seção 5)

> [!WARNING]
> A Edge Function roda com `--no-verify-jwt` porque a Z-API não envia JWT. Isso significa que qualquer pessoa que conheça a URL pode enviar requests. Implemente validação de origem.

---

## 🌐 3. Validação de Input

- [x] **Verificação de `fromMe`** — ignora mensagens do próprio bot (evita loops)
- [x] **Verificação de tipo** — aceita apenas mensagens `text` e `chat`
- [x] **Verificação de campos vazios** — rejeita se `phone` ou `userMessage` estiver vazio
- [ ] **Sanitização de input** — sanitizar texto antes de salvar no banco
  - Prevenir SQL injection (Supabase client já faz isso via prepared statements ✅)
  - Prevenir XSS se o conteúdo for exibido em algum frontend futuro
- [ ] **Limite de tamanho de mensagem** — rejeitar mensagens acima de 4096 caracteres
- [ ] **Rate limiting por telefone** — evitar abuso/spam (ex: máximo 30 mensagens/minuto por phone)

---

## 🔐 4. Segurança de Dados

- [x] **Dados sensíveis** — números de telefone armazenados no banco com RLS
- [ ] **Criptografia em repouso** — Supabase já criptografa em repouso (verificar plano)
- [ ] **Política de retenção de dados** — definir por quanto tempo manter conversas
  - Sugestão: criar job para arquivar/deletar conversas com `status = 'closed'` após 90 dias
- [ ] **Backup automático** — verificar se backups do Supabase estão habilitados
- [ ] **Logs sensíveis** — verificar que logs da Edge Function não expõem dados pessoais em produção
  - ⚠️ Atualmente logamos o payload completo do webhook — **remover em produção**

> [!IMPORTANT]
> O `console.log` do payload completo em `[Webhook] Payload recebido` deve ser removido ou reduzido em produção para não expor dados pessoais nos logs.

---

## 🕵️ 5. Proteção do Webhook (Endpoint Público)

- [ ] **Validar IP de origem da Z-API** — aceitar requests apenas de IPs da Z-API
- [ ] **Validar Client-Token no header** — verificar se o request contém um token secreto
  - Implementar: header personalizado que a Z-API envia e a Edge Function valida
- [ ] **Implementar idempotência** — evitar processar a mesma mensagem duas vezes
  - Usar `messageId` da Z-API como chave de deduplicação

---

## ⏱️ 6. Resiliência e Disponibilidade

- [x] **Timeout na chamada ao Gemini** — 25 segundos com `AbortController`
- [x] **Retorno 200 em caso de erro** — evita reenvio pela Z-API
- [ ] **Circuit breaker** — se o Gemini falhar N vezes consecutivas, pausar chamadas por X minutos
- [ ] **Mensagem de fallback** — enviar mensagem padrão ao lead quando o Gemini estiver indisponível
  - Ex: "Desculpe, estou com dificuldades técnicas. Tente novamente em alguns minutos."
- [ ] **Monitoramento de erros** — integrar com serviço de alertas (Sentry, Logflare, etc.)

---

## 📋 7. Checklist Rápido por Etapa

Use esta tabela para validar cada etapa contra os critérios de segurança:

| Etapa | Critérios de Segurança | Status |
|-------|----------------------|--------|
| 1 — Banco | RLS habilitado, policies restritivas, sem dados públicos | ✅ |
| 2 — Edge Function | Sem secrets no código, validação de input, tratamento de erro | ✅ |
| 3 — Deploy | Secrets via CLI, `.env` não commitado, JWT desabilitado com mitigação | ⬜ |
| 4 — Webhook Z-API | Validação de origem, token de verificação | ⬜ |
| 5 — Teste | Usar dados fictícios, não expor secrets nos testes | ⬜ |
| 6 — Checklist Final | Revisão completa de todos os pontos acima | ⬜ |

---

## 🔄 Processo de Revisão

> Toda vez que uma nova feature for implementada:
> 1. Abra este arquivo
> 2. Verifique cada seção relevante
> 3. Marque os itens que foram atendidos
> 4. Documente qualquer exceção ou mitigação
> 5. Se algum item crítico (🔴) não for atendido, **NÃO faça deploy**

---

*Última atualização: 17/04/2026*
