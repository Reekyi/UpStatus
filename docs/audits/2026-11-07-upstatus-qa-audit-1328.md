# UpStatus — auditoria independente de qualidade
**Snapshot:** 2026-11-07, 10:28–10:34 BRT (13:28–13:34 UTC)  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Modo:** inspeção de código, workflows, logs existentes e consultas SQL somente leitura. Nenhum teste mutável foi iniciado pela auditoria.

## 1. Sumário executivo

- Normal #74 e Team Lite #76 têm CI **SUCCESS** nos HEADs atuais. Os testes de integração/browser são executados contra o endpoint isolado `upstatus-signal-test`, não contra os runtimes completos candidatos Normal e Team Lite.
- A proteção do builder TEST e a versão candidata do workflow de deploy passaram no Validate da #84. A proteção ainda **não está na branch develop**: o workflow de develop mantém gatilho `push`, usa o secret compartilhado `SUPABASE_PROJECT_ID` e não valida a identidade do projeto.
- A organização Supabase continua com apenas dois projetos: produção e laboratório de signaling/auth. Não existe ambiente TEST full-product.
- O builder Normal da #74 continua com UpdateURL em `upstatus`, mas CLOUD_SERVER em `upstatus-screen-share-3-1-1-beta10`. A função implantada para distribuição e a função usada pela API não são a mesma.
- O builder Team Lite gera somente `upstatus-team-lite`; não gera `upstatus-team-lite-test`. O workflow TEST deploya somente `upstatus-test`.
- Produção continua sem setup-invite, sem rate limit de autenticação e sem as RPCs/tabelas de signaling/read-receipts do candidato. Os quatro runtimes centrais inspecionados ainda têm setup público legado e fallback administrativo baseado no nome.
- Produção continua com três triggers de broadcast público. O broadcast de mensagens transmite a linha completa. O Security Advisor registra 6 WARN de SECURITY DEFINER e 10 INFO de RLS sem policy.
- Não houve teste manual de Tampermonkey, queda real de rede, microfone ou captura física de tela. A issue #78 permanece 0/8.

**Veredito:** manter #74, #75, #76, #82 e #84 em Draft. Não liberar, não fazer merge e não executar deploy enquanto os gates de infraestrutura, autenticação, Realtime e aceitação física permanecerem abertos.

## 2. Heads e estado das PRs

