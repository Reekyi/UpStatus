# UpStatus — auditoria independente de QA
**Data:** 2026-11-12 15:39 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção:** [Supabase dlfvkawaiqduhlazsszm](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm)  
**Laboratório:** [Supabase bfpjtfqlnypisxljoxkb](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb)

## Veredito

**NOT READY.** Não autorizar merge, deploy, release ou publicação de userscripts. Os bundles instalados continuam usando broadcasts públicos para comandos e sinalização; AUTH-03 não está aplicado em produção; o workflow oficial Team Lite publica o slug Normal; e a validação da branch QA falha no contrato de updateURL.

Esta execução foi read-only para código de produto e Supabase. Não houve checkout local, execução de testes novos, chamadas HTTP de voz, reruns de CI, SQL write, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL ou publicação. A documentação foi registrada como arquivo novo na branch QA e o comentário QA existente da Issue #79 foi atualizado.

## 1. Heads e integridade das branches

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` (início da auditoria) | `e133073988f499078138c178e5459ffab852f862` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

- Compare QA → master no início da auditoria: **253 commits à frente, 1 atrás**, status diverged; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- A criação deste relatório gerou o commit documental `39427acbf40da7532c4b8b4d615196f26e078ef2`, sem alterações de código. **HEAD QA após o registro: `39427acbf40da7532c4b8b4d615196f26e078ef2`, 254 commits à frente e 1 atrás de master.**
- PR #74 head `fb878537d95db9097cce6d29a14260b9fd8d2e3`, base SHA `a9288cc...`; comparação com master atual: **883 à frente, 1 atrás**, status diverged.
- PR #76 head `c4dee8d2c502499de5f95932ac14a90cffb56196`, base `team-lite-official`: **384 à frente, 0 atrás**.
- PR #82 usa o HEAD QA `e133073...`; sua base registrada continua em `a9288cc...`.

As branches e PRs examinadas continuam abertas/Draft, sem merge. Não encontrei reviews submetidas nas PRs #74, #75, #76 e #82. A leitura do endpoint de branch protection/rulesets retornou HTTP 403 para esta integração; **proteção de branches não pôde ser confirmada** e não deve ser presumida como ativa ou inativa.

## 2. Release Readiness

O blob de `docs/RELEASE_READINESS.md` foi recuperado e lido integralmente: **8.410 linhas**, blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, cerca de 1,045 MB.

O último checkpoint interno do documento é **2026-11-08 18:30 UTC**. O documento ainda registra os heads, CI e snapshots daquele checkpoint; não representa o estado atual de 12/11. Foi preservado sem edição.

## 3. PRs obrigatórias e CI por HEAD

| PR | Estado | HEAD | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | Open / Draft | `fb87853` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | Open / Draft | `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | Open / Draft | `c4dee8d` | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | Open / Draft | `e133073` | [Validate 43244433230](https://github.com/Reekyi/UpStatus/actions/runs/43244433230) FAIL |

### PR #74 — Normal

O Validate e o Smoke passaram no HEAD `fb87853`. O Smoke confirmou 136/136 verificações autenticadas, WebRTC de chamada/voz/tela, mesh de três participantes, rate limit de sinalização (90 aceitas e 1 rejeitada com HTTP 429), recibos atômicos e consumo de convite.

**Limitação de cobertura:** as etapas `Syntax-check setup invite rate-limit harness when present` e `Verify distributed setup-invite issuance rate limit` ficaram **skipped**. O teste de consumo atômico do convite passou, mas isso não equivale à cobertura completa de rate limit de emissão do AUTH-03.

O workflow de produção da candidata é manual-only, exige `refs/heads/master`, confere checkout SHA e project ref `dlfvkawaiqduhlazsszm`, fixa Supabase CLI **2.122.1** e exige release 3.4.7. Porém, publica somente `upstatus`; não coordena o runtime beta10 utilizado pelo caminho de API dual-runtime. O release guard ainda exige exatamente 3.4.7.

### PR #75 — baseline Team Lite

O Candidate Checks é um PASS histórico do baseline 3.4.31 guest-fixes. A PR tem 59 commits e 10 arquivos; não deve ser tratada como uma segunda implementação independente da candidata atual #76.

### PR #76 — Team Lite

O workflow do HEAD `c4dee8d` passou:
- 11/11 contratos HTTP offline do helper de sinalização;
- 110/110 verificações autenticadas;
- testes Chromium de WebRTC de chamada, áudio de sala e vídeo de compartilhamento;
- mesh de três participantes e teardown;
- rate limit distribuído: 90 aceitas e 1 rejeitada com HTTP 429;
- consumo atômico de convite e rate limit de emissão;
- guard de mutações restrito ao projeto isolado;
- validação do layout de migrations e triggers do workflow Team Lite.

É CI automatizado no laboratório, não aceitação física no Tampermonkey.

### PR #82 — QA

O run mais recente no HEAD QA é [43244433230](https://github.com/Reekyi/UpStatus/actions/runs/43244433230). O job fez checkout do merge ref `c2da678`, buildou Normal/TEST 3.4.7 e falhou em:

`VALIDATION FAILED: production updateURL mismatch`

O stack trace aponta `scripts/validate.mjs:26`. Não houve rerun nem remoção de assertions.

## 4. Edge Functions e bundles instalados

Projeto de produção: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, **38 Edge Functions ativas**; todas reportam `verify_jwt=false` no gateway. Isso não prova ausência de autenticação nos handlers: os endpoints precisam ser avaliados por autenticação própria.

| Função | Versão | Atualizada em UTC | SHA da fonte |
|---|---:|---|---|
| `upstatus` | v480 | 2026-10-29 14:24:05 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | v15 | 2026-10-29 14:30:34 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 2026-10-27 18:05:56 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| `upstatus-test` | v281 | 2026-10-27 20:43:16 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

Os bundles embutidos foram decodificados:
- Normal contém userscript **3.4.7**.
- Team Lite contém userscript **3.4.30**.
- Ambos assinam Realtime sem `private:true` e sem `setAuth()`.
- Normal recebe `remote_command` e chama `executeRemoteCommand` diretamente; também entrega `call_signal` ao handler.
- Team Lite verifica a própria sessão e geração local, mas isso não autentica o emissor do broadcast; seu listener `remote_command` também executa o comando recebido.

Portanto, o código instalado ainda confia em comandos e sinalização recebidos por broadcasts públicos. As correções candidatas de polling autenticado e origem autenticada não estão nos bundles instalados.

## 5. Voz: diferença entre helper testado e Edge Function implantada

A função isolada `upstatus-signal-test` está em **v32**, source SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`, última atualização **2026-11-06 21:09:49 UTC**.

A fonte implantada ainda usa o mapeamento:

`VOICE_ATTEMPT_CONFLICT || ROOM_FULL ? 409 : 500`

Ela não inclui `VOICE_ATTEMPT_ALREADY_ACTIVE`.

Na PR #76, o arquivo candidato `supabase/test-functions/upstatus-signal-test/index.ts` importa `mapOpenVoiceRoomResult`, e o teste offline verifica esse código como HTTP 409. O workflow confirma **11/11** casos e 110/110 integrações.

**Conclusão:** o helper e o snapshot candidato foram testados, mas a função v32 armazenada no projeto isolado ainda está com código anterior. A inspeção estática prevê fallback 500 para esse código. Nenhuma chamada HTTP real foi feita nesta execução; não afirmo que o 500 foi reproduzido em rede.

## 6. Supabase — snapshot PostgreSQL read-only

### Produção

- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, **7 migrations**.
- `realtime.messages`: 115/115 linhas com `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- RLS habilitado em `realtime.messages`, FORCE RLS desabilitado, zero policies; SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- 10 tabelas em `public` com RLS habilitado e zero policies.
- **166 grants** diretos para anon/authenticated: 126 em public, 32 em storage e 8 em realtime.
- **18 grants TRUNCATE** em nove tabelas públicas. RLS não restringe TRUNCATE.
- **120 entradas Default ACL** para papéis clientes. Foram encontradas defaults amplas de `postgres` e `supabase_admin`, incluindo privilégios de tabela (DELETE/INSERT/MAINTAIN/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE), EXECUTE de funções e privilégios de schema.
- Três funções de broadcast são SECURITY DEFINER, `search_path=public`, retornam trigger e têm EXECUTE para anon/authenticated.
- O trigger de mensagens envia `to_jsonb(OLD/NEW)` completo; o trigger de remote state envia campos de comando/resultado; o trigger de usuários envia estado de presença. Todos publicam com `private=false`.
- Dois buckets públicos (`chat-images`, `profile-images`), limite de 20 MiB cada, **188 objetos** e zero policies próprias em `storage.objects`.
- AUTH-03 ausente: zero colunas `setup_token_*`, zero tabelas de rate limit e zero RPCs de convite.
- Security Advisor: 6 WARN de SECURITY DEFINER (3 anon + 3 authenticated) e 10 INFO de RLS sem policy.

As funções SECURITY DEFINER de broadcast retornam `trigger`; não foi demonstrada chamada RPC direta nesta execução. O risco confirmado está nos privilégios concedidos e nos payloads públicos emitidos pelos triggers.

### Laboratório

- Projeto separado `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, **39 migrations** e duas Edge Functions de teste.
- 12 tabelas consultadas (users, messages, sessions, rooms, memberships, events, bindings, rate limits, call attempts, voice attempts, setup-invite rate limits e chat reads): **zero linhas**.
- `realtime.messages`: zero linhas; Storage: zero buckets e zero objetos.
- Três triggers de broadcast mantêm SECURITY DEFINER, mas usam `search_path=''`, EXECUTE negado a anon/authenticated e payload mínimo `{op: TG_OP}`. Ainda publicam com `private=false`; não há tráfego de fixture no snapshot.
- 18 tabelas public com RLS e sem policies; não há grants diretos equivalentes em public para papéis clientes, mas permanecem 40 grants em realtime/storage.
- 96 entradas Default ACL; persistem defaults amplas de `supabase_admin` em public/GraphQL e de `postgres` em storage.
- AUTH-03 existe no laboratório: quatro colunas `setup_token_*`, tabelas `upstatus_setup_invite_rate_limits` e `upstatus_signal_rate_limits`, RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`.
- Security Advisor: zero WARN e 18 INFO.

O laboratório está isolado e limpo no snapshot consultado, mas é um ambiente de sinalização/segurança, não um terceiro ambiente full-product TEST.

## 7. Migrations e proveniência

O ledger de produção contém sete versões. Os quatro caminhos abaixo foram consultados diretamente no branch master e todos retornaram 404:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Os registros de versão estão no ledger, mas os arquivos SQL originais não estão disponíveis em master para verificação byte a byte/hash. Não reconstruir arquivos originais a partir do schema ou de statements do ledger.

## 8. Workflows e publicação

### Team Lite oficial

O workflow [deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml) é workflow_dispatch, mas:
- usa CLI `latest`;
- faz checkout sem fixar explicitamente um SHA aprovado;
- não valida o project ref esperado;
- executa `supabase functions deploy upstatus`, o slug Normal.

O slug correto da função Team Lite é `upstatus-team-lite`. **Não executar o workflow oficial atual.**

O workflow oficial `deploy-test.yml` ainda possui gatilho `push` na branch develop, usa o secret compartilhado `SUPABASE_PROJECT_ID` e CLI `latest`. O projeto `upstatus-test` continua dentro do projeto de produção, não é um terceiro projeto independente.

### Updater Team Lite

O `team-lite/release.json` oficial usa buildVersion 3.4.30; o candidato #76 usa 3.4.31. Ambos apontam para URL raw de uma branch GitHub (`team-lite-official/team-lite/upstatus-team-lite.user.js`). O updater valida a URL exata, mas a origem é um caminho mutável de branch, não um artefato imutável por tag/SHA. Isso requer decisão explícita de integridade de release.

### Normal

O workflow candidato #74 tem controles melhores: workflow_dispatch, ref master, checkout SHA exato, project ref fixo, token obrigatório, CLI 2.122.1 e guard de release 3.4.7. Ele publica somente `upstatus`; o stack dual-runtime precisa coordenar o backend beta10 quando essa API fizer parte do corte.

## 9. Issues e aceitação humana

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua OPEN, **0/8 critérios físicos**. Não houve perda real de rede, reconexão sem F5, microfone/display permissions reais ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) continua OPEN. O comentário dedicado QA existente (ID `6744331652`) foi atualizado; o comentário da Engenharia (ID `6744711778`) foi preservado. Não foram criados comentários duplicados.
- Reviews de #74, #75, #76 e #82: nenhuma submissão encontrada nesta consulta. Aprovação humana permanece pendente.
- Branch protection/rulesets: endpoint administrativo retornou 403; estado não verificável pela integração atual.

## 10. Gates e próximas ações

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts públicos, full-row payload em mensagens e ausência de transporte privado padrão. |
| TEST-ISOLATION | DONE | Projeto isolado, 12 tabelas de fixtures vazias, Realtime e Storage vazios no snapshot. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro arquivos SQL originais retornam 404 em master. |
| AUTH-03 | BLOCKED | Estruturas existem no laboratório/candidatos, mas não em produção. |
| ACL-STORAGE | BLOCKED | Grants, Default ACLs, RLS e buckets públicos continuam amplos. |
| RECONNECT | PENDING | Issue #78 continua 0/8; depende de teste físico sem F5. |
| HUMAN-REVIEW | PENDING | Sem reviews/aprovação explícita vinculada ao SHA final. |

Próximas prioridades:
1. Corrigir o contrato updateURL da QA sem remover assertions e revalidar o HEAD exato.
2. Reconciliar uma única candidata Normal com AUTH-03, chat staged, signed uploads e dispatcher.
3. Tornar comandos remotos e sinalização de voz/tela autenticados por padrão em Normal e Team Lite; alinhar tópicos Realtime.
4. Atualizar a função de laboratório para o mesmo mapper HTTP do candidato e testar o endpoint efetivo, status e corpo.
5. Corrigir o workflow oficial Team Lite para slug, project ref, SHA e CLI pinados; eliminar o deploy TEST automático contra secret compartilhado.
6. Revisar grants, Default ACL, SECURITY DEFINER, policies RLS e Storage.
7. Recuperar proveniência dos quatro SQLs originais.
8. Criar ambiente full-product TEST independente.
9. Executar os oito critérios físicos da #78 e obter aprovação humana vinculada ao SHA final.

**Conclusão: NÃO LIBERAR.** CI verde é evidência de candidato em laboratório, não de equivalência com a função implantada nem com os bundles instalados.
