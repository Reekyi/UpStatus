# UpStatus — auditoria independente de qualidade

**Execução:** 2026-11-10, snapshot final aproximado 14:38 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## Resumo executivo

**Recomendação: NOT READY.** As candidatas de proveniência de sinais Normal #133 e Team Lite #134 passaram nos checks completos de Pull Request nos heads exatos. A PR #89 passou por workflow de push com AUTH-03 integrado e testado no laboratório; o guard bloqueou corretamente o cutover porque a versão continua 3.4.7 e as três migrations AUTH-03 não existem em produção.

A produção permanece com broadcast Realtime público, grants/default ACLs amplos, setup legado sem convite, Storage público e histórico de migrations incompleto no repositório. O laboratório está separado e limpo, mas mantém Default ACLs permissivas para objetos futuros. Nenhum teste físico de reconexão foi realizado.

Esta auditoria usou inspeções read-only no GitHub e Supabase. Todas as consultas SQL foram SELECT-only. Não iniciei workflows, testes de escrita ou fixtures.

## 1. Documento de prontidão e heads reais

- Li integralmente `docs/RELEASE_READINESS.md` via blob SHA `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas.
- O último checkpoint registrado no documento principal é 08/11/2026 18:30 UTC. O documento não contém os resultados de 10/11 desta auditoria; este relatório suplementa o checkpoint sem sobrescrevê-lo.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA #82 antes deste relatório: `8322aeceaae1633b1850903341c213a07af40ea9`; comparação com master: 191 commits à frente e 1 atrás; merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- Normal #74: `fb878537d95db9097cce6d29a14260b9fd8d2e3d`, 883 à frente e 1 atrás de master.
- Team Lite baseline #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 à frente e 0 atrás de `team-lite-official`.
- Team Lite #76: `3b1406ddb56aecfa5b5515791ca99aea92c305ab`, 378 à frente e 0 atrás de `team-lite-official`.
- Normal proveniência #133: `8d38036ead5e1c3c9cc00db9791f8c9de093ba62`, 14 à frente e 0 atrás de #74.
- Team Lite proveniência #134: `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5`, 10 à frente e 0 atrás de #76.
- AUTH-03/cutover #89: `8898d5b66e14a03b9c4675e98ca179778db9fa6c`, 36 à frente e 0 atrás da base declarada `f04d18d780ffc355b6bad457b8a12ef9fe07f82b`.

As PRs #74, #75, #76, #82, #89, #133 e #134 estão abertas e Draft. As consultas de reviews retornaram listas vazias para todas elas. #75 é baseline histórico; #76 é a linha Team Lite de sinalização mais recente; #133/#134 são as linhas combinadas de proveniência de sinais. Não fiz merge nem rebase.

## 2. CI e workflows — separar evento, HEAD e resultado

### Checks PR-triggered aprovados

- **Normal #133**, HEAD `8d38036`: [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) e [API Target Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) SUCCESS. Smoke registrou 136/136 verificações autenticadas, incluindo WebRTC, áudio remoto, voz, compartilhamento de tela, mesh de três participantes, teardown/cleanup, política de descoberta pública e convite/consumo atômico. A etapa específica de rate limit distribuído de emissão de convites foi SKIPPED nesse Smoke; a cobertura AUTH-03 foi executada separadamente na #89.
- **Team Lite #134**, HEAD `ee246aa`: [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) SUCCESS. Candidate Checks registrou 16/16 não autenticadas, 110/110 autenticadas, 11/11 contratos HTTP, Playwright Full-IIFE, WebRTC, voz/tela, mesh, convites, rate limits e cleanup.
- **Normal #74**, HEAD `fb878537`: [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS no head registrado. É uma linha antiga, anterior à combinação #133; não substitui os checks da #133.
- **Team Lite #76**, HEAD `3b1406d`: [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) SUCCESS. Linha anterior à combinação #134.
- **Team Lite baseline #75:** [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico; não valida a candidata #76/#134.

### AUTH-03 e cutover — PASS de push, não check de PR

A [PR #89](https://github.com/Reekyi/UpStatus/pull/89), HEAD `8898d5b`, passou no workflow de candidato [42830995991](https://github.com/Reekyi/UpStatus/actions/runs/42830995991), acionado por push. O log confirma:
- regressões offline de autorização/token e dispatch de setup;
- limpeza exaustiva de fixtures e postflight;
- build e preservação dos sidecars de Edge Functions;
- preflight de histórico de migrations e guards de deploy/cutover;
- regressões de chat e signed upload;
- integração AUTH-03 no laboratório, incluindo token inválido/expirado/reutilizado, consumo concorrente com um único vencedor, preservação de papéis e cleanup.

O job terminou SUCCESS porque validou o comportamento e bloqueou o cutover. O log registra `Validation OK: PROD 3.4.7 / TEST 3.4.7` e depois `PRODUCTION CUTOVER BLOCKED`: a versão estável precisa ser maior que 3.4.7 e as três migrations AUTH-03 obrigatórias não estão no histórico de produção. Isso não é aprovação de release nem deploy; nenhum workflow de produção foi despachado.

A PR #137 também possui um guard de cleanup em branch separada e workflow de push [42821890896](https://github.com/Reekyi/UpStatus/actions/runs/42821890896). O HEAD atual de #89 já contém os testes de cleanup e os executou no workflow 42830995991; #137 não foi tratada como check PR nem como integração necessária.

### QA #82 — FAIL

O HEAD #82 `8322aece` falhou no [Validate 42828047676](https://github.com/Reekyi/UpStatus/actions/runs/42828047676), em `scripts/validate.mjs:26`, com `production updateURL mismatch`. O log mostra build `PROD 3.4.7 / TEST 3.4.7` antes da falha. Não alterei nem relaxei o validator. A correção de destino API está na candidata #133, ainda separada de #74/master.

## 3. Compatibilidade Normal / Team Lite e proveniência dos sinais

As duas candidatas recentes movem a proveniência autenticada para fora do payload controlado pelo remetente. O listener público é tratado como não confiável e a allowlist pública é limitada a hints de presença/encerramento; sinais de controle como decline, offer, answer e ICE devem usar o caminho autenticado. Os guards e suítes acima passaram nos heads exatos.

Limitação importante: os testes candidatos não equivalem a transporte privado implantado em produção. A integração server-mediated continua no laboratório; produção não possui a Edge Function de sinalização correspondente. O cliente ainda não tem um cutover seguro comprovado em produção. Portanto RT-01 permanece BLOCKED.

## 4. Supabase — estado de projeto, migrations e Edge Functions

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- Branch gerenciada de produção `main`: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.
- Migrations remotas: 7 em produção; 39 no laboratório.
- Produção lista 38 Edge Functions ACTIVE, todas com metadata `verify_jwt=false`. Isso não prova ausência de autenticação: os runtimes centrais implementam autenticação customizada por token. Runtimes relevantes: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-screen-share-3-1-1-beta10` v6 e `upstatus-test` v281. A função `upstatus-test` está dentro do projeto de produção, não é um terceiro projeto isolado.
- Laboratório contém `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não há função de sinalização server-mediated implantada em produção.
- A inspeção do source implantado Normal encontrou `POST /api/setup -> login(req,true)`, `createSignedUploadUrl`, zero ocorrência de `setup_token_hash` e zero ocorrência de `consume_upstatus_setup_invite`. Team Lite e Screen Share também mantêm o caminho de setup antigo na inspeção das fontes recuperadas.
- SELECT-only confirmou em produção: tabela `upstatus_setup_invite_rate_limits` ausente; tabela `upstatus_signal_rate_limits` ausente; RPCs `consume_upstatus_setup_invite`, rate limit de convite e rate limit de sinalização ausentes; zero colunas `setup_token_hash/setup_token_expires_at`.
- No laboratório, as tabelas e RPCs AUTH-03/sinalização existem. As três RPCs verificadas usam SECURITY INVOKER, `search_path` vazio e não concedem EXECUTE a anon/authenticated.

## 5. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime público

Consulta SELECT-only em `realtime.messages` encontrou **64 linhas persistidas**, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. O intervalo observado vai de 06/11 16:48 UTC a 10/11 14:20 UTC; 64 é o total persistido retornado, não uma contagem restrita às últimas 24 horas.

A tabela particionada pai `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado e zero policies. Os grants efetivos para anon/authenticated incluem SELECT, INSERT e UPDATE. Três triggers ativos publicam em broadcast público:
- `public.messages` -> `upstatus_broadcast_messages()`;
- `public.upstatus_state` -> `upstatus_broadcast_remote_state()`;
- `public.users` -> `upstatus_broadcast_users()`.

