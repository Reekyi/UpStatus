# Auditoria independente UpStatus - 2026-11-07 08:31 UTC

## Escopo e método

- Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus).
- Projetos Supabase: produção `dlfvkawaiqduhlazsszm`; isolado `bfpjtfqlnypisxljoxkb`.
- A leitura inicial de `docs/RELEASE_READINESS.md` foi feita na branch `qa/release-readiness-2026-11-04-master`. Blob SHA confirmado: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`.
- Heads de PR, workflows e logs foram consultados novamente nesta rodada. SQL usado somente em consultas SELECT e catálogos.
- Nenhum workflow foi iniciado, repetido ou cancelado pela auditoria. Nenhuma fixture foi alterada ou removida.
- Esta auditoria não executou testes HTTP contra produção nem contra o projeto isolado.

## 1. Heads reais e estado das PRs

| PR | Base | HEAD completo | Relação com a base | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `master` | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | 839 ahead / 0 behind | OPEN, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 commits | OPEN, Draft |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite-official` | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | 251 ahead / 0 behind de #75 | OPEN, Draft |
| [#82 QA docs](https://github.com/Reekyi/UpStatus/pull/82) | `master` | `a1ee1e0f986a9c73ee28c04c13b4401a8fb00cc6` | 89 ahead / 0 behind | OPEN, Draft |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `develop` | `3f69e530a3cae2c779c74cfb0cc1b7c64ac52cb2` | 10 ahead / 0 behind | OPEN, Draft |

Nenhuma das cinco PRs tem review humana submetida na consulta atual. #75 é baseline histórico; #76 é a linha Team Lite mais nova.

## 2. CI dos HEADs exatos

### Normal #74

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): **SUCCESS** no HEAD `7475a82e421c9286e6944ea17ee73afd39ed73d9`.
- Job `128350871265`: passou por `Test TEST build target guard` e `Validate build`.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): **QUEUED/PENDING**, sem jobs criados na consulta.

### Team Lite #76

- [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): **QUEUED/PENDING**, sem jobs criados na consulta.
- Não reutilizar os PASS de heads anteriores para certificar `87bbb2f`.

### Baseline #75

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico no HEAD atual do baseline. Não substitui os checks do #76.

### PR #84, hardening do TEST em develop

