# UpStatus — auditoria independente de QA
**Data:** 2026-11-17 08:43 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Escopo:** Normal, Team Lite, Sale Smartly, chat, presença, voz, compartilhamento de tela, comandos remotos, Realtime, RLS/grants, SECURITY DEFINER, Storage, Edge Functions, workflows e gates de release.

> Este relatório é uma inspeção read-only e não autoriza merge, deploy, release, publicação de userscript, mudança de flags/secrets, migrations ou alteração de permissões.

## Vocabulário de evidência
- **CI PASS/FAIL:** resultado de workflow no SHA exato indicado; não equivale a teste manual.
- **Inspeção de código/catálogo:** leitura estática de fontes, bundles implantados, logs e metadados PostgreSQL.
- **Manual pendente:** exige navegador Sale Smartly/Tampermonkey e validação humana.
- **Bloqueado:** dependência impede obter evidência válida.
- **Não verificado:** não houve teste ou a configuração não está exposta ao conector.

## 1. Refs e integridade do GitHub

### Heads observados
| Ref | SHA |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `3c56e4a02ce35e57ab59da7cfc4995d37c0ab34f` |

### Heads das PRs obrigatórias
| PR | Branch | SHA | Estado |
|---|---|---|---|
| #74 | `chore/continuity-foundation` | `dcaf6a072546eda0089e0cee4018c3047011f600` | aberta, Draft |
| #75 | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta, Draft |
| #76 | `team-lite/signaling-transport-candidate` | `00a578e9174e08238a1289a35feb02d171625421` | aberta, Draft |
| #82 | `qa/release-readiness-2026-11-04-master` | `3c56e4a02ce35e57ab59da7cfc4995d37c0ab34f` | aberta, Draft |

#76 contém #75 como ancestral, com 330 commits adicionais e nenhuma divergência para trás. Não tratar as duas como entregas independentes.

As branches `master`, `develop` e `team-lite-official` retornaram `protected=false`; a API de rulesets retornou lista vazia. Isso deixa sem evidência uma barreira obrigatória de review/checks antes de integração. Não foi possível consultar diretamente o endpoint de proteção da branch QA pelo caminho com slash; não atribuo um estado não verificado a ela. As quatro PRs obrigatórias não têm reviews humanas.

### Documento de prontidão
Li o blob integral de `docs/RELEASE_READINESS.md` na branch QA: 1.046.356 caracteres e 8.423 linhas. A última seção de revalidação dentro do documento é **2026-11-15 06:30 UTC**. O checkpoint está desatualizado em relação às evidências de 17/11. Preservei o documento-base e registrei esta rodada em arquivo novo, sem sobrescrever alterações concorrentes.

## 2. CI — resultados por SHA exato

### PR #74 — Normal
- HEAD `dcaf6a0`.
- Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): **PASS**.
- Signaling Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): **PASS**.
- Log do Smoke: **136/136 verificações autenticadas** aprovadas; chamadas WebRTC, voz, compartilhamento de tela, mesh de três participantes, teardown, recuperação de sala/voice attempt, rate limit distribuído (90 aceitos + 1 HTTP 429) e recibos de leitura atômicos.
- O passo “Verify distributed setup-invite issuance rate limit” foi **SKIPPED**. A verificação de consumo atômico de convite passou, mas isso não prova limite de emissão no Normal.

### PR #75 — Team Lite baseline
- HEAD `7bbf9b9`.
- Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): **PASS histórico**.
- O job executou apenas “Check candidate scripts and version metadata”. Não é validação de integração, voz, tela ou backend.

### PR #76 — Team Lite candidate
- HEAD `00a578e`.
- Job de contratos de upload assinado: **PASS**.
- Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): **FAIL** no passo de autenticação do endpoint isolado. O endpoint respondeu HTTP 402 em vez de 401/405, com a mensagem `exceed_edge_functions_invocations_quota`.
- Playwright, full-IIFE, integração autenticada, concorrência de signaling, recibos e verificações posteriores foram **SKIPPED**. Isso é bloqueio de infraestrutura, não reprovação funcional comprovada do Team Lite.

