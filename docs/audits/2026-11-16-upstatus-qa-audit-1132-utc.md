# Auditoria independente UpStatus — 2026-11-16 11:32 UTC

## Escopo e método

Revalidação read-only do repositório Reekyi/UpStatus, das Issues #78/#79, das PRs obrigatórias #74/#75/#76/#82 e das candidatas relacionadas #161/#167/#168/#170, além dos projetos Supabase dlfvkawaiqduhlazsszm (produção) e bfpjtfqlnypisxljoxkb (laboratório de sinalização).

Foi lido integralmente docs/RELEASE_READINESS.md na branch QA: 8.423 linhas, 1.046.356 caracteres. O último snapshot histórico dentro do documento é de 2026-11-15 06:30 UTC; não deve ser tratado como estado atual sem revalidação.

Nenhum workflow foi despachado. Nenhum teste foi repetido pela QA. Não houve teste físico Tampermonkey/Sale Smartly. Todas as consultas SQL foram SELECT-only. Nenhuma migration, alteração de produção, secret, flag, grant, policy, ACL, deploy, merge, release ou publicação foi realizada.

Vocabulário:
- CI PASS/FAIL: resultado automatizado observado no HEAD identificado.
- Inspeção de código: leitura estática de fonte ou configuração; não é execução.
- Pendente manual: depende de navegador instalado, rede/dispositivo real ou aceite humano.
- Bloqueado: dependência ou risco confirmado impede a conclusão.
- Não verificado: evidência insuficiente.

## 1. Heads e integridade GitHub

Heads confirmados pela API de refs:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- qa/release-readiness-2026-11-04-master: 90854c868ceca4fb717e863d25147341359cd415

Comparação QA vs master: 365 commits à frente, 1 atrás, 205 arquivos alterados. Todos os 205 caminhos retornados pelo compare começam em docs/; não há alteração de runtime na QA.

Comparações de candidatas:
- #74: 887 commits à frente e 1 atrás de master; 90 arquivos alterados. É uma stack grande e exige revisão de escopo cuidadosa.
- #75: 59 commits à frente de team-lite-official; 10 arquivos alterados.
- #76: 386 commits na PR; 327 commits à frente da linha #75.
- #167: 21 commits à frente de master; 7 arquivos alterados.
- #161 é empilhada sobre a branch da #74; #168 é empilhada sobre #161.

Governança de branches: o endpoint de branch protection retornou HTTP 403 (integração sem acesso). O endpoint de rulesets visíveis retornou lista vazia. Portanto, nesta execução não é possível afirmar se as branches estão protegidas ou desprotegidas; a proteção efetiva permanece NÃO VERIFICADA.

## 2. PRs e CI

| PR | HEAD | Estado | Evidência automatizada |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | aberta, Draft, sem review | Validate 43376770142 PASS; Smoke 43376770200 PASS; Supabase Preview skipped |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | aberta, Draft, sem review | Candidate Checks 41674353127 e 41674344881 PASS histórico em 03/11 |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | aberta, Draft, sem review | Candidate Checks 43363871881 PASS; Supabase Preview skipped |
| #82 QA | 90854c868ceca4fb717e863d25147341359cd415 | aberta, Draft, sem review | Validate 43847909171 FAIL |
| #161 Normal | 557814dc31bed779b84a2094358dc6b2a7e67689 | aberta, Draft, sem review | Validate 43479685384 PASS; Smoke 43479685445 PASS |
| #167 Normal | d25b3fbe1bd28a222d45ead6a467ceb7fd00548a | aberta, Draft, sem review | Validate 43784897392 PASS; sem Smoke no mesmo HEAD |
| #168 Normal | c6de3eb29bb419e817a237487185df0df752015d | aberta, Draft, sem review | Validate 43755941462 PASS; sem Smoke |
| #170 Normal | 693039eddbd01e210fd1344b0196703ca067f374 | aberta, Draft, sem review | Validate 43762594686 FAIL |

O Supabase Preview foi skipped nas candidatas consultadas porque não havia branch Supabase associada ou a criação de preview estava desabilitada. Isso não equivale a teste de migration em preview.

### Falha atual da #82