- [Validate 42354681766](https://github.com/Reekyi/UpStatus/actions/runs/42354681766): **FAIL** no HEAD `3f69e530a3cae2c779c74cfb0cc1b7c64ac52cb2`.
- Job `128350051506`: o novo build-target guard passou. A validação posterior falhou em `client signed upload helper missing`, `scripts/validate.mjs:67`.
- A asserção procura `function uploadFileDirect(file,route)`. A fonte `src/userscript/upstatus.user.template.js` de develop não contém esse helper; a fonte candidata #74 contém. Portanto, é uma divergência real entre develop e o candidato #74, não evidência de falha do guard.

### PR #82, QA docs

- [Validate 42352201112](https://github.com/Reekyi/UpStatus/actions/runs/42352201112): **FAIL** no HEAD documental anterior.
- Job `128342538779`: `production updateURL mismatch`, `scripts/validate.mjs:26`.
- Causa confirmada no build de master: `scripts/build.mjs` ainda monta o updateURL de produção a partir do endpoint legado `upstatus-screen-share-3-1-1-beta10`, enquanto o validador espera `/functions/v1/upstatus/upstatus.user.js`. A PR #82 é documental e não corrige esse código herdado.

**Classificação:** apenas o Validate do Normal passou no HEAD atual. O Smoke do Normal e o Candidate Checks do Team Lite ainda não começaram. Nenhum teste manual foi realizado nesta rodada.

## 3. TEST: correção de isolamento nos candidatos, ambiente completo ainda inexistente

### Correção positiva em #74 e #76

Os builders candidatos agora:
- Leem `UPSTATUS_TEST_PROJECT_ID`.
- Usam `00000000000000000000` como sentinel inerte quando não há alvo configurado.
- Rejeitam o projeto de produção `dlfvkawaiqduhlazsszm`.
- Rejeitam o projeto de fixtures `bfpjtfqlnypisxljoxkb`.
- Renderizam API e Realtime para o mesmo projeto TEST.
- Mantêm o artefato TEST não implantável quando só o sentinel está configurado.

O teste `scripts/test-build-target-guard.mjs` verifica o sentinel, um alvo não produtivo explícito e rejeições de produção/projeto de fixtures antes de escrita. O Validate atual do #74 passou por esse guard.

O artefato TEST gerado pelos candidatos **não aponta mais para produção por padrão**. Isso corrige o achado anterior. O endpoint legado `upstatus-test` continua implantado em produção, mas não é o destino do novo artefato candidato com sentinel.

### Bloqueio de infraestrutura

O inventário Supabase retornou somente dois projetos:
- Produção: `dlfvkawaiqduhlazsszm`.
- Isolado de signaling/auth: `bfpjtfqlnypisxljoxkb`.

Não existe um terceiro projeto completo de TEST. O projeto isolado tem somente `upstatus-signal-test` e `upstatus-signal-e2e-once`; não tem os endpoints completos Normal/Team Lite.

O workflow [deploy-test.yml no #74](https://github.com/Reekyi/UpStatus/blob/7475a82e421c9286e6944ea17ee73afd39ed73d9/.github/workflows/deploy-test.yml) é manual-only, exige `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto de fixtures, exige o token de acesso e fixa Supabase CLI 2.122.1. Também faz checkout de `develop`, não do HEAD da PR, e implanta somente `upstatus-test`. Não aplica migrations; um futuro projeto TEST precisará ter schema compatível provisionado por fluxo separado e verificado antes do deploy.

O guard usa uma denylist dos dois projetos conhecidos e aceita qualquer outro ref válido de 20 caracteres. Após criar o projeto completo, recomendo também uma allowlist positiva do ID aprovado, não apenas a denylist.

### Team Lite sem runtime TEST/deploy próprio

O builder compartilhado gera:
- Normal produção: `upstatus`.
- Normal TEST: `upstatus-test`.
- Team Lite produção: `upstatus-team-lite`.

Não gera uma função Team Lite TEST separada. Não encontrei `.github/workflows/deploy-team-lite.yml` nem `.github/workflows/deploy-team-lite-production.yml`. O workflow de produção consultado implanta somente `upstatus`.

O workflow [Team Lite Candidate Checks](https://github.com/Reekyi/UpStatus/blob/87bbb2f91ac21477d69f7945ec62598e2bc6dce7/.github/workflows/team-lite-candidate.yml) executa verificações estáticas do bundle/template Team Lite e testes contra o endpoint isolado `upstatus-signal-test`. Ele não implanta nem exercita o runtime completo `upstatus-team-lite` no projeto isolado. O mesmo limite vale para o Smoke Normal: o harness usa `upstatus-signal-test`, não o Edge Function candidato `upstatus`.

## 4. Divergência de backend no Normal

No builder do HEAD #74:
- `release.json` aponta distribuição/update para `/functions/v1/upstatus/upstatus.user.js`.
- `CLOUD_SERVER` de produção continua apontando para `/functions/v1/upstatus-screen-share-3-1-1-beta10`.
- `deploy-production.yml` implanta somente `upstatus`.

Logo, publicar o artefato via `upstatus` não garante que as chamadas API do cliente usem o runtime novo. O cliente ainda direciona chamadas ao backend beta10, que em produção está na versão 6. A validação atual não compara o API origin com o endpoint de distribuição. Isso precisa virar um gate explícito.

A variante de builder em #84 usa o mesmo projeto/função `upstatus` para API e updateURL, mas o Validate do #84 continua falhando no helper de upload citado acima.

## 5. AUTH-03 e AUTH-02

### AUTH-03: convite de primeiro acesso

Inspeção dos templates candidatos Normal e Team Lite confirma:
- `POST /api/setup-invite` exige sessão e papel administrativo armazenado.
- Token aleatório de 32 bytes; somente SHA-256 é persistido.
- Expiração curta de 15 minutos.
- `POST /api/setup` exige token hexadecimal de 64 caracteres.
- RPC `consume_upstatus_setup_invite(text,text,text)` consome token e define senha atomicamente.
- NULL/empty/ASCII-whitespace-only recebe `implementation_user`; papéis não vazios são preservados literalmente.
- Fallback administrativo por nome não aparece nos templates candidatos.
- Os candidatos limpam chaves antigas de senha em GM storage/sessionStorage e não voltam a persistir a senha em texto puro nos caminhos inspecionados.

No isolado, a RPC é SECURITY INVOKER, `search_path` vazio, EXECUTE somente para service_role. O teste cobre token inválido, malformado, expirado, replay, concorrência com um vencedor, papéis vazios e preservação literal de papel preenchido.

**Limite de cobertura:** `scripts/test-auth-enrollment.mjs` usa service_role para preparar fixtures e chama a RPC diretamente; não chama as rotas HTTP reais. Ainda faltam emissão HTTP por admin, HTTP 403 para não-admin, fluxo completo de emissão/consumo e prova de que o token bruto não aparece em logs. Não há botão de emissão no painel administrativo.

**Pequena inconsistência:** o helper `assert-isolated-supabase.mjs` sempre orienta a configurar `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`, mas o teste de enrollment recebe `UPSTATUS_AUTH_ALLOW_MUTATION=1`. O bloqueio funciona, mas a mensagem para execução manual é incorreta.

### AUTH-02: rate limit de login/setup ausente

Nos dois templates candidatos não há chamada a rate limiter para login ou setup. Nos dois bancos não existem `upstatus_auth_rate_limits` nem `consume_upstatus_auth_rate_limit`.

A senha mínima ainda diverge: Normal exige 6 no novo setup e aceita 4 no login legado; Team Lite aceita 4 no setup/login. A compatibilidade de login entre produtos é preservada, mas a política de novos enrollments não é uniforme.

## 6. Sinalização e Realtime

O endpoint isolado `upstatus-signal-test` v32 possui:
- Autenticação customizada por sessão `x-upstatus-token`.
- Rate limit distribuído por remetente/leitura/escrita.
- HTTP 429 com `Retry-After: 60`.
- Limite de corpo e validação de payload.
- Limpeza limitada de eventos, rooms e tentativas expiradas.

Isso aprova o endpoint isolado/harness, não a integração do produto: o transporte autenticado no bundle Team Lite é opt-in e fica desabilitado por padrão; o comentário do código mantém o caminho legado enquanto a aceitação browser/WebRTC não for concluída. Os testes atuais não demonstram o cutover do cliente para o endpoint novo.

### Produção

As três funções de broadcast continuam com SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated e triggers ativos:
- `upstatus_broadcast_messages()`: transmite a linha completa via `to_jsonb`.
- `upstatus_broadcast_remote_state()`: transmite metadados de comandos/resultados.
- `upstatus_broadcast_users()`: transmite nome/status/reason/updated_at/sync.

Os três broadcasts usam `private=false`.

### Isolado

As três funções de broadcast usam `search_path=pg_catalog, public`, EXECUTE negado a anon/authenticated e permitido a service_role. Os payloads foram reduzidos a `{op}`, mas ainda usam `private=false`. O Realtime privado não está concluído.

## 7. Supabase: inventário atual

### Produção

- Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations; última `20261027155438`.
- 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de auth em todas as rotas; as funções centrais usam sessão customizada, mas a revisão rota-a-rota das 38 ainda não terminou.
- Funções centrais: `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`; `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; screen-share beta10 v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- As quatro fontes centrais inspecionadas ainda têm setup público antigo, sem convite, fallback administrativo por nome e `/api/account` revelando `needsSetup`.
- Não existem setup-invite schema/RPC, signaling rate-limit schema/RPC, auth rate limiter ou read-receipt RPC.
- Consulta agregada de `public.users`: 5 contas, 0 senhas NULL/vazias, 0 papéis vazios, 3 administradores explícitos. Não há conta oficial atualmente sem senha; o risco é latente para provisionamentos futuros.

### Isolado

- Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 33 migrations; última `20261107061242`.
- Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Existem setup-invite RPC, signaling rate-limit RPC e `merge_chat_read_receipts`; auth rate limiter continua ausente.
- Fixtures não estão vazias na consulta SELECT: 4 users, 4 sessions, 16 rooms, 18 memberships, 1 event, 3 call attempts, 4 voice attempts e 6 rate-limit buckets. Ownership/origem não confirmada. Nenhuma limpeza foi feita.

## 8. RLS, grants, SECURITY DEFINER e ACL

### Produção

Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) têm RLS habilitado, zero policies e privilégios efetivos para anon/authenticated incluindo SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` não apresenta esses grants de cliente.

`realtime.messages`: RLS habilitado, zero policies, SELECT/INSERT/UPDATE para anon/authenticated.

### Isolado

As tabelas backend-owned e as tabelas de signaling consultadas não concedem os privilégios de cliente acima. `realtime.messages` ainda mantém SELECT/INSERT/UPDATE para anon/authenticated, apesar de RLS e zero policies.

### Advisor e default ACL

- Produção, observado em 2026-11-07 08:31 UTC: 6 WARN (3 funções SECURITY DEFINER executáveis por anon e as mesmas 3 por authenticated), 10 INFO RLS sem policies; performance e health sem findings.
- Isolado: 0 WARN; 17 INFO RLS sem policies; 4 INFO unused indexes; health sem findings.
- Default ACL de postgres em `public` agora restringe novos objetos a postgres/service_role. Em `storage`, anon/authenticated ainda aparecem nos defaults.
- Default ACL de `supabase_admin` continua amplo em `public`, `graphql` e `graphql_public`.
- Sessão SQL é `postgres`, sem superuser e sem membership em `supabase_admin`. ACL-02 continua parcialmente bloqueado por autoridade insuficiente.

## 9. Issues e testes manuais

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 25 comentários, 0/8 critérios marcados. Nenhum teste manual físico foi aprovado nesta rodada.
- [#79 release checklist](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 90 comentários. O corpo principal ainda usa snapshot de 2026-11-03. O comentário mais recente consultado é [6704431143](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6704431143), que registra o hardening de TEST, mas não reconcilia o corpo do checklist com os HEADs atuais.

## 10. Gates prioritários

1. Provisionar um projeto TEST completo e aprovado; aplicar/reconciliar migrations antes de qualquer deploy de função.
2. Criar teste runtime de Normal e Team Lite no projeto TEST, cada um com endpoint próprio; não tratar o harness `upstatus-signal-test` como substituto do backend completo.
3. Adicionar deploy/rollback explícito do Team Lite e garantir que o artefato distribuído use o backend que recebe o deploy.
4. Corrigir o mismatch Normal: updateURL em `upstatus`, API em beta10; adicionar asserção que exija mesmo projeto/função ou documentar um cutover legado deliberado.
5. Concluir Smoke Normal e Candidate Checks Team Lite nos HEADs exatos atuais.
6. Testar enrollment pelas rotas HTTP reais e disponibilizar fluxo administrativo de emissão.
7. Implementar rate limit distribuído e fail-closed de login/setup; unificar política de novas senhas.
8. Planejar migração de autenticação nas funções legadas de produção, com inventário de consumidores/rollback antes de retirar endpoints antigos.
9. Integrar signaling autenticado no produto, habilitar somente após E2E real e migrar Realtime público para autorização privada.
10. Reduzir grants de cliente nas tabelas de produção, resolver ACL-02 com autoridade apropriada e revisar grants de `realtime.messages`.
11. Executar os oito critérios manuais da #78; reconciliar #79; obter reviews humanas.

## Registro de segurança desta rodada

- SQL somente SELECT/catálogos.
- Nenhuma migration, deploy, alteração de Edge Function, secret, flag, role, grant ou policy.
- Nenhuma fixture criada, alterada ou removida.
- Nenhum workflow iniciado, repetido ou cancelado.
- Nenhum merge, release ou publicação de userscript.
- Nenhuma branch de engenharia alterada.
- Única escrita planejada: este novo relatório documental na branch QA dedicada.

**Veredito:** manter #74, #75, #76, #82 e #84 em Draft. O guard de TEST melhorou e o Validate Normal passou, mas os workflows de integração atuais ainda não começaram; o projeto TEST completo não existe; o runtime Team Lite não tem caminho de deploy/teste próprio; o backend Normal distribuído ainda aponta para beta10; e os bloqueadores de autenticação/Realtime em produção permanecem. Não atribuir percentual de conclusão.
