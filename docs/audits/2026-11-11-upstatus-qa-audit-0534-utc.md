# UpStatus — auditoria independente QA
**Data:** 2026-11-11 05:34 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## Método e limites

Inspeção read-only de refs, PRs, reviews, workflows, arquivos de build/deploy, runtimes Edge implantados, catálogo PostgreSQL, migrations, Realtime, grants, RLS, Default ACL, Storage e Security Advisor. Consultas SQL foram exclusivamente `SELECT`. Não executei scripts, chamadas HTTP de teste, browser tests, migrations, deploys, merges, releases, publicação de userscripts ou alterações de secrets/flags/roles/grants/policies.

Classificação:
- **CI:** workflow existente associado ao HEAD indicado.
- **CODE INSPECTION:** leitura estática de fonte/configuração; não é teste de runtime.
- **MANUAL PENDING:** navegador instalado, dispositivo, rede física ou aprovação humana ainda não realizados.
- **BLOCKED:** dependência ou divergência confirmada impede aceitar o gate.

## Heads e PRs

Refs consultados diretamente:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA `qa/release-readiness-2026-11-04-master`: `8a118c839dbafb68b8461f127aaa35cc54bacbe3`.
- QA está 212 commits à frente e 1 atrás de `master`.

| PR | HEAD | Estado | Evidência CI observada |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Open, Draft | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open, Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS; baseline histórico limitado |
| #76 Team Lite | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Open, Draft | Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) SUCCESS |
| #82 QA | `8a118c839dbafb68b8461f127aaa35cc54bacbe3` | Open, Draft | Validate [42961138512](https://github.com/Reekyi/UpStatus/actions/runs/42961138512) FAILURE: `production updateURL mismatch` |
| #143 dispatcher Normal | `8bf9b35cee05b303f51a8cbac691b391d22c41fe` | Open, Draft; empilhada sobre a candidata #142 | [42963429737](https://github.com/Reekyi/UpStatus/actions/runs/42963429737): `offline_guard` SUCCESS; deploy SKIPPED |

Não há reviews registradas nas PRs #74, #75, #76, #82 e #143. A #143 tem base `fix/normal-beta10-api-parity-20261111`, não `master`; o workflow de PR filtra base `master`, então o sucesso observado foi no push da branch candidata. Não é aprovação humana nem publicação.

## PR #143 — dispatcher Normal

O HEAD `8bf9b35` adiciona atestados de gates e aceitação física vinculados ao SHA do release e timestamps UTC, com validade máxima de sete dias e tolerância limitada para timestamps futuros. O helper e os testes também exigem:
- PR já integrada em `master`, merge commit igual ao SHA de release;
- última review APPROVED no HEAD da PR, por usuário humano allowlisted e diferente do autor;
- checks `offline_guard` e `validate` concluídos com sucesso no SHA exato; somente `deploy` e `Supabase Preview` podem ser skipped;
- versão estável superior à versão Normal atual;
- projeto/organização Supabase esperados, branch `main` saudável e sete versões de migrations presentes;
- deploy manual por `workflow_dispatch` na `master`, confirmação explícita e environment `production`;
- beta10 API primeiro e distribuição `upstatus` depois.

Limitações ainda abertas:
1. Atestados são variáveis de repositório, não assinaturas criptográficas nem prova independente de quem confirmou o teste físico.
2. A configuração de required reviewers do GitHub Environment `production` não pôde ser lida pelo conector; não afirmo que esteja protegida ou desprotegida.
3. O preflight valida nomes/versões do ledger, não os bytes dos SQLs originais.
4. Não há smoke pós-deploy nem compensação automática se o primeiro runtime publicar e o segundo falhar.
5. O dispatcher não publica `upstatus-signal`; a sinalização autenticada continua fora da cadeia de release.
6. O preflight exige `main` em `ACTIVE_HEALTHY`, mas o estado observado é `MIGRATIONS_FAILED`.

O workflow de produção em `master` ainda é o legado: publica somente `upstatus`, fixa versão em 3.4.7 e usa Supabase CLI `latest`. A #143 não está integrada e não autoriza release.

## Supabase — estado observado

Projetos:
- Produção: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, região us-west-2.
- Laboratório: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, região sa-east-1.

Edge Functions:
- Produção: 38 funções ACTIVE. `upstatus` v480 (SHA `bb2713ce…`), `upstatus-team-lite` v15 (SHA `2c13414a…`) e `upstatus-screen-share-3-1-1-beta10` v6 (SHA `f6c5f8a4…`). Não existe `upstatus-signal`.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Todas as funções listadas reportam `verify_jwt=false` no metadata. Isso, isoladamente, não prova ausência de autenticação; os handlers podem validar sessão/token customizado.

### Realtime

- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies, sete partições diretas; anon/authenticated têm SELECT/INSERT/UPDATE.
- Snapshot: 67 linhas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os userscripts embutidos nos runtimes Normal v480 (3.4.7) e Team Lite v15 (3.4.30) assinam `upstatus-screen-share-live-3-1-1-beta10`. Ambos usam o mesmo tópico beta10; os triggers PostgreSQL publicam no tópico legado acima. **Os canais não coincidem.**
- `upstatus_broadcast_messages` serializa OLD/NEW completo via `to_jsonb` e publica `db_change` com `private=false`.
- `upstatus_broadcast_remote_state` publica dados de comando/resultado com `private=false`.
- `upstatus_broadcast_users` publica status do usuário com `private=false`.
- As três funções são SECURITY DEFINER, `search_path=public`, retornam `trigger`, estão ligadas a triggers e têm EXECUTE efetivo para anon/authenticated. O Advisor reporta três WARN por papel. Não reproduzi invocação RPC direta; o retorno `trigger` exige cuidado ao interpretar o alerta. Os grants continuam desnecessários e o broadcast público é o risco concreto.
- A configuração Dashboard de acesso público não está disponível pelo conector; não foi feito teste externo.