O run 43847909171 fez checkout do merge ref a6b0158f0a70ba72927a963c0bdbeb213cd21a14, que combina o HEAD QA 90854c8 com master 9d40461. O log mostra:
- Build: UpStatus 3.4.7 / TEST 3.4.7.
- Falha em scripts/validate.mjs:26.
- Mensagem: VALIDATION FAILED: production updateURL mismatch.

A causa estática foi confirmada:
- master release.json define scriptUrl como https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js.
- master scripts/build.mjs gera o updateURL Normal pelo endpoint beta10 upstatus-screen-share-3-1-1-beta10.
- master scripts/validate.mjs exige que o updateURL contenha /upstatus/upstatus.user.js.

A #167 já contém uma correção candidata: usa release.scriptUrl e exige correspondência exata com o endpoint de distribuição /upstatus. Porém #167 ainda não tem Smoke nem review humana no mesmo HEAD. Não se deve remover a assertion para tornar o CI verde.

### Contrato de anexos e integração

A #167 usa anexos pendentes (pendingUpload) e implementa validações mais fortes no upload assinado. A #170 falha em assertion antiga que espera upload imediato: “files are staged instead of uploaded immediately”. O teste da #170 precisa ser reconciliado com o contrato real de anexos pendentes; não se deve enfraquecer a regressão.

A integração necessária continua separada:
- #167: updater, anexos pendentes, upload assinado e autorização administrativa da limpeza do chat.
- #161: destino da API Normal, convite obrigatório e rate limit.
- #168: Retry-After.
Não há Validate + Smoke no mesmo HEAD para esse conjunto.

## 3. Workflows e destinos de publicação

### TEST em master/develop

Inspeção estática confirmou:
- master scripts/build.mjs fixa o projeto dlfvkawaiqduhlazsszm para PROD e TEST; não há TEST_PROJECT_ID dedicado.
- master .github/workflows/deploy-test.yml usa secrets.SUPABASE_PROJECT_ID genérico, CLI latest e deploya upstatus-test.
- develop .github/workflows/deploy-test.yml possui workflow_dispatch e gatilho push em develop; também usa SUPABASE_PROJECT_ID genérico, CLI latest e deploya upstatus-test.
- A função upstatus-test v281 está ACTIVE no próprio projeto de produção.

O valor do secret não foi lido. Portanto, não afirmo que uma execução específica tenha apontado para produção; afirmo que os workflows atuais não impedem esse destino e que a função TEST já existe no projeto de produção.

### Guard candidato da #74

A branch chore/continuity-foundation contém melhorias:
- UPSTATUS_TEST_PROJECT_ID dedicado.
- Rejeita project ref de produção.
- Rejeita o laboratório isolado de sinalização como Full-Product TEST.
- Exige correspondência entre IDs de build e deploy.
- Manual-only e CLI Supabase 2.122.1 pinada.
- O build usa um sentinel inerte quando não há projeto TEST configurado e recusa build/deploy para produção ou laboratório de sinalização.

Esse guard falha fechado, corretamente. Porém a organização possui somente dois projetos Supabase; ainda não há terceiro projeto Full-Product TEST. A candidata não deve ser contornada.

Também foi corrigido na candidata o comportamento de build local: master usa fs.rmSync para apagar diretórios de função e dist antes de recriar; a candidata preserva sidecar files rastreados.

### Team Lite oficial

team-lite-official/.github/workflows/deploy-production.yml e o arquivo correspondente na candidata #76 executam:
supabase functions deploy upstatus

O slug correto para essa linha é upstatus-team-lite. O workflow também usa SUPABASE_PROJECT_ID genérico e CLI latest, sem os guards de projeto/SHA e preflight vistos na candidata Normal.

A #76 não altera deploy-production.yml. Seu Candidate Checks não corrige o workflow oficial. Não despachar o workflow Team Lite atual.

## 4. Supabase: projetos, migrations e Edge Functions

Projetos disponíveis:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto Full-Product TEST.

Migrations:
- Produção: 7 no ledger.
- Laboratório: 39.
- Branch gerenciada main: MIGRATIONS_FAILED.
- Preview: ACTIVE_HEALTHY.

Os quatro arquivos originais abaixo retornaram 404 tanto em master quanto em QA:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruir esses SQLs por inferência; obter fonte original ou artefato de origem verificável.

Edge Functions:
- Produção: 38 funções, todas listadas ACTIVE e verify_jwt=false.
- upstatus v480; upstatus-test v281; upstatus-team-lite v15; upstatus-screen-share-3-1-1-beta10 v6.
- Laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

verify_jwt=false não prova por si só acesso anônimo efetivo; os handlers podem implementar autenticação própria. Ainda assim, cada rota precisa de revisão de autenticação/autorização customizada.

Snapshot read-only de dados:
- Produção: 5 usuários, 302 mensagens, 6 chat_reads, 0 reactions, 188 objetos Storage. Nenhum usuário sem password_hash ou role no snapshot.
- Laboratório: zero usuários/fixtures de produto, zero mensagens e zero buckets/objetos Storage.

Logs na janela 2026-11-15 11:25 UTC a 2026-11-16 11:25 UTC:
- Produção: 72 pgbouncer_logs e 23 postgres_logs.
- Laboratório: 72 pgbouncer_logs e 18 postgres_logs.
- Nenhuma fonte Edge/Function apareceu; não calcular HTTP 402 nem declarar recuperação de disponibilidade.

## 5. AUTH-03 e compatibilidade Normal/Team Lite

Runtimes implantados:
- Normal: userscript 3.4.7; Edge Function upstatus v480; API ainda usa beta10 v6.
- Team Lite: userscript 3.4.30; Edge Function upstatus-team-lite v15.
- TEST em produção: upstatus-test v281.

Inspeção do código implantado:
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- Ambos aceitam POST /api/setup sem setupToken obrigatório.
- Ambos mantêm fallback de papel administrativo baseado em nomes quando role está vazio.
- A limpeza global do chat ainda precisa de autorização por papel persistido no runtime implantado.

Produção não tem colunas setup_token_* nem RPC consume_upstatus_setup_invite/rate-limit. O laboratório tem as quatro colunas e duas RPCs de convite/rate-limit, SECURITY INVOKER, search_path vazio e EXECUTE restrito a postgres/service_role.

As candidatas são complementares, não integradas:
- Normal #161 implementa setupToken, consumo atômico de convite e rate limit.
- Normal #167 ainda mantém o setup legado sem convite.
- Team Lite #76 implementa setupToken e RPC de convite.
- Não há prova de que essas correções estejam nos runtimes de produção.

## 6. Upload assinado e anexos

Os dois clientes instalados já usam upload assinado; a funcionalidade não está ausente. O problema é o endurecimento desigual.

Produção Normal e Team Lite:
- signedUploadRoute confere MIME/tamanho declarados e caminho retornado.
- Usa Number.isFinite, não Number.isSafeInteger.
- Não valida integralmente origem, rota, caminho e token da URL assinada.
- Não inspeciona bytes reais no fluxo de upload assinado.

Candidata Normal #167:
- Number.isSafeInteger para tamanho.
- Valida HTTPS, origem do projeto, prefixo/rota, caminho assinado, token e URL pública.
- Cliente usa credentials: omit e redirect: error.
- A regressão server/client usa VM e Storage mocks; não houve PUT real para Storage.

Candidata Team Lite #76:
- A rota de servidor ainda usa Number.isFinite e não aplica as mesmas verificações de origem/caminho/token/URL pública.
- O cliente usa PUT sem credentials: omit e sem redirect: error.
- A paridade de segurança Normal/Team Lite não foi atingida.

Os buckets de produção são públicos, então upload assinado não equivale a leitura privada. A inspeção de conteúdo/bytes e eventual quarentena continuam ausentes.

## 7. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- 10 tabelas public com RLS habilitado e sem policies.
- 126 grants diretos anon/authenticated em tabelas public.
- 18 grants TRUNCATE.
- 120 entradas de default ACL envolvendo anon/authenticated.
- Security Advisor: 10 INFO de RLS sem policy; 3 WARN anon SECURITY DEFINER e 3 WARN authenticated SECURITY DEFINER.
- Performance e Health Advisors sem lints nesta consulta.

Realtime:
- realtime.messages: RLS=true, FORCE RLS=false, zero policies, 7 partições diretas.
- Grants anon/authenticated: SELECT, INSERT e UPDATE.
- 106 linhas, todas private=false:
  - 72 user_status
  - 26 db_change
  - 4 remote_command
  - 4 remote_result
- Topic dos triggers: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Três funções broadcast são SECURITY DEFINER, search_path=public e têm EXECUTE para anon/authenticated/service_role.
- upstatus_broadcast_messages envia OLD/NEW completo; as funções de estado remoto/usuários também emitem eventos com private=false.

Precisão de classificação: as funções de broadcast são funções trigger que retornam trigger. O Advisor sinaliza grants EXECUTE amplos, mas não foi demonstrada chamada RPC direta a essas funções. O risco concreto confirmado é o trigger produzir broadcasts públicos, além do search_path inseguro e grants desnecessários.

Storage:
- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- storage.objects: RLS=true, FORCE RLS=false, zero policies próprias.
- anon/authenticated têm INSERT/SELECT/UPDATE/DELETE em storage.objects.

### Laboratório

- 18 tabelas public com RLS e sem policies; zero grants diretos anon/authenticated em tabelas public.
- Zero grants TRUNCATE em public.
- 96 entradas de default ACL envolvendo anon/authenticated.
- realtime.messages: RLS=true, FORCE RLS=false, zero policies, zero linhas e zero partições diretas.
- Ainda existem grants anon/authenticated SELECT/INSERT/UPDATE em realtime.messages.
- storage.objects ainda tem grants anon/authenticated INSERT/SELECT/UPDATE/DELETE; não há buckets nem policies.
- As três funções broadcast continuam SECURITY DEFINER, mas usam search_path vazio e EXECUTE restrito a postgres/service_role; payloads foram minimizados. Ainda enviam private=false.
- Security Advisor: 18 INFO, zero WARN.
- Performance Advisor: 5 INFO de índices não utilizados; Health Advisor sem lints.

### Transporte autenticado

As candidatas Normal #74 e Team Lite #76 têm signalTransportFlag com default false. Assim, o transporte autenticado permanece opt-in e o caminho legado Realtime público continua sendo o fallback padrão. Não marcar RT-01 como concluído.

A função de laboratório upstatus-signal-test v32 ainda mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE. O contrato candidato não foi validado por HTTP real.

## 8. Issues e aceitação física

- Issue #78 permanece aberta, 0/8 critérios físicos confirmados. Os comentários mais recentes não apresentam confirmação de teste físico sem F5.
- Issue #79: o último checkpoint da Engenharia informa 16/35 itens concluídos e 19 pendentes.
- Não houve teste manual Tampermonkey/Sale Smartly, queda física de rede, retorno sem F5, microfone/display-capture real ou interoperabilidade instalada nesta execução.
- Não houve review humana submetida nas PRs examinadas.

## 9. Gates

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, sem policies e transporte autenticado opt-in |
| TEST-ISOLATION | blocked | Não há Full-Product TEST separado; master/develop usam projeto genérico |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais ausentes; main gerenciada MIGRATIONS_FAILED |
| AUTH-03 | blocked | Setup sem convite e autorização nominal ainda implantados |
| ACL-STORAGE | blocked | Grants/default ACLs amplos, buckets públicos e zero policies Storage |
| RECONNECT | pending | Issue #78 0/8; depende de teste físico e confirmação de Ricardo |
| HUMAN-REVIEW | pending | Nenhuma review/aprovação explícita de release |

## 10. Veredito

NOT READY. Não recomendar merge, deploy, release ou publicação.

Prioridades:
1. Corrigir o caminho TEST em master e develop e provisionar Full-Product TEST separado.
2. Corrigir o workflow Team Lite para upstatus-team-lite e copiar os guards de projeto/SHA/CLI/preflight.
3. Integrar #167 + #161 + #168 em um HEAD Normal único, resolver o updateURL e executar Validate + Smoke no mesmo SHA.
4. Integrar o endurecimento de upload da #167 em Team Lite.
5. Completar AUTH-03 nos dois runtimes.
6. Tornar Realtime privado/autorizado por padrão e remover broadcasts públicos sensíveis.
7. Revisar RLS, grants, default ACLs, SECURITY DEFINER e Storage.
8. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
9. Executar os oito critérios físicos da #78 e obter aprovação humana.

## Limites e integridade

- Todas as consultas Supabase foram SELECT-only.
- Não foram lidos valores de secrets ou tokens.
- Não foram iniciados workflows.
- Nenhum teste foi repetido pela QA; resultados CI citados são históricos e vinculados aos HEADs indicados.
- Não houve teste manual nem acesso físico ao navegador/dispositivos.
- Nenhuma alteração em produção ou laboratório.
- A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