| PR | Branch | HEAD completo | Base | Comparação | Estado |
|---|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | master | 839 / 0 | Open, Draft |
| [#75 baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Open, Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | team-lite-official | 310 / 0 | Open, Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` | `3227d62160de28a8eacee462d87bcd3eea502adc` | master | 95 / 0 | Open, Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `safety/test-deploy-target-guard-20261107` | `66ccc65af430dfee55560e90e1f832336fff0212` | develop | 29 / 0 | Open, Draft |

A #76 está 251 commits à frente da #75 e zero atrás. #75 é o baseline histórico; #76 é a linha Team Lite atual. As PRs consultadas não possuem aprovação humana submetida. O tamanho do histórico de #74 (839 commits à frente de master) e #76 (310 à frente de team-lite-official) exige revisão de merge-base e de escopo, não apenas confiança no status de CI.

### Evidência de CI por HEAD

| Candidato | Workflow | Resultado | Escopo observado |
|---|---|---|---|
| #74 | [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) | SUCCESS | Build, contratos estáticos, layout de migrations, regressões |
| #74 | [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) | SUCCESS | 19/19 não autenticados; 129/129 autenticados; Chromium/WebRTC; concorrência e cleanup |
| #75 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico | Baseline 3.4.31; não substitui a avaliação da #76 |
| #76 | [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) | SUCCESS | 16/16 não autenticados; 103/103 autenticados; Chromium/WebRTC; concorrência e cleanup |
| #84 | [Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) | SUCCESS | Build guard, metadata guard, secret-scope, signed-upload contract e Validate |
| #82 | [Validate 42373412069](https://github.com/Reekyi/UpStatus/actions/runs/42373412069) | FAILURE | `production updateURL mismatch` |

O job de #82 foi `128406008188`; o log mostra falha em `scripts/validate.mjs:26`. O job de #84 foi `128384735580`; os testes estáticos e o Validate concluíram com sucesso. O novo HEAD documental #82 não deve ser considerado aprovado por herança de resultados anteriores.

### Escopo real dos testes automatizados

Os workflows Normal e Team Lite configuram explicitamente:

`UPSTATUS_SIGNAL_URL=https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/upstatus-signal-test`

Portanto, os 129/129 e 103/103 autenticados, os testes Chromium de chamada/voz/tela, o rate limit e os read receipts exercitam o endpoint de signaling isolado. Não são uma implantação E2E dos templates completos `upstatus` e `upstatus-team-lite` candidatos.

A cobertura adicional dos candidatos é estática/VM: sintaxe, adapters, contratos de enrollment, limpeza de credenciais antigas, atualizador, portais e cenários locais de recuperação. Isso é útil e aprovado, mas não equivale a executar o backend completo de cada produto no ambiente TEST.

## 3. Deploy TEST: risco ativo em develop

### Workflow atualmente presente em develop

Arquivo: [develop .github/workflows/deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml)  
Blob SHA: `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.

Inspeção do conteúdo atual:
- Tem `workflow_dispatch` **e** gatilho `push` em develop.
- Usa `secrets.SUPABASE_PROJECT_ID` compartilhado no ambiente do job.
- Faz checkout sem fixar explicitamente `github.sha`.
- Não valida project ref, organização, estado ACTIVE_HEALTHY ou host do banco.
- Usa Supabase CLI `latest`.
- Executa `supabase functions deploy upstatus-test --project-ref "$SUPABASE_PROJECT_ID"`.

O valor do secret não foi lido; portanto, não afirmo que o destino atual seja produção. O risco é que o workflow não impõe uma allowlist de projeto e reutiliza a variável compartilhada `SUPABASE_PROJECT_ID`; o valor do secret/token e o destino efetivo não foram lidos. **Não executar esse workflow enquanto o guard não estiver integrado à branch ativa.**

### Versão corrigida na #84

Arquivo candidato: [.github/workflows/deploy-test.yml da #84](https://github.com/Reekyi/UpStatus/blob/safety/test-deploy-target-guard-20261107/.github/workflows/deploy-test.yml)  
Blob SHA: `1ca0c4ef4f633724280b81691471d8acc777edd2`.

A versão candidata:
- É manual-only.
- Faz checkout do SHA do evento e compara `git rev-parse HEAD` com `GITHUB_SHA`.
- Exige `refs/heads/develop`.
- Usa `vars.SUPABASE_TEST_PROJECT_ID`, não o secret compartilhado `SUPABASE_PROJECT_ID`.
- Rejeita produção e o projeto isolado de fixtures.
- Verifica formato do project ref, organização UpStatus, status ACTIVE_HEALTHY e database host pela Management API.
- Limita o token aos steps que precisam dele.
- Fixa Supabase CLI em 2.122.1.
- Implanta somente `upstatus-test`.

Os testes estáticos dessa proteção passaram em [42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144). Não houve execução de `workflow_dispatch`, chamada real de preflight Management API ou deploy. A #84 continua Draft; por isso o workflow inseguro ainda está em develop.

A #74 e a #76 também carregam uma versão manual-only do arquivo em suas próprias branches, mas isso não altera o workflow que está atualmente em develop. A #84 é a PR direcionada a develop.

## 4. Inventário Supabase e ambiente TEST

A listagem atual da organização retornou exatamente dois projetos:

| Projeto | Ref | Região | Estado | PostgreSQL |
|---|---|---|---|---|
| UpStatus produção | `dlfvkawaiqduhlazsszm` | us-west-2 | ACTIVE_HEALTHY | 17.11.0.002 |
| upstatus-security-test | `bfpjtfqlnypisxljoxkb` | sa-east-1 | ACTIVE_HEALTHY | 17.11.0.003 |

Não existe projeto full-product TEST independente.

- Produção: 7 migrations, última `20261027155438`; 38 Edge Functions ACTIVE.
- Laboratório: 33 migrations, última `20261107061242`; somente `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

O guard dos builders agora usa `UPSTATUS_TEST_PROJECT_ID`; sem valor, gera o sentinel inerte `00000000000000000000`. Rejeita produção e o laboratório de signaling/auth antes de gravar artefatos. A proteção está aprovada no CI. O sentinel não é um ambiente executável.

A variável GitHub `SUPABASE_TEST_PROJECT_ID` não foi lida. A existência de um projeto full-product, porém, foi verificada pela listagem Supabase e não foi encontrada.

### Lacuna Team Lite

O builder Team Lite (blob `41fe447508ac3e48cdbf3a7b85446bf7291be004`) tem `renderTeamLiteFunction()` sem variante TEST e escreve somente `upstatus-team-lite`. Não cria `upstatus-team-lite-test`. O workflow TEST da branch candidata implanta apenas `upstatus-test`.

Assim, mesmo depois de provisionar um projeto full-product TEST, ainda será necessário criar runtime, configuração de build, deploy e testes E2E próprios para Team Lite.

## 5. Distribuição, API e versões

### Normal

- `release.json` blob `93caf1701ea508575c90d002c0b8c3037b34d82a`: versão 3.4.7; `scriptUrl` aponta para `/functions/v1/upstatus/upstatus.user.js`.
- `scripts/build.mjs` blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`: `PROD_FUNCTION="upstatus"`, mas o `CLOUD_SERVER` de produção aponta para `/functions/v1/upstatus-screen-share-3-1-1-beta10`. O UpdateURL usa `release.scriptUrl`.
- Runtime implantado `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- Runtime implantado beta10: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

O userscript pode ser servido por `upstatus` e continuar enviando chamadas de API para beta10. O workflow de produção revisado implanta somente `upstatus`. O cutover precisa alinhar UpdateURL, CLOUD_SERVER, Realtime origin/topic, Storage origin e runtime implantado.

A versão Normal permanece 3.4.7, igual ao artefato raiz atual (blob `9b5a2a4c3a28eed41156854f1204eae158a2711a`). O builder protege a sincronização do artefato e exige que `release.json.version` seja maior que a versão atual antes de atualizar o arquivo raiz. Um bump de versão e uma validação de updater são gates antes da distribuição.

A falha da #82 é diferente da divergência do candidato: o `scripts/build.mjs` herdado de master usa o CLOUD_SERVER beta10 também como UpdateURL, enquanto `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. Isso explica o erro `production updateURL mismatch` no Validate documental da #82. Não enfraquecer o validador; corrigir o builder de master na linha de engenharia apropriada.

### Team Lite

- `team-lite/release.json` blob `2b4216bc056dfd6ad60b051b29916ec2bfc6cc01`: buildVersion 3.4.31, stable.
- Script candidato blob `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`.
- Builder blob `41fe447508ac3e48cdbf3a7b85446bf7291be004`.
- Runtime de produção `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.

O candidato Team Lite 3.4.31 não é o runtime implantado. A URL do manifesto aponta para a branch oficial `team-lite-official`; enquanto a PR permanecer Draft e sem merge, o artefato oficial não é atualizado por essa branch candidata.

## 6. AUTH-03, AUTH-02 e compatibilidade

### AUTH-03 — convite de primeiro acesso

Inspeção de código e CI aprovados nos dois candidatos:
- Token aleatório de 32 bytes (256 bits).
- Persistência somente do SHA-256.
- Expiração de 15 minutos.
- Emissão exige sessão autenticada e papel exato `implementation_admin`.
- Conta só recebe convite se `password_hash` for NULL ou string vazia.
- Setup exige token hexadecimal de 64 caracteres.
- RPC consome token e define senha atomicamente.
- Replay e consumo concorrente são rejeitados; exatamente um concorrente vence.
- Papéis NULL/vazios/ASCII-whitespace-only viram `implementation_user`; strings não vazias são preservadas literalmente. `" implementation_admin "` não é promovido a administrador.

RPC no isolado: `consume_upstatus_setup_invite(text,text,text)`, SECURITY INVOKER, `search_path=""`, EXECUTE apenas para service_role.

**Limite da evidência:** `scripts/test-auth-enrollment.mjs` usa service_role/PostgREST e chama diretamente `/rpc/consume_upstatus_setup_invite`. O workflow define `UPSTATUS_AUTH_ALLOW_MUTATION=1` e o guard exige o projeto isolado. O teste não percorre a emissão por HTTP, não comprova HTTP 403 para não-admin e não valida entrega privada do token ou ausência em logs. Portanto, a RPC passou; a integração HTTP completa continua pendente. Não existe interface administrativa dedicada para emissão.

### Compatibilidade de senha

- Normal: setup novo exige 6 caracteres; login aceita 4.
- Team Lite: setup novo exige 4; login aceita 4.

A política de criação diverge, mas o login cruzado não está bloqueado pelo mínimo: ambos aceitam 4 no login. Recomenda-se alinhar o mínimo de novos setups em 6 caracteres, preservando o login legado de 4 enquanto contas antigas existirem.

### AUTH-02 — rate limit de autenticação

Ausente nos dois projetos:
- `public.upstatus_auth_rate_limits`: inexistente.
- `consume_upstatus_auth_rate_limit`: inexistente.

O rate limit de signaling não protege login, setup ou emissão de convite. O rate limit de signaling está implementado apenas no laboratório e no endpoint de teste.

## 7. Produção: runtimes legados e autenticação

A listagem retornou 38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Esse flag não prova ausência de autenticação porque o produto usa sessões customizadas. O inventário de todas as rotas dessas 38 funções não foi concluído.

Os quatro runtimes centrais foram inspecionados individualmente:

| Função | Versão | SHA do entrypoint |
|---|---:|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Nos quatro, o código implantado ainda:
- Permite primeiro setup sem convite.
- Usa fallback administrativo por nome quando o papel está ausente.
- Expõe o estado de setup em `/api/account`.
- Não contém `consume_upstatus_setup_invite`.

A função `upstatus-test` v281 está ACTIVE **dentro do projeto de produção**. O guard dos novos builders evita gerar novos artefatos TEST para produção, mas não altera nem remove essa implantação antiga.

Consulta agregada de `public.users` em produção: 5 contas; 0 password_hash NULL/vazio; 0 papéis NULL/vazios; 3 papéis explicitamente `implementation_admin`. Nenhuma conta atualmente reivindicável foi encontrada. Isso não elimina o risco futuro enquanto o setup antigo permanecer acessível.

Há várias funções históricas `upstatus-test-*`, beta e backup ACTIVE no inventário. Não desativar em massa sem mapear consumidores, URLs e rollback; a inspeção rota a rota dessas funções permanece pendente.

## 8. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Security Advisor observado em 2026-11-07 13:29:32 UTC:
- 6 WARN: três funções SECURITY DEFINER executáveis por anon e as mesmas três por authenticated.
- 10 INFO: tabelas com RLS habilitado e sem policies.
- Performance: nenhum finding.
- Health: nenhum finding.

As três funções:
- `upstatus_broadcast_messages()`
- `upstatus_broadcast_remote_state()`
- `upstatus_broadcast_users()`

Todas são SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role e têm triggers habilitados.

Payloads:
- Mensagens: `to_jsonb(OLD/NEW)`, registro completo, evento `db_change`, canal `private=false`.
- Remote-state: metadados de comando e resultado (sender, target, status, reason, error etc.), canais `remote_command` e `remote_result`, `private=false`.
- User-status: name, status, reason, updated_at e sync, canal `user_status`, `private=false`.

Nove tabelas backend-owned em public têm RLS, zero policies e oito privilégios efetivos para cada um dos papéis anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` também tem RLS sem policy, mas não possui grants de cliente. A tabela `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Zero policies não prova acesso às linhas via PostgREST; porém TRUNCATE não é protegido por RLS e os privilégios de cliente são excessivos.

### Laboratório isolado

Security Advisor:
- 0 WARN de segurança.
- 17 INFO de RLS sem policies.
- 4 INFO de índices não utilizados.
- Performance/Health: sem findings adicionais.

Nas tabelas backend-owned de public, anon/authenticated não têm grants efetivos. `realtime.messages` ainda tem SELECT/INSERT/UPDATE para anon/authenticated e zero policies.

As três funções de broadcast do isolado:
- SECURITY DEFINER, `search_path=pg_catalog, public`.
- EXECUTE negado a anon/authenticated e permitido a service_role.
- Payload reduzido a `{"op": TG_OP}`.
- Ainda usam `private=false` e os três triggers continuam habilitados.

As RPCs `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit` e `merge_chat_read_receipts` são SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.

A minimização do payload e a restrição de EXECUTE melhoraram o laboratório, mas não completam a migração para Realtime privado. O tópico continua público; o desenho de autorização privada precisa considerar que o cliente usa sessão customizada, não um JWT Supabase Auth comum.

### Default ACL / ACL-02

A sessão SQL é `postgres`, não superuser e não membro de `supabase_admin`; `supabase_admin` é superuser.

- Produção: default ACL de postgres em public e storage ainda concede privilégios a anon/authenticated para sequences, functions e tables. Default ACL de supabase_admin continua amplo em graphql, graphql_public e public.
- Isolado: default ACL de postgres em public foi restringido a postgres/service_role. Em storage ainda há grants amplos para anon/authenticated. Default ACL de supabase_admin continua amplo em graphql, graphql_public e public.

ACL-02 não pode ser concluído pela sessão atual para objetos pertencentes a supabase_admin. Requer caminho administrativo autorizado. Nenhuma ACL foi alterada.

## 9. Migrations, objetos e fixtures

| Objeto | Produção | Isolado |
|---|---|---|
| Migrations | 7; última `20261027155438` | 33; última `20261107061242` |
| Setup-token columns | 0 | 4 |
| Setup-invite RPC | ausente | presente |
| Signal rate-limit table/RPC | ausente | presente |
| Call/voice attempt tables | ausentes | presentes |
| Atomic read-receipts RPC | ausente | presente |
| Auth rate-limit table/RPC | ausentes | ausentes |

Consulta SELECT-only de fixtures no isolado retornou zero em users, sessions, rooms, memberships, events, call attempts, voice attempts, rate-limit buckets, chat_reads e messages. Nenhuma limpeza manual foi feita.

Observação de proveniência: o ledger isolado registra `20261106210556_bounded_rate_limit_cleanup_isolated_test`, enquanto o repositório contém `supabase/test-migrations/20261106191000_bounded_rate_limit_cleanup_test.sql`. Reconciliar nome/versão entre ledger e fonte para manter a trilha de auditoria reproduzível.

## 10. Issues e aceitação manual

### [#78 — reconexão](https://github.com/Reekyi/UpStatus/issues/78)

Permanece Open, 0/8 critérios. Todos os checkboxes estão desmarcados. O contrato funcional diz que voice room é canal aberto, sem convite/aceitação. Ainda faltam:
- Queda real de internet por ~10s e recuperação sem F5 em Normal e Team Lite.
- Reentrada e nova chamada após reconexão.
- Áudio bidirecional e microfone físico.
- Captura real de tela.
- Múltiplas quedas e integridade dos participantes que permaneceram online.
- Ausência de áudio duplicado, peers órfãos e polling duplicado.
- Teste manual no navegador/Tampermonkey.

### [#79 — release checklist](https://github.com/Reekyi/UpStatus/issues/79)

O corpo tem revalidação de 08:59 BRT; o comentário mais recente consultado é de 10:04 BRT. O corpo precisa ser reconciliado com os achados desta rodada, principalmente workflow develop, escopo real dos testes no endpoint isolado e ausência de runtime TEST Team Lite. Os checklists históricos não devem ser tratados como aprovação dos HEADs atuais.

## 11. Próximos gates

| Prioridade | Gate | Evidência exigida |
|---|---|---|
| P0 | Corrigir deploy-test ativo em develop | Workflow manual-only, SHA pinado, project metadata verificada; validar branch ativa antes de qualquer execução |
| P0 | Provisionar projeto TEST full-product | Terceiro projeto ACTIVE_HEALTHY, org/host confirmados, migrations e rollback ensaiados |
| P0 | Criar runtime e deploy TEST Team Lite | `upstatus-team-lite-test`, build, workflow e E2E específicos |
| P0 | Alinhar Normal UpdateURL/CLOUD_SERVER | Distribuição e API no mesmo runtime aprovado; versão Normal incrementada |
| P0 | Corrigir setup legado em produção | Inventário de todas as funções/rotas, plano de compatibilidade, rollback e migração autorizada |
| P0 | Remover broadcasts públicos de mensagens/metadados | Payload mínimo, canal privado com autenticação viável, EXECUTE restrito e validação de clientes |
| P1 | Implementar rate limit de login/setup | RPC/tabela dedicada, testes de concorrência, HTTP 429 e Retry-After |
| P1 | Completar AUTH-03 HTTP | Admin emite, não-admin 403, consumo HTTP, token não aparece em logs |
| P1 | Revogar grants e fechar default ACL | Plano por objeto, service_role-only, caminho administrativo para supabase_admin |
| P1 | Reconciliar migrations e histórico | Ledger/source alinhados; rehearsals de aplicação e rollback no TEST |
| P1 | Aceitação física #78 | Tampermonkey/browser, rede, microfone, tela, Normal ↔ Team Lite |
| P1 | Atualizar #79 e obter reviews humanas | Evidências atuais, aprovação explícita de reviewers e decisão de release |

## 12. Registro de segurança e limites

- Todas as consultas SQL desta auditoria foram SELECT-only.
- Não foi aplicada migration em produção ou laboratório.
- Não houve deploy, merge, release ou publicação de userscript.
- Nenhum secret/valor de token foi lido; nenhum secret, flag, role, grant, policy ou ACL foi alterado.
- Nenhuma fixture foi criada, atualizada ou removida pela auditoria.
- Nenhum workflow foi disparado, repetido ou cancelado manualmente.
- Logs consultados pertencem a execuções existentes do CI; os testes mutáveis foram executados pelos workflows existentes com allowlist explícita para o projeto isolado e cleanup verificado.
- Nenhuma branch de engenharia foi modificada.
- Única escrita desta rodada: novo relatório nesta branch QA dedicada.
- Nenhum percentual de conclusão foi calculado.

**Conclusão:** CI funcional dos candidatos aprovado; integração full-product em TEST, segurança de produção e aceitação física continuam pendentes. Manter todas as PRs em Draft e não liberar.
