# Auditoria independente UpStatus — 2026-11-16 13:44 UTC

**Execução:** 2026-11-16T13:46:56.277Z
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.
**Método:** inspeção read-only de refs, PRs, issues, commits, workflows, logs Edge, código-fonte implantado/candidato, catálogo PostgreSQL, Security Advisor e ledger de migrations. Não foram iniciados testes, deploys ou workflows pela QA.

## 1. Heads reais

| Ref | HEAD observado | Estado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | sem proteção de branch |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | sem proteção de branch |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | sem proteção de branch |
| QA `qa/release-readiness-2026-11-04-master` | `789e94f6f98ba08b468725d437a0c54843c62138` | sem proteção; igual ao HEAD da #82 |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | aberta / Draft |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta / Draft |
| PR #76 | `00a578e9174e08238a1289a35feb02d171625421` | aberta / Draft |
| PR #82 | `789e94f6f98ba08b468725d437a0c54843c62138` | aberta / Draft |

PR #76 é descendente direto do HEAD da #75: comparação entre os SHAs mostra 330 commits à frente e zero atrás. #76 é a linha Team Lite mais recente; #75 é uma base histórica, não uma entrega paralela independente.

## 2. PRs, commits e CI

| PR | Evidência no HEAD observado | Classificação |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD `dcaf6a0` | **CI PASS**. Smoke reportou 19/19 verificações não autenticadas e 136/136 autenticadas; Chromium negociou WebRTC de chamada, voz e tela, com entrega de áudio/vídeo e teardown. Também passaram fanout/ACL de sala, rate limit de sinalização (90 aceitas, 1 rejeitada com 429), concorrência de recibos de leitura e consumo atômico de convite. O teste de rate limit de emissão de convite foi SKIPPED. Não é teste físico no Sale Smartly/Tampermonkey. |
| #75 Team Lite | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS no HEAD antigo | **PASS histórico**. Está contida na linha mais nova #76. |
| #76 Team Lite | [Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD `00a578e` | Job `signed-upload-contracts` PASS; `candidate-checks` falhou na primeira checagem HTTP real ao laboratório. `/health` retornou 402 em vez de 200 e as 16 verificações não autenticadas retornaram 402 em vez dos códigos esperados. O corpo informa `exceed_edge_functions_invocations_quota` e orienta o proprietário a atualizar o plano ou remover spend caps. Os testes autenticados, Playwright, IIFE completo e demais integrações foram SKIPPED após a falha. É bloqueio de infraestrutura, não prova de regressão funcional do código. |
| #82 QA | [Validate 43869616955](https://github.com/Reekyi/UpStatus/actions/runs/43869616955): FAILURE no HEAD `789e94f` | A validação falha em `scripts/validate.mjs:26` com `production updateURL mismatch`. A PR é documental; o erro vem do build herdado de `master`, não do conteúdo do relatório. |

### Qualidade dos testes e compatibilidade

- O Smoke da #74 é evidência de CI em Chromium e integração isolada, não de instalação real no Tampermonkey, permissões do Sale Smartly, microfone/câmera/tela físicos ou recuperação após perda de internet.
- O job de upload da #76 usa VM/mocks. Ele valida contratos de origem, rota, bucket, caminho, token, MIME e tamanho; não realizou PUT real ao Storage.
- O cliente Team Lite usa PUT sem credenciais e com `redirect: error`. O servidor assina a URL antes do upload e valida MIME/tamanho declarados, mas não inspeciona os bytes efetivamente enviados. Um cliente pode declarar um MIME permitido e enviar conteúdo diferente; falta validação de conteúdo real no caminho assinado.
- Os dois candidatos Normal e Team Lite mantêm `signalTransportFlag` desligado por padrão (`GM_getValue(..., false) === true`), não configuram `private: true` nem chamam `realtime.setAuth()`. O fallback de Realtime público continua ativo; o transporte autenticado candidato não fecha RT-01 enquanto permanecer opt-in.
- Ambos os candidatos incluem `setupToken` e consumo de `consume_upstatus_setup_invite`. A candidata Team Lite também chama `consume_upstatus_setup_invite_rate_limit`; a candidata Normal não contém essa chamada. Há diferença de cobertura de rate limit de emissão entre produtos.

## 3. Workflows e distribuição