### RLS, grants, Default ACL e Storage

Produção:
- Dez tabelas públicas com RLS e zero policies.
- Nove tabelas backend-owned concedem a anon e authenticated oito privilégios cada: DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. São 144 combinações tabela/papel/privilégio.
- RLS não protege TRUNCATE; nenhum comando destrutivo foi executado.
- `pg_default_acl`: 120 entradas para papéis clientes, distribuídas entre tabelas, sequences e funções.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada; zero policies próprias em `storage.objects`.
- Security Advisor: 10 INFO e 6 WARN.

Laboratório:
- 18 tabelas públicas com RLS e zero policies; nenhuma delas tem grants diretos para anon/authenticated.
- `realtime.messages` sem linhas; zero buckets Storage.
- Contagens de users, messages, sessions, rooms, memberships, signal events, rate limits, call attempts, voice attempts e chat reads: todas zero.
- `pg_default_acl`: 96 entradas para papéis clientes; portanto o laboratório está isolado e limpo, mas não totalmente endurecido para objetos futuros.
- Security Advisor: 18 INFO e zero WARN.

### Migrations

Ledger de produção contém sete versões:
- `20261005160000 upstatus_cloud`
- `20261005173000 remote_realtime`
- `20261005180000 client_presence`
- `20261023154754 create_upstatus_visual_config`
- `20261026195855 add_chat_message_file_name`
- `20261027154329 allow_chat_document_mime_types`
- `20261027155438 set_upstatus_upload_limits_20mb`

A pasta `supabase/migrations` em `master` contém somente os três primeiros SQLs. Os quatro SQLs posteriores não estão versionados em master. A branch Supabase `main` está `MIGRATIONS_FAILED`, embora o projeto principal esteja `ACTIVE_HEALTHY`. O preflight #143 falha fechado nesse estado. A #140 melhora comparação estática de uma migration candidata, mas não recupera a proveniência byte a byte nem executa a migration.

## Chat, onboarding e voz — inspeção de código

- `public.messages`: 279 linhas; cinco registros `type=document`; os cinco têm `file_name IS NULL` (na fotografia, todas as 279 linhas têm `file_name IS NULL`).
- Signed upload existe nos runtimes. A rota valida MIME/tamanho declarados pelo cliente e emite upload assinado; não inspecionei bytes reais nem executei upload.
- `/api/chat/clear` no runtime Normal v480 ainda compara `name !== "Ricardo"` e retorna 403 para os demais, apesar de existir helper `admin(name)` baseado em `implementation_admin`.
- `/api/setup` chama `login(req,true)`; o handler exige conta existente sem senha, mas não exige token de convite. O fallback de papel administrativo usa nomes fixos.
- `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse caso pode cair no fallback HTTP 500. É inspeção estática, não teste HTTP real.
- A sinalização server-mediated não está implantada em produção e não foi encontrada nos bundles atuais como transporte privado obrigatório.

## Issues e aceitação manual

- Issue #78 permanece OPEN; os oito critérios físicos continuam desmarcados (0/8). Não houve teste real de perda de internet, recuperação sem F5, reentrada, novas chamadas, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 recebeu checkpoint e atualização no comentário QA existente. O comentário da Engenharia foi preservado; nenhum comentário duplicado foi criado.
- Nenhum teste manual, browser real, chamada HTTP contra a Edge Function ou teste local foi executado nesta rodada. Os resultados listados são CI existente ou CODE INSPECTION.

## Gates da QA

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcast público e tópico dos triggers divergente dos clientes |
| TEST-ISOLATION | in_progress | Projeto isolado limpo, mas Default ACL ainda ampla e não é TEST full-product |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs do ledger ausentes de master; main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Estruturas e sinalização autenticada ausentes em produção; onboarding sem token |
| ACL-STORAGE | blocked | Grants/MAINTAIN/TRUNCATE, Default ACL e buckets públicos sem policies |
| RECONNECT | pending | Depende dos testes físicos sem F5 em Normal e Team Lite |
| HUMAN-REVIEW | pending | PRs continuam Draft/sem review e sem autorização explícita de release |

## Veredito

**NOT READY.** Prioridade: corrigir o Realtime público e a divergência de tópicos; endurecer grants/Default ACL/Storage; recuperar os SQLs e diagnosticar `MIGRATIONS_FAILED`; integrar AUTH-03 e signaling autenticado; corrigir o contrato de chat; consolidar os workflows Normal/Team Lite; depois executar os testes físicos e obter revisão/aprovação humana.

Nenhuma produção foi modificada. Nenhum deploy, merge, migration, release, alteração de secrets/flags/roles/grants/policies ou publicação de userscript ocorreu. As únicas escritas desta rodada foram este relatório documental na branch QA e a atualização do comentário QA da Issue #79.
