# UpStatus — auditoria independente de QA

**Data:** 2026-11-12T18:40:50.554Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`

## Escopo e método

Revalidação read-only de refs, PRs #74/#75/#76/#82/#152, Issues #78/#79, workflows, logs de CI, templates, artefatos Edge Function, migrations, RLS, grants, Default ACL, SECURITY DEFINER, Realtime e Storage.

O documento `docs/RELEASE_READINESS.md` foi lido integralmente pelo Git blob: 8.409 linhas. O último checkpoint interno é de 2026-11-08 18:30 UTC; portanto, o documento principal ainda não contém as últimas evidências de 12/11.

Não havia checkout local disponível para executar novos testes. Não rodei scripts, não iniciei workflows e não fiz requests de sinalização/upload. Os resultados de teste abaixo são logs de CI já existentes; as conclusões de backend e banco são inspeções estáticas/catalog-only.

## Heads reais

| Ref | SHA |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `b31adb030ab3cbf9ab3e94ea15b4233d5c83a18d` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

QA está 259 commits à frente e 1 atrás de master. A comparação de QA a partir do merge-base `3255712` mostra somente commits documentais adicionais nesta linha de auditoria. Não fiz rebase.

A PR #152 usa como base o SHA `3255712`; seu HEAD `ed43e2336a54c4fc4b4c1b75db580ae06d1ebf8d` está 12 commits à frente e 3 atrás da QA atual. As três revisões posteriores da QA são documentais. A PR permanece Draft.

## PRs obrigatórias e CI

| PR | HEAD atual | Evidência no HEAD | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS | CI aprovado; etapa de rate limit de emissão de convite foi SKIPPED |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | PASS histórico; baseline superseded pela #76 |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) SUCCESS | 110/110 autenticados; Playwright com stubs; WebRTC áudio/voz/tela, mesh 3 membros, rate limit, recibos e convite |
| #82 QA | `b31adb030ab3cbf9ab3e94ea15b4233d5c83a18d` | [Validate 43274636210](https://github.com/Reekyi/UpStatus/actions/runs/43274636210) FAILURE | Falha herdada em `production updateURL mismatch`, `scripts/validate.mjs:26` |
| #152 QA reconciliation | `ed43e2336a54c4fc4b4c1b75db580ae06d1ebf8d` | [Pull-request validation 43265009470](https://github.com/Reekyi/UpStatus/actions/runs/43265009470) SUCCESS | Build/updater/chat offline PASS; cobertura de upload server/client ausente |

Candidatas auxiliares revalidadas:

- [#133 Normal](https://github.com/Reekyi/UpStatus/pull/133), HEAD `8d38036`: Validate e Smoke [42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) / [42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) SUCCESS; 136/136 integração autenticada.
- [#149 Team Lite](https://github.com/Reekyi/UpStatus/pull/149), HEAD `77352d2`: Guard [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) e Candidate Checks [43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) SUCCESS; 110/110 e helper HTTP offline.
- [#151 admin/chat](https://github.com/Reekyi/UpStatus/pull/151), HEAD `60b686a`: [Full Validate 43196245858](https://github.com/Reekyi/UpStatus/actions/runs/43196245858) SUCCESS.

As PRs #74, #75, #76, #82, #133, #149, #151 e #152 permanecem abertas/Draft. As reviews consultadas de #74/#75/#76/#82/#152 estão vazias. A API de branch protection retornou HTTP 403; não afirmo estado de proteção das branches.

## Bloqueador novo da #152: cliente de upload sem backend correspondente

A #152 altera seis arquivos, incluindo `scripts/build.mjs` e `src/userscript/upstatus.user.template.js`, mas **não altera** `src/server/index.template.ts`.

O userscript candidato chama:

- `POST /api/chat/upload-url`
- `POST /api/profile/avatar-upload-url`

e usa `uploadFileDirect()` para obter ticket assinado e fazer PUT no Storage.

O build lê `src/server/index.template.ts` e gera `supabase/functions/upstatus/index.ts`. O workflow de produção executa `scripts/validate.mjs` (que chama o build) e depois publica `upstatus`.

O template de servidor da QA, blob `8c0deac870a28d53a5608548adc9b5486ee2de55`, **não contém** nenhuma das duas rotas nem `signedUploadRoute`. Ele mantém `profileRoute()` e `mediaRoute()` baseadas em Data URL (`p.dataUrl`).

Em contraste, os artefatos implantados atuais:
- produção `upstatus` v480, SHA `bb2713ce...`;
- produção `upstatus-team-lite` v15, SHA `2c13414a...`;

contêm `signedUploadRoute` e os dois handlers HTTP.

Portanto, a candidata #152 pode passar no CI e, se for usada para gerar/publicar o backend sem portar as rotas para o template, **removerá do backend as rotas que o novo cliente exige**, quebrando anexos do chat e atualização de avatar. O teste #152 valida destino do updater, papel administrativo e regressões de interface/chat, mas não verifica a paridade das rotas de upload. Os testes `test-signed-upload-client/server` não existem na branch QA consultada.

A #152 também continua gerando versão 3.4.7, igual à versão Normal instalada. O updater não terá uma versão maior para oferecer.

**Classificação:** inspeção de código confirmada; regressão de release potencial P1; não foi feito upload HTTP real.

Evidências: [PR #152](https://github.com/Reekyi/UpStatus/pull/152), [build](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/scripts/build.mjs), [template de servidor](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/src/server/index.template.ts), [template do userscript](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/src/userscript/upstatus.user.template.js).

## Voz: contrato HTTP 409 ainda divergente

No laboratório, a RPC `open_upstatus_signal_voice_room_attempt` é SECURITY INVOKER, usa `search_path=""`, e retorna `VOICE_ATTEMPT_ALREADY_ACTIVE` quando a conta já possui tentativa ativa.

A Edge Function implantada `upstatus-signal-test` v32, SHA `f893360a...`, mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; o caminho cai no HTTP 500.

O helper candidato tem teste offline que espera 409. A bateria do helper não prova que a função implantada foi atualizada. Não executei request HTTP real; o status 500 é inferido do mapper estático implantado, não reproduzido em rede.

Evidências: [PR #149](https://github.com/Reekyi/UpStatus/pull/149), [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43173176232), [projeto de laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb).

## Supabase — fotografia read-only

Projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, 2 Edge Functions.

Funções relevantes:
- Produção: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Os slugs centrais retornam `verify_jwt=false`; handlers protegidos usam autenticação própria por sessão. Esse atributo isolado não demonstra endpoint aberto.

### Realtime e SECURITY DEFINER

Produção:
- 119/119 registros em `realtime.messages` com `private=false`, em um tópico público; 21 partições.
- RLS habilitado em `realtime.messages`, FORCE RLS desligado, zero policies e seis grants de tabela para anon/authenticated (SELECT/INSERT/UPDATE).
- Três funções `upstatus_broadcast_*` SECURITY DEFINER, `search_path=public`, EXECUTE para anon e authenticated.
- `upstatus_broadcast_messages` envia OLD/NEW completo por `to_jsonb`; o canal usa `private=false`.

Laboratório:
- Zero mensagens/partições Realtime.
- Três funções de broadcast ainda SECURITY DEFINER, mas `search_path=""`, sem EXECUTE para anon/authenticated e payload reduzido à operação.
- Os triggers do laboratório ainda chamam `realtime.send(..., false)`; o transporte não é privado/autorizado.

Security Advisor:
- Produção: 6 WARN (3 anon + 3 authenticated) e 10 INFO de RLS sem policy.
- Laboratório: 0 WARN e 18 INFO de RLS sem policy.
- Performance/Health: nenhum finding em produção; laboratório tem 5 INFO de índice não utilizado.

### RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas public com RLS habilitado e sem policies.
- 126 grants diretos anon/authenticated em public; seis grants em realtime.messages.
- 18 grants TRUNCATE para clientes, distribuídos por nove tabelas: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing e users.
- 120 entradas Default ACL expandidas para anon/authenticated.
- Buckets `chat-images` e `profile-images` públicos, limite de 20 MiB, 188 objetos e zero policies próprias em `storage.objects`.

Laboratório:
- 18 tabelas public com RLS sem policies, mas zero grants diretos equivalentes para anon/authenticated em public.
- Seis grants em realtime.messages, sem policies e sem linhas.
- 96 entradas Default ACL expandidas ainda incluem permissões amplas de `supabase_admin` e objetos Storage.
- Zero buckets e zero objetos Storage.

### AUTH-03 e migrations

Produção não tem colunas `setup_token_*`, tabela de rate limit nem RPC de consumo de convite.

Laboratório tem quatro colunas `setup_token_*`, tabelas `upstatus_setup_invite_rate_limits` e `upstatus_signal_rate_limits`, e RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`. Essas RPCs são SECURITY INVOKER, `search_path=""`, EXECUTE somente service_role. Isso é evidência de candidato/lab, não de produção.