- `master/.github/workflows/deploy-test.yml` usa o secret genérico `SUPABASE_PROJECT_ID` e Supabase CLI `latest`. `develop` usa o mesmo secret/CLI e também dispara em push para `develop`, podendo publicar automaticamente `upstatus-test` no projeto configurado.
- A candidata #74/#76 melhora o guard: exige `SUPABASE_TEST_PROJECT_ID`, rejeita o projeto de produção e o laboratório de sinalização, valida o formato do project ref e fixa a CLI em `2.122.1`. Porém não existe um terceiro projeto Full-Product TEST; a organização consultada tem somente produção e laboratório de sinalização. A função `upstatus-test` v281 está presente no projeto de produção.
- `team-lite-official/.github/workflows/deploy-production.yml` usa `SUPABASE_PROJECT_ID`, CLI `latest` e executa `supabase functions deploy upstatus`, que é o slug Normal, não `upstatus-team-lite`. Não há preflight suficiente de projeto, SHA e migrations. #76 não corrige esse workflow. **Não despachar esse workflow.**
- Em `master`, `scripts/build.mjs` constrói o API base Normal apontando para `upstatus-screen-share-3-1-1-beta10` e também deriva o updateURL desse endpoint. Porém `release.json` e `scripts/validate.mjs` exigem a distribuição `/upstatus/upstatus.user.js`. Isso explica o `production updateURL mismatch` de #82. A correção candidata da #74 usa `release.scriptUrl` e exige correspondência exata, mas ainda não está em `master`.
- As branches `master`, `develop`, `team-lite-official` e QA estão sem proteção reportada pelo endpoint de branches; as quatro PRs avaliadas continuam Draft e sem reviews humanas registradas.

## 4. Edge Functions e disponibilidade

### Produção

- Projeto `ACTIVE_HEALTHY`; inventário observado: 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova acesso anônimo: os handlers inspecionados também validam `x-upstatus-token`, hash da sessão e expiração.
- Funções relevantes: `upstatus` v480, userscript Normal 3.4.7; `upstatus-screen-share-3-1-1-beta10` v6; `upstatus-team-lite` v15, Team Lite 3.4.30; `upstatus-test` v281.
- Agregação de logs até 13:43:11 UTC encontrou **18.481 respostas HTTP 402** na janela de 24 horas: `/api/chat` 9.833; `/api/status` 4.296; `/api/remote-status` 4.288; `/api/account` 30; `/api/members` 15; `/api/me` 15; download `/upstatus/upstatus.user.js` 4. A última resposta 402 observada foi 13:43:11 UTC.
- O userscript Normal 3.4.7 implantado usa beta10 como API base; por isso chat, status e remote-status dependem do endpoint com 402. Não houve chamada `/api/login` ou `/api/setup` nessa agregação; não afirmo que o POST de login em si foi observado falhando.
- Os logs de produção mostram status 402, mas não expõem o código/mensagem da restrição. O projeto está ACTIVE_HEALTHY, o que não elimina uma restrição específica de invocações Edge. **Não está provado que a produção tenha a mesma causa exata do laboratório.**
- Há drift adicional: a função implantada beta10 v6 contém userscript `3.1.1-beta8`, com updateURL/downloadURL para o slug beta8. O Normal 3.4.7 aponta para beta10; o Team Lite 3.4.30 aponta para `upstatus-team-lite` e sua função está ACTIVE. Não há evidência nesta coleta de que chamadas Team Lite estejam retornando 402; não declarar Team Lite indisponível sem teste.

### Laboratório de sinalização

