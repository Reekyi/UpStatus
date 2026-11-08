

## Revalidação independente — JWT por função, deploy Team Lite e AUTH-03 (2026-11-08 12:34 BRT)

### Estado do checkpoint QA antes deste append
- Branch: `qa/release-readiness-2026-11-04-master`.
- HEAD lido imediatamente antes da atualização: `588e5c0500b0a6fcd81dfa6a14780739fad87977`.
- Blob de `docs/RELEASE_READINESS.md` lido imediatamente antes da atualização: `3f8e58556209ce02a22f2a2c0df4b9b48b9b0e75`.
- A atualização abaixo foi construída sobre esse conteúdo e será publicada com lease no HEAD `588e5c0500b0a6fcd81dfa6a14780739fad87977`; se a branch mudar antes do update, não sobrescrever.

### PRs e CI observados nos HEADs atuais

| PR | Base / HEAD | Estado | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master `a9288cc` / `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Open / Draft | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) e Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS no HEAD informado |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official `9065bc1` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS histórico; baseline, não candidata independente |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official `9065bc1` / `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Open / Draft | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master `a9288cc` / `588e5c0500b0a6fcd81dfa6a14780739fad87977` | Open / Draft | Validate [42490869141](https://github.com/Reekyi/UpStatus/actions/runs/42490869141) FAIL em `scripts/validate.mjs:26`: `production updateURL mismatch`, contrato herdado da base master |
| [#85](https://github.com/Reekyi/UpStatus/pull/85) | master / `b75707b6eaf678d87863144748b9aed8e2866455` | Open / Draft | Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS; diagnóstico de cutover continua BLOCKED por versão/migrations |
| [#88](https://github.com/Reekyi/UpStatus/pull/88) | #85 / `f04d18d780ffc355b6bad457b8a12ef9fe07f82b` | Open / Draft | Guard offline [42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) SUCCESS |
| [#89 AUTH-03 Normal](https://github.com/Reekyi/UpStatus/pull/89) | #88 / `4224dc31683d4b235e52d2ddcece1570294763f0` | Open / Draft | [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) SUCCESS no HEAD exato; Validate offline, RPC real no laboratório allowlisted, regressões do guard e cleanup |
| [#90 runner safety](https://github.com/Reekyi/UpStatus/pull/90) | #76 / `47e0b8760587e52448cf5954d823b00131b941fa` | Open / Draft | [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) SUCCESS no HEAD exato; redirect rejeitado no runner AUTH-03 |
| [#91 Team Lite artifact parity](https://github.com/Reekyi/UpStatus/pull/91) | #76 / `cb65cb831910d384715addf98285d01a273e2c6a` | Open / Draft | [42488110607](https://github.com/Reekyi/UpStatus/actions/runs/42488110607) SUCCESS no HEAD exato; build 3.4.31 e artefato API embutido byte-a-byte igual ao userscript |
| [#92 Team Lite JWT config](https://github.com/Reekyi/UpStatus/pull/92) | #91 / `2a1b8c74a255b92fe17844b521b49f184888f852` | Open / Draft | [42493683062](https://github.com/Reekyi/UpStatus/actions/runs/42493683062) SUCCESS no HEAD exato |
| [#93 Normal JWT config](https://github.com/Reekyi/UpStatus/pull/93) | #89 / `fb9ccd9b9aa69a329e7340f87fc8b07c82618bbe` | Open / Draft | [42493686213](https://github.com/Reekyi/UpStatus/actions/runs/42493686213) SUCCESS no HEAD exato |

As PRs acima continuam abertas, Draft, não mescladas e sem reviews humanas registradas na consulta desta rodada. Os resultados de #74/#76 são automatizados nos HEADs citados; #78 continua exigindo aceitação física. #75 é baseline histórico e não deve ser tratada como segundo payload de release.

### Novo risco de deploy — verify_jwt por função

A inspeção dos quatro runtimes operacionais confirma `verify_jwt=false` hoje:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`;
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`;
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`;
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.

Os handlers usam sessão customizada UpStatus (`x-upstatus-token`). A documentação oficial do Supabase informa que Edge Functions exigem JWT válido por padrão e que `verify_jwt` pode ser configurado por função em `supabase/config.toml`: [Function Configuration](https://supabase.com/docs/guides/functions/function-configuration). Sem configuração explícita, um deploy CLI poderia restaurar a validação JWT no gateway e rejeitar clientes antes do handler customizado.

Correções candidatas:
- #92 adiciona exatamente uma seção `[functions.upstatus-team-lite] verify_jwt = false`; o guard rejeita ausência, `true`, duplicatas, comentário-only e configuração malformada.
- #93 adiciona `[functions.upstatus-screen-share-3-1-1-beta10] verify_jwt = false` e valida também `upstatus` e `upstatus-test`.
- Os logs dos runs 42493683062 e 42493686213 confirmam os testes positivos/negativos e o Validate offline completo da linha Normal.
- Blobs atuais dos arquivos de configuração: #92 `supabase/config.toml` `cc4a415c0f3d18e8d62ae43b1e979fe3d7d63326`; #93 `supabase/config.toml` `b623947c0a5c47a4a642766fcfce9125551f3077`.

São guards offline. Não houve deploy nem mudança nos runtimes.

### Novo bloqueador P0 de Team Lite — workflow de produção aponta para a função errada

Inspecionei `.github/workflows/deploy-production.yml` na branch de #92:
- Blob SHA: `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`.
- É `workflow_dispatch`, mas o job executa `supabase functions deploy upstatus`.
- Não implanta `upstatus-team-lite`.
- Não verifica explicitamente `GITHUB_REF=master`, checkout SHA, project ref esperado, migrations AUTH-03, nem rollback.
- Portanto, esse workflow não é um procedimento válido de release Team Lite e, se despachado no contexto errado, pode tentar implantar a função Normal `upstatus` no projeto indicado pelo secret.

**Não executar esse workflow.** A existência do guard JWT #92 não corrige o alvo incorreto. É necessário um workflow Team Lite manual-only, SHA-pinned, project-verified, com migrações/versão/artefato alinhados, deploy da função `upstatus-team-lite`, ordem documentada e rollback. Nenhum workflow foi despachado pela auditoria.

O `deploy-test.yml` nessa linha exige `vars.SUPABASE_TEST_PROJECT_ID` independente e recusa tanto produção quanto o laboratório de fixtures. Como não existe projeto TEST full-product, esse caminho permanece bloqueado.

### Divergência adicional de Storage na configuração candidata

Os dois `supabase/config.toml` candidatos declaram:
- `chat-images`: público, 25 MB;
- `profile-images`: público, 2 MB.

O catálogo de produção confirma ambos públicos com limite de 20 MiB e zero policies em `storage.objects`. Os workflows inspecionados usam `supabase functions deploy` e não fazem push de configuração de Storage; portanto, a divergência não foi aplicada nesta rodada. Ainda assim, é drift de configuração e precisa ser resolvido antes de qualquer operação que sincronize config/buckets. Não alterar buckets sem plano/autorização.

### AUTH-03 — confirmação de schema, runtime e lacuna de onboarding

A integração da #89 [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) executou o runner de mutação somente contra `https://bfpjtfqlnypisxljoxkb.supabase.co`, com `UPSTATUS_AUTH_ALLOW_MUTATION=1`, secret service-role isolado e rejeição de redirects. O log confirma NULL/empty eligibility, configured-account denial, token malformed/wrong/expired/replayed, exatamente um vencedor concorrente, normalização/preservação de papel, padded-admin non-escalation e cleanup. Isso exercita o RPC via PostgREST; **não** é requisição HTTP a uma Edge Function candidata implantada.

Consulta independente pós-run no laboratório:
- quatro colunas presentes: `setup_token_hash`, `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at`;
- `consume_upstatus_setup_invite(text,text,text)` presente, SECURITY INVOKER, `search_path=""`, EXECUTE somente para service_role;
- zero users, sessions, messages, chat_reads, rooms, members, bindings, events, rate limits, call attempts, voice attempts, objetos Storage e mensagens Realtime.

Produção permanece sem as quatro colunas e sem a RPC; possui 5 usuários, zero password_hash vazio e zero role vazio. As três migrations AUTH-03 são source-only na #89 e não foram aplicadas.

Inspeção dos userscripts Normal (#89) e Team Lite (#76): ambos têm campo `setupToken` para consumir convite, mas não encontrei chamada cliente a `/api/setup-invite` nem UI administrativa de emissão. Os templates de servidor possuem a rota de emissão, protegida por papel persistido. Gate operacional: adicionar UI administrativa ou documentar procedimento seguro de emissão/entrega, e testar a rota HTTP com administrador e não-administrador.

Inspeção direta das quatro fontes implantadas confirma que produção ainda expõe `/api/account?name=...` com `needsSetup` sem sessão, aceita first-caller setup em `/api/setup` para contas sem password_hash e atribui fallback de papel por nomes Ricardo/Lohan/Guilherme. `/api/chat/clear` continua baseado somente no nome Ricardo; `deleteRoute` mantém `name === "Ricardo" || await admin(name)`. Isso é risco latente de onboarding/revogação, não evidência de conta atual sem senha. Os candidatos removem a enumeração e exigem token de uso único; nenhuma correção foi implantada.

### Supabase — fotografia read-only atual

Management API lista somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions ACTIVE.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, 2 funções de teste.
- Não existe projeto TEST full-product independente.

A branch gerenciada `main` da produção ainda reporta `MIGRATIONS_FAILED`, enquanto `preview_project_status=ACTIVE_HEALTHY` e o projeto principal está ACTIVE_HEALTHY. A causa não foi obtida; não classificar isso como falha do banco principal sem logs da branch.

Security Advisor:
- Produção: 6 WARN (3 SECURITY DEFINER executáveis por anon + as mesmas 3 por authenticated) e 10 INFO de RLS sem policy; Performance/Health sem findings.
- Laboratório: zero WARN, 17 INFO de RLS sem policy, 4 índices não utilizados apenas informativos; Health sem findings.

Produção:
- Nove tabelas backend-owned com RLS e zero policies concedem a anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` não concede esses privilégios. RLS sem policies bloqueia acesso normal às linhas, mas não protege TRUNCATE.
- Três broadcasts SECURITY DEFINER têm `search_path=public`, EXECUTE para anon/authenticated/service_role e usam `realtime.send(..., false)`. `upstatus_broadcast_messages` publica OLD/NEW completo via `to_jsonb`; remote-state publica comandos/resultados; user-status publica metadados.
- `realtime.messages`: 50 linhas, 7 partições, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE.
- Default ACLs amplas persistem para postgres em public/storage e supabase_admin em public/graphql/graphql_public. A sessão atual é postgres, sem superuser e sem membership em supabase_admin; ACL-02 permanece sem caminho administrativo autorizado.

Laboratório:
- Tabelas backend-owned consultadas têm RLS e zero policies, mas nenhum privilégio direto para anon/authenticated.
- Broadcasts SECURITY DEFINER usam `search_path=""` e EXECUTE somente para service_role, mas continuam publicando em canais com `private=false`.
- `realtime.messages`: zero linhas/partições, zero policies; anon/authenticated ainda têm SELECT/INSERT/UPDATE.
- Default ACLs de postgres em public estão restritas; storage ainda tem defaults amplos; supabase_admin mantém defaults amplos em public/graphql/graphql_public.

Storage de produção: `chat-images` e `profile-images` públicos, 20 MiB cada, zero policies em `storage.objects`. Laboratório não tem buckets de chat/perfil. Upload/download real continua não testado.

A Edge Function de laboratório `upstatus-signal-test` permanece v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`; ainda não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. Mapper candidato tem teste offline, sem validação HTTP real.

Logs solicitados para 24h: `function_edge_logs` retornou 468 eventos, todos entre 2026-11-07 17:06:12 UTC e 18:31:42 UTC (aprox. 1h25), não uma amostra completa de 24h. `edge_logs` retornou 1.624 eventos em intervalo maior, mas não foram tratados como contagem completa de invocações por função. Não estimar uso diário nem declarar runtimes históricos sem dependência.

### Issues e aceitação física

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN, 0/8 critérios físicos aprovados. Sem perda real de internet/retorno sem F5, reentrada, novas chamadas, microfone/display reais e interoperabilidade instalada.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN; corpo ainda indica 16/35 e não incorpora os novos gates #92/#93 nem o workflow Team Lite incorreto.

### Próximos gates desta revalidação

1. Corrigir o workflow Team Lite para implantar `upstatus-team-lite`, com project/SHA/version/migration preflight, rollback e revisão humana; não despachar o workflow atual.
2. Manter os guards explícitos `verify_jwt=false` nas funções que validam sessão customizada; revisar cada rota protegida porque o gateway JWT fica desligado.
3. Adicionar UI administrativa ou procedimento seguro para emitir setup invite; validar HTTP admin/non-admin e caminho end-to-end.
4. Fechar a janela migration→deploy e incluir Normal, beta10, Team Lite e upstatus-test no plano de corte; manter provisionamento congelado/protegido durante a janela.
5. Escolher versão estável superior a 3.4.7; atualizar manifesto, guard e rollback.
6. Resolver drift de Storage 25/2 MB versus 20/20 MiB antes de sincronizar config.
7. Confirmar escopo `database_migrations_read` do token de Management API; 403 deve falhar fechado; após migrations, validar catálogo read-only além do ledger.
8. Provisionar TEST full-product independente; validar HTTP 409 real.
9. Migrar Realtime para canais privados/server-mediated e retirar payload completo público.
10. Corrigir grants/Default ACLs com owner autorizado; definir Storage privado e testar upload/download real.
11. Esclarecer `MIGRATIONS_FAILED` da branch, completar testes físicos #78, reconciliar #79 e obter reviews humanas.

### Limites e segurança desta rodada

Todas as consultas SQL foram SELECT-only; Management API e fontes foram lidas. A integração mutável AUTH-03 foi executada pela pipeline de engenharia no projeto isolado allowlisted, não iniciada nem repetida pela auditoria; a consulta independente pós-run confirmou zero fixtures. Nenhuma migration, DDL, escrita SQL, deploy, merge, release, publicação, secret, flag, role, grant, policy, ACL ou fixture foi alterada pela auditoria. Nenhuma branch de engenharia ou issue foi modificada. Não houve teste físico. A única escrita desta rodada é este append na branch QA.
