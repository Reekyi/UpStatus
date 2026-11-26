# UpStatus Normal 3.4.7 — mapa HTTP do runtime recuperado

**Baseline:** projeto original `dlfvkawaiqduhlazsszm`, Edge Function `upstatus`, implantação v480.  
**Cliente:** userscript Normal 3.4.7 extraído do mesmo runtime.  
**Uso:** referência para refatorar rotas sem alterar URLs, métodos, autorização ou respostas.

## 1. Distribuição e rotas públicas

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/upstatus.user.js` | Distribui o userscript embutido. |
| GET | `/health` | Retorna estado do serviço e versão. |
| GET | `/api/members` | Retorna membros publicados pelo handler. |
| GET | `/api/update-info` | Retorna versão e URL relativa de atualização. |
| GET | `/api/account?name=...` | Verifica se a conta existe e precisa de setup. |
| POST | `/api/setup` | Cria/configura acesso por meio do handler de login em modo setup. |
| POST | `/api/login` | Autenticação. |
| GET | `/api/me` | Retorna contexto de autenticação atual, inclusive quando não há sessão. |
| GET | `/lucca`, `/lucca.html` | Página do convidado Lucca. |
| GET | `/ycaro`, `/ycaro.html` | Página do convidado Ycaro. |

As rotas de convidado usam cookies próprios e não compartilham o mesmo fluxo de sessão do usuário normal.

## 2. Rotas autenticadas

Após resolver `contextName(req)`, o handler exige contexto válido para as rotas abaixo.

| Método | Rota | Handler | Notas |
|---|---|---|---|
| POST | `/api/logout` | revogação de sessão | Remove token hash e cache da sessão. |
| GET | `/api/health` | `healthRoute` | Saúde e métricas de sincronização. |
| GET/POST | `/api/status` | `statusRoute` | Método é tratado dentro do handler. |
| GET | `/api/history` | `historyRoute` | Histórico de status. |
| GET/POST | `/api/chat` | `chatRoute` | Histórico e envio de mensagem. |
| POST | `/api/chat/read` | `readRoute` | Recibos de leitura. |
| GET/POST | `/api/chat/typing` | `typingRoute` | Estado de digitação. |
| POST | `/api/chat/reaction` | `reactionRoute` | Reações. |
| PATCH | `/api/chat/:id` | `editRoute` | Edição de mensagem. |
| DELETE | `/api/chat/:id` | `deleteRoute` | Exclusão; runtime atual permite exclusão administrativa pelo nome Ricardo. |
| GET | `/api/profiles` | `profileRoute` | Mapa de perfis/avatares. |
| POST | `/api/profile/avatar` | `profileRoute` | Atualização de avatar. |
| POST | `/api/profile/avatar-upload-url` | `signedUploadRoute("avatar")` | Upload assinado de avatar. |
| POST | `/api/chat/upload-url` | `signedUploadRoute("chat")` | Upload assinado de anexo. |
| POST | `/api/chat/image` | `mediaRoute("image")` | Compatibilidade de upload legado. |
| POST | `/api/chat/document` | `mediaRoute("document")` | Compatibilidade de upload legado. |
| POST | `/api/chat/audio` | `mediaRoute("audio")` | Compatibilidade de upload legado. |
| GET/POST | `/api/remote-status` | `remoteRoute` | Comandos e resultados de status remoto. |
| POST | `/api/chat/clear` | bloco no dispatch | Restrito a Ricardo; limpa mensagens e tenta remover mídias. |

O cliente monta algumas rotas dinamicamente, portanto a lista de chamadas literais não cobre todos os caminhos. Os handlers acima foram lidos diretamente do runtime.

## 3. Rotas de convidado

| Método | Rota | Sessão |
|---|---|---|
| POST | `/api/lucca/login` | cookie `lucca_session` |
| GET | `/api/lucca/me` | cookie `lucca_session` |
| POST | `/api/lucca/heartbeat` | cookie `lucca_session` |
| POST | `/api/lucca/logout` | cookie `lucca_session` |
| POST | `/api/ycaro/login` | cookie `ycaro_session` |
| GET | `/api/ycaro/me` | cookie `ycaro_session` |
| POST | `/api/ycaro/heartbeat` | cookie `ycaro_session` |
| POST | `/api/ycaro/logout` | cookie `ycaro_session` |

As páginas Lucca/Ycaro têm HTML embutido no entrypoint. O HTML Ycaro foi verificado como idêntico ao arquivo `ycaro.html`; a página Lucca embutida foi verificada como idêntica ao `lucca-site/index.html` atual.

## 4. Contratos que não podem mudar na reorganização

- Paths e métodos HTTP.
- Ordem do dispatch e precedência entre rotas genéricas e específicas.
- Status HTTP e estrutura JSON de sucesso/erro.
- Cabeçalhos CORS e cache.
- Nomes de cookies e atributos `HttpOnly`, `SameSite`, `Secure` e `Path`.
- Cabeçalho `x-upstatus-token` e hash de sessão.
- Nomes de tabelas/colunas usados pelo backend.
- Bucket `chat-images` e `profile-images`.
- URLs, tópicos Realtime, eventos e identidade das funções Supabase.
- Regras de autorização atuais, mesmo quando uma regra parecer candidata a melhoria.

## 5. Separação entre refatoração e correção

O runtime atual tem comportamentos que podem merecer revisão independente, como fallback administrativo por nome em exclusão e validações de upload que diferem das candidatas mais novas. Não corrigir esses pontos durante a extração modular. Qualquer mudança deve ter PR próprio, teste específico e aprovação separada.