Os quatro arquivos históricos abaixo retornam 404 em master:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O ledger de produção tem 7 migrations e o do laboratório 39. Os statements recuperados do ledger não são os arquivos originais byte a byte. A branch Supabase `main` continua em `MIGRATIONS_FAILED`; preview status `ACTIVE_HEALTHY`.

## Workflows de publicação

- QA/Normal `.github/workflows/deploy-production.yml`: manual-only, executa build/Validate e publica `upstatus`, mas fixa a versão estável em 3.4.7 e usa Supabase CLI `latest`.
- `team-lite-official/.github/workflows/deploy-production.yml`: publica `upstatus` em vez de `upstatus-team-lite` e usa CLI `latest`. **Não despachar.**
- master `.github/workflows/deploy-test.yml`: usa o secret compartilhado `SUPABASE_PROJECT_ID`, CLI `latest` e publica `upstatus-test` no projeto selecionado por esse secret. O runtime TEST v281 está dentro do projeto de produção; não há terceiro projeto full-product TEST independente.

Nenhum workflow de deploy foi executado.

## Issues e aceitação manual

- Issue #78 permanece aberta com 0/8 critérios físicos marcados. Não houve teste de perda real de internet, reconexão sem F5, microfone/display permission real ou interoperabilidade instalada Normal ↔ Team Lite nesta auditoria.
- Issue #79 permanece aberta; corpo com 16 itens marcados e 19 pendentes. Comentário QA dedicado atualizado separadamente; comentário da Engenharia preservado.

## Gates recomendados

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Produção mantém Realtime público, payload OLD/NEW e permissões amplas |
| TEST-ISOLATION | done | Projeto de laboratório separado, saudável e sem fixtures; escopo é sinalização/auth, não full-product |
| MIGRATION-PROVENANCE | blocked | Quatro arquivos SQL originais continuam ausentes |
| AUTH-03 | in_progress | Contratos existem e passam no lab/candidatos, mas produção não possui as estruturas |
| ACL-STORAGE | blocked | Grants/Default ACL amplos, buckets públicos e zero policies próprias |
| RECONNECT | pending | Issue #78 continua 0/8; requer navegador/dispositivos reais |
| HUMAN-REVIEW | pending | PRs seguem Draft e sem review/aprovação humana |

## Próximos passos

1. Não integrar/publicar #152 antes de portar as rotas signed-upload para o server template e adicionar teste client/server.
2. Escolher versão Normal superior a 3.4.7 e revalidar updater.
3. Corrigir mapper HTTP de voz na Edge Function de laboratório e testar status + corpo no endpoint real.
4. Tornar sinalização autenticada padrão em Normal e Team Lite; fechar RT-01.
5. Corrigir workflow Team Lite para slug correto, project ref fixo, SHA exato e CLI pinada.
6. Corrigir grants, Default ACL, SECURITY DEFINER, RLS e Storage com plano revisado.
7. Recuperar/validar proveniência original das quatro migrations e diagnosticar MIGRATIONS_FAILED.
8. Executar os oito testes físicos da #78 e obter aprovação humana vinculada ao SHA final.

## Limites e segurança

Todas as consultas SQL executadas foram SELECT/catalog-only. Não houve escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou mutação de fixtures. Não executei novos testes locais nem requests HTTP de voz/upload; apenas inspecionei logs de CI existentes, fontes e funções implantadas.

A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