### PR #82 — QA
- HEAD `3c56e4a`.
- Validate [44041450009](https://github.com/Reekyi/UpStatus/actions/runs/44041450009): **FAIL**.
- Log exato: `Built UpStatus 3.4.7 / TEST 3.4.7`, depois `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`.
- A master contém uma asserção antiga que exige `/upstatus/upstatus.user.js`; o build/artefato validado no merge ref não satisfaz esse contrato. O erro é herdado do build/validator, não um teste funcional do conteúdo Markdown. Nenhum código de produto foi alterado pela QA.

## 3. Produção — logs, Edge Functions e versões

Os projetos produção e laboratório reportam `ACTIVE_HEALTHY`, mas isso não significa que as rotas de aplicação estejam saudáveis.

### HTTP 402 em produção
A agregação de logs de Edge Functions da janela consultada encontrou **77.945 respostas HTTP 402**, com eventos até **2026-11-17 08:38:43 UTC**:

| Rota | HTTP 402 |
|---|---:|
| `GET /api/chat` | 41.638 |
| `GET /api/status` | 18.110 |
| `GET /api/remote-status` | 18.092 |
| `GET /api/me` | 33 |
| `GET /api/members` | 33 |
| `GET /api/account?name=Ricardo` | 20 |
| `GET /api/account?name=Lohan` | 7 |
| `GET /api/account?name=Guilherme` | 6 |
| `GET /upstatus.user.js` | 6 |

As rotas essenciais continuam retornando 402 nesta execução. O código causal específico em produção não foi identificado; não copiar a causa do laboratório para produção.

### Quota do laboratório
O projeto `bfpjtfqlnypisxljoxkb` tem 48 respostas HTTP 402 no intervalo observado, com mensagem explícita `exceed_edge_functions_invocations_quota`. O último evento de Edge Function observado no laboratório é de 16/11 12:41:42 UTC. A quota impediu o teste de autenticação real do endpoint.

### Inventário de Edge Functions
- Produção: **38 funções ACTIVE; 38/38 com `verify_jwt=false`**.
- Delivery Normal `upstatus` v480 serve userscript 3.4.7, cujo backend configurado é outro slug.
- API Normal efetivamente usada: `upstatus-screen-share-3-1-1-beta10` v6, `VERSION = 3.1.1-beta8`, `verify_jwt=false`.
- API Team Lite: `upstatus-team-lite` v15, userscript embutido 3.4.30, `verify_jwt=false`.
- `upstatus-test` v281 também está no **projeto de produção**, não em um terceiro projeto isolado.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3, ambos `verify_jwt=false), com autenticação customizada no código.
- Não existe função `upstatus-signal` implantada em produção.

`verify_jwt=false` não prova, sozinho, endpoint aberto: as rotas principais implementam autenticação própria por token de sessão. Mas todas as 38 funções exigem revisão de autenticação interna e os muitos slugs beta/backup/teste mantêm uma superfície de runtime extensa.

## 4. Normal / Team Lite — compatibilidade e confiança

### Bundles efetivamente implantados
| Componente | Userscript/API |
|---|---|
| Normal delivery `upstatus` v480 | userscript 3.4.7 |
| Normal API `upstatus-screen-share-3-1-1-beta10` v6 | código backend `3.1.1-beta8` |
| Team Lite `upstatus-team-lite` v15 | userscript 3.4.30 |

Os clientes instalados ainda usam o tópico legado `upstatus-screen-share-live-3-1-1-beta10`. Os triggers PostgreSQL publicam no tópico `upstatus-live-6f5e7b31-...`. O tópico não coincide.

As candidatas #74/#76 mudam para `upstatus-live-6f5e7b31-...`, mas isso ainda não foi publicado.

### Sinalização de voz e tela
Nos bundles instalados:
- O canal Realtime é criado com publishable key, sem configuração `private:true` e sem `realtime.setAuth()`.
- Os handlers de voz/tela validam estrutura, `roomId`, `from` e `to`, mas não recebem prova de identidade/membership assinada pelo servidor.
- Ao receber uma oferta, a criação de peer pode anexar a track local do microfone; quando o compartilhamento está ativo, pode anexar a track local da tela.
- O evento `remote_command` é processado diretamente pelo cliente instalado; Team Lite confirma apenas que o próprio cliente está autenticado, não a identidade do remetente.

Isso cria um **caminho estático de confiança não autenticada com impacto potencial alto**. Se o projeto permitir inscrição pública no canal, uma oferta forjada pode induzir negociação com peer não autenticado e potencialmente receber mídia local; um `remote_command` forjado também pode disparar sincronização de status. O setting de Dashboard “Allow public access” não é exposto pelo conector e não houve exploração, envio de broadcast, captura de áudio ou captura de tela. Portanto, o acesso externo efetivo não foi reproduzido; o achado é um bloqueador de release baseado em código implantado.

Nos candidatos:
- O broadcast `remote_command` foi reduzido a aviso para polling HTTP autenticado. Isso é uma melhoria.
- O transporte server-mediated continua opt-in: `signaling_transport_enabled` default false e endpoint vazio.
- Com a flag desligada, os listeners públicos de voz/tela continuam ativos.
- O endpoint configurado deve ser HTTPS e da mesma origem da API.

O endpoint `upstatus-signal-test` no laboratório valida `x-upstatus-token` por hash, expiração da sessão e membership aceita para `/signal`, `/broadcast` e `/poll`. O RPC `open_upstatus_signal_voice_room` cria/recupera a sala e adiciona o usuário como membro aceito, sem convite/aceitação, alinhado à regra funcional da Issue #78. Esse código não está implantado em produção e não passou em runtime por causa da quota 402.

### Comandos remotos
- Runtime instalado Normal e Team Lite: o broadcast público ainda chega a `executeRemoteCommand` diretamente.
- Candidatos #74/#76: o evento público virou apenas wake-up para polling autenticado do backend.
- A melhoria candidata não está nos userscripts instalados.

## 5. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime de produção
- 106 linhas observadas em `realtime.messages`, todas `private=false`, no tópico `upstatus-live-6f5e7b31-...`.
- Zero policies em `realtime.messages`; anon/authenticated possuem grants SELECT/INSERT/UPDATE.
- `upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb` e publica `db_change` em canal público.
- `upstatus_broadcast_remote_state()` publica metadados de comando/resultado.
- `upstatus_broadcast_users()` publica estado do usuário.
- As três funções são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE concedido a anon/authenticated. O Security Advisor reporta 3 WARN para anon e 3 WARN para authenticated como RPC. A invocação direta de uma função que retorna trigger não foi testada; não classifico isso como exploit reproduzido. Os grants são excessivos e o broadcast público é o risco verificável.

### Tabelas e grants
Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas públicas concedem grants a anon e authenticated; 63 entradas por papel e 9 grants TRUNCATE por papel.
- No agregado public/storage/realtime, 166 entradas de grants para anon/authenticated; 18 delas são TRUNCATE.
- Default ACLs de public/storage continuam amplas para objetos futuros.

Laboratório:
- 18 tabelas públicas com RLS e zero policies (Advisor INFO).
- Nenhum grant direto de tabela pública para anon/authenticated no snapshot consultado.
- As três funções de broadcast têm `search_path=""` e ACL limitada a postgres/service_role.
- Default ACLs de storage/realtime ainda exigem revisão.

### Storage
- `chat-images`: público, 168 objetos.
- `profile-images`: público, 20 objetos.
- Zero policies próprias em `storage.objects`.
- Buckets públicos permitem leitura por URL; a classificação dos anexos de chat e a necessidade de acesso privado precisam de decisão explícita.

## 6. AUTH-03, setup e workflows

- O backend Normal beta10 e o Team Lite v15 implantados ainda roteiam `POST /api/setup` para `login(req,true)`, sem consumo de convite.
- `/api/chat/clear` usa comparação literal `name !== "Ricardo"`, em vez de autorização por role.
- A candidata #74 tem consumo atômico de convite, mas o passo de rate limit de emissão foi ignorado no Smoke.
- A #131 é uma candidata separada para rate limit Normal; não está integrada à #74 nesta execução.
- A #76 inclui limite de emissão Team Lite, mas a integração real está bloqueada por quota.

### Workflows
- Team Lite oficial `deploy-production.yml`: manual, CLI `latest`, sem guardas equivalentes de branch/SHA/projeto e executa `supabase functions deploy upstatus`, slug errado para Team Lite. **Não despachar.**
- Team Lite oficial `deploy-test.yml`: também usa `secrets.SUPABASE_PROJECT_ID`, tem trigger push em develop e publica `upstatus-test`. Isso não garante isolamento.
- #76 candidata troca para `vars.SUPABASE_TEST_PROJECT_ID`, exige projeto Full-Product TEST e rejeita produção e laboratório de signaling. Porém esse terceiro projeto não existe.
- Workflow Normal candidato fixa CLI 2.122.1, verifica master, SHA e projeto de produção, mas publica somente `upstatus`; não publica a API beta10 nem o endpoint de signaling. O build separa URL de distribuição (`release.json.scriptUrl`) da API beta10. O manifesto continua em 3.4.7, igual ao userscript instalado, então uma mudança funcional precisa de incremento de versão para ser reconhecida pelo updater.

## 7. Issues e testes manuais
- Issue #78: **0/8** critérios físicos marcados. Nenhum teste sem F5 foi executado nesta rodada.
- Issue #79: corpo com **16/35** itens marcados e 19 pendentes. O comentário QA dedicado foi atualizado no mesmo ID; o comentário da Engenharia foi preservado.
- Não havia navegador Sale Smartly/Tampermonkey nem ambiente Full-Product TEST disponível nesta execução.
- Nenhum workflow foi disparado novamente. Os resultados CI acima foram inspecionados nos logs existentes.

## 8. Veredito e prioridades

**RELEASE NOT READY.** Bloqueadores prioritários:
1. Não liberar voz/tela enquanto o fallback de sinalização pública estiver ativo; implantar no projeto de produção o endpoint server-mediated, validar sessão, membership, destinatário, replay/expiry e rate limit no servidor, tornar o transporte default e remover os listeners públicos sensíveis.
2. Corrigir a execução de `remote_command` nos runtimes instalados para usar apenas broadcast como wake-up e consultar o comando autenticado antes de sincronizar Sale Smartly.
3. Investigar e restaurar o serviço após os HTTP 402 de produção. O proprietário da organização deve revisar Usage/Billing e spend cap do laboratório.
4. Criar Full-Product TEST independente; não usar `upstatus-test` no projeto de produção nem o laboratório de signaling como ambiente de produto.
5. Corrigir workflow oficial Team Lite (slug, projeto fixo, SHA exato, CLI pinada, preflight/rollback) e alinhar versão/distribuição/API Normal.
6. Integrar e validar AUTH-03 em Normal e Team Lite.
7. Corrigir grants, default ACLs, policies e Storage com revisão de owner; confirmar configuração de acesso público Realtime no Dashboard.
8. Validar migrations e proveniência em ambiente isolado; executar os oito testes físicos da #78 e obter reviews humanas.

### Limites desta execução
Todas as consultas SQL foram SELECT-only. Inspecionei fontes, bundles, logs, workflows, CI e Advisors. **Não executei testes de produto nem exploração de segurança.** Não houve merge, deploy, migration, release, publicação de userscript, alteração de produção, secrets, flags, roles, grants, policies, ACLs ou fixtures. A única escrita documental é este arquivo novo na branch QA e a atualização do comentário QA existente na Issue #79.