As três funções são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE efetivo para anon/authenticated. A função de mensagens serializa a linha OLD/NEW completa com `to_jsonb` e chama `realtime.send(..., false)`; as outras também publicam no canal público. O Security Advisor marca 3 WARN para anon e 3 WARN para authenticated e descreve chamadas via RPC. Como as funções retornam trigger e estão anexadas a triggers, não tentei invocação direta nem trato o aviso isolado como prova de exploração bem-sucedida; os grants continuam desnecessários e o broadcast público é confirmado pelo source/catálogo. Nenhuma mensagem foi injetada e nenhuma entrega externa foi testada.

### RLS e grants

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas com grants diretos amplos para anon e authenticated: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` e `users`.
- Os privilégios incluem SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER e REFERENCES. `upstatus_visual_config` é a exceção sem grants diretos para os papéis clientes.
- RLS sem policies restringe operações de linha, mas não protege TRUNCATE.

### Default ACLs

Consulta atual aos catálogos:
- Produção: 24 entradas e 300 itens ACL expandidos; 15 entradas concedem privilégios a anon/authenticated.
- Laboratório: 25 entradas e 277 itens ACL expandidos; 12 entradas concedem privilégios a anon/authenticated.

Em produção, defaults de `postgres` em public/storage e de `supabase_admin` em public/GraphQL incluem privilégios amplos de tabelas, sequências e EXECUTE em funções para papéis clientes. No laboratório, os defaults de `postgres` em public estão restritos, mas persistem defaults amplos de `postgres` em storage e de `supabase_admin` em public/GraphQL. Assim, o laboratório não concede grants diretos às tabelas públicas atuais, mas ainda pode gerar objetos futuros com ACL excessiva.

### Storage e signed upload

- `storage.objects`: RLS habilitado, zero policies e grants de SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- Buckets `chat-images` e `profile-images` permanecem públicos, ambos com limite de 20 MiB.
- O source implantado Normal chama `createSignedUploadUrl` e retorna também uma URL pública. A rota assinada valida metadados declarados, mas não lê os bytes reais antes de emitir a URL; a presença de helper `sniffMime` em outra rota não prova validação de conteúdo na rota assinada. Não executei upload de teste.

Security Advisor: produção retornou 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated em SECURITY DEFINER. Laboratório retornou 18 INFO de RLS sem policy e nenhum WARN de SECURITY DEFINER.

## 6. Migrations e proveniência

Os quatro SQLs originais aplicados em produção continuam ausentes do tree revisado:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 recupera os statements armazenados no ledger de produção e os arquiva em `docs/migration-recovery/`. Cada registro tem um statement e rollback NULL. O conteúdo recuperado corresponde aos statements executados, mas não comprova recuperação byte a byte dos arquivos originais, comentários, formatação ou blob/commit original. A #127 possui manifest de blob para as três migrations originais disponíveis, mas não cobre as quatro ausentes. MIGRATION-PROVENANCE permanece BLOCKED. Nenhum SQL recuperado foi movido para `supabase/migrations` ou executado.

## 7. Issues e testes manuais

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta; os oito critérios seguem desmarcados. Não houve queda real de internet, retorno sem F5, reentrada, chamada instalada, teste físico de microfone/tela ou interoperabilidade no Sale Smartly.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): comentário dedicado QA atualizado; comentário da Engenharia preservado. Nenhum comentário duplicado foi criado.
- Playwright/Full-IIFE e WebRTC nos workflows são evidência automatizada em laboratório, não teste manual de Tampermonkey/Sale Smartly.

## 8. Gates e recomendação

| Gate | Estado | Evidência / motivo |
|---|---|---|
| RT-01 | **blocked** | 64/64 mensagens persistidas públicas; triggers continuam usando broadcast público; transporte privado/autorizado não implantado. |
| TEST-ISOLATION | **in_progress** | Laboratório separado e limpo, mas não há terceiro projeto full-product TEST e Default ACLs continuam permissivas. |
| MIGRATION-PROVENANCE | **blocked** | Quatro arquivos originais ausentes; #135 recupera statements, não os arquivos originais; #127 é parcial. |
| AUTH-03 | **in_progress** | Integração candidata passou no laboratório; produção não tem tabelas, colunas ou RPCs; cutover bloqueado. |
| ACL-STORAGE | **blocked** | Grants/default ACLs amplas, dois buckets públicos e zero policies Storage. |
| RECONNECT | **pending** | Issue #78 0/8; requer confirmação manual sem F5. |
| HUMAN-REVIEW | **pending** | PRs Draft e sem reviews; não há autorização explícita de release. |

### Próximas ações

1. Integrar/revalidar #133 e #134 com o transporte server-mediated seguro como padrão, sem fallback público para sinais sensíveis.
2. Projetar e validar cutover Realtime com autenticação/membership no servidor; não apenas revogar grants ou mudar a flag.
3. Recuperar fontes originais das quatro migrations ou aprovar uma reconciliação formal de proveniência; não reconstruir SQL a partir do schema atual.
4. Endurecer grants e Default ACLs com owners autorizados; definir Storage privado/quarentena e validação de bytes antes da publicação.
5. Corrigir o validator herdado da QA sem relaxar a checagem de updateURL.
6. Revisar o workflow Team Lite e o slug correto de deploy; não despachar o workflow legado.
7. Só depois de integração e revisão, executar os oito critérios físicos da Issue #78 e obter aprovação humana.

## Limites e segurança

Não houve escrita SQL, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL, dispatch de workflow, publicação de userscript ou operação destrutiva. A auditoria não iniciou testes nem fixtures. Os únicos efeitos desta execução são este relatório documental novo na branch QA e a atualização do comentário dedicado QA da Issue #79; o comentário da Engenharia foi preservado.