- Projeto `bfpjtfqlnypisxljoxkb`, `ACTIVE_HEALTHY`, com `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3; não é Full-Product TEST.
- Logs registraram 44 respostas 402 em 14 rotas entre 12:37:25Z e 12:41:42Z, incluindo `/health`, autenticação, salas, sinalização e rota inexistente. O log do CI #76 contém a mensagem explícita `exceed_edge_functions_invocations_quota`: o projeto está restrito e o proprietário precisa atualizar o plano ou remover spend caps.
- A quota do laboratório está confirmada como causa do bloqueio do CI #76. Não houve alteração de plano, spend cap, secret ou configuração pela QA.

## 5. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- Dez tabelas de aplicação em `public` têm RLS habilitado e zero policies. Nove delas concedem a `anon` e `authenticated` SELECT/INSERT/UPDATE/DELETE e TRUNCATE diretamente.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; `anon` e `authenticated` têm SELECT/INSERT/UPDATE. O snapshot contém 106 mensagens, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Três triggers públicos chamam funções SECURITY DEFINER: `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`. Todas usam `search_path=public` e têm EXECUTE para `anon`, `authenticated` e `service_role`. O Security Advisor reporta três avisos anon e três authenticated.
- `upstatus_broadcast_messages` transmite `to_jsonb(OLD/NEW)` completo via `realtime.send` no tópico público; os triggers de remote-state e users também publicam eventos nesse tópico.
- Buckets `chat-images` e `profile-images` são públicos, com limite de 20 MiB. `storage.objects` tem RLS, zero policies próprias e grants SELECT/INSERT/UPDATE/DELETE para `anon` e `authenticated`.
- Default ACLs do owner `postgres` em `public` e `storage` concedem a `anon`/`authenticated` privilégios amplos de tabelas, funções e sequences. Há também default ACLs amplas de `supabase_admin` em `public`, `graphql` e `graphql_public`. A correção de tabelas existentes, isoladamente, não elimina esse risco de objetos futuros.

### Laboratório

- Dezoito tabelas de aplicação em `public` têm RLS sem policies, mas não há grants diretos de tabela para `anon`/`authenticated` nesse schema. O Security Advisor reporta 18 achados INFO e nenhum WARN de SECURITY DEFINER executável por anon/authenticated.
- As três funções trigger SECURITY DEFINER do laboratório têm `search_path` vazio e EXECUTE apenas para `service_role`. Ainda existem grants/default ACLs amplos no schema `storage` e default ACLs amplas de `supabase_admin` em schemas públicos; o laboratório não é prova de que toda a ACL está fechada.

## 6. AUTH-03 e migrations

- Os runtimes implantados Normal, beta10 e Team Lite ainda aceitam primeiro setup sem `setupToken`, aplicam fallback de papel por nome quando `role` está vazio e autorizam `/api/chat/clear` pelo nome literal `Ricardo`. O setup legado não exige convite de uso único. Normal exige senha inicial de pelo menos seis caracteres; Team Lite tem regra diferente no runtime atual.
- Produção não possui as colunas/RPC de convite de primeiro acesso observadas no candidato. Os templates candidatos incluem `setupToken` e `consume_upstatus_setup_invite`; a aplicação em produção não foi feita.
- Ledger de produção: 7 migrations. Ledger do laboratório: 39. A branch gerenciada `main` da produção permanece `MIGRATIONS_FAILED`, embora o projeto e o preview apareçam `ACTIVE_HEALTHY`.
- Quatro SQLs presentes no ledger remoto continuam 404 tanto em `master` quanto na branch QA: `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql` e `20261027155438_set_upstatus_upload_limits_20mb.sql`. Não reconstruir essas migrations por inferência.

## 7. Issues e validação manual

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN, **0/8** critérios físicos concluídos. Não houve teste Tampermonkey/Sale Smartly com queda/retorno de internet, reentrada em sala sem F5, microfone real, tela real ou interoperabilidade instalada.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN, **16/35** itens marcados. O comentário QA dedicado `<!-- UPCONTROL:QA -->` foi atualizado in-place; nenhum comentário da Engenharia foi alterado.
- Não há aprovação humana nas PRs #74, #75, #76 e #82.

## 8. Gates

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | **blocked** | Tópico público, zero policies, grants amplos; candidatos mantêm flag autenticada false por padrão e não configuram canal privado. |
| TEST-ISOLATION | **blocked** | Não existe projeto Full-Product TEST; o laboratório de sinalização está bloqueado por quota Edge. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; branch gerenciada `main` em `MIGRATIONS_FAILED`. |
| AUTH-03 | **blocked** | Runtime de produção continua com setup legado, fallback nominal e autorização nominal para limpar chat. |
| ACL-STORAGE | **blocked** | Grants e default ACLs amplos, buckets públicos, zero policies em Storage. |
| RECONNECT | **pending** | Issue #78 0/8; CI não substitui teste físico sem F5. |
| HUMAN-REVIEW | **pending** | PRs em Draft, sem reviews; sem autorização humana de release. |

## 9. Próximos passos

1. O proprietário do projeto de laboratório deve restaurar as Edge Functions atualizando o plano ou removendo o spend cap; depois repetir Candidate Checks #76.
2. Investigar no painel Supabase a causa específica dos 402 em produção; não presumir que seja a mesma quota do laboratório.
3. Corrigir o build/updateURL em `master` e criar um Full-Product TEST separado antes de permitir qualquer deploy-test.
4. Corrigir o workflow de produção Team Lite para o slug correto e adicionar preflight de projeto, SHA, migrations e aprovação; não despachar o workflow atual.
5. Tornar o transporte autenticado padrão, retirar fallback público de eventos sensíveis, alinhar tópicos e revisar triggers SECURITY DEFINER, RLS, grants e default ACLs.
6. Recuperar os quatro SQLs originais e diagnosticar a branch gerenciada `main`; não aplicar migrations em produção nesta etapa.
7. Fechar AUTH-03 com rate limit e paridade Normal/Team Lite, depois obter autorização explícita antes de qualquer aplicação.
8. Executar os oito critérios físicos da #78 e obter review humana antes de release.

## Veredito

**NOT READY.** Não recomendar merge, deploy, release ou publicação de userscripts.

Nenhum teste foi executado pela QA nesta rodada; foram inspecionados resultados de CI existentes, código e dados read-only. Nenhuma migration, escrita SQL, alteração de produção, deploy, merge, release, publicação, secret, flag, role, grant, policy, ACL ou fixture foi realizada. A única escrita desta execução é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.