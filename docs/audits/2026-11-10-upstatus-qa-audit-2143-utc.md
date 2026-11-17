# Auditoria independente de qualidade — UpStatus

**Data da coleta:** 2026-11-10 21:43 UTC  
**Recomendação:** `not_ready`  
**Projetos:** produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`  
**Escopo:** GitHub, CI existente, código-fonte, catálogo PostgreSQL, Realtime, Storage e Edge Functions.  
**Segurança da execução:** nenhuma escrita em produção; consultas Supabase somente SELECT/catálogo. Nenhum workflow foi disparado por esta auditoria; não houve teste manual nem execução local.

## Resumo executivo

Os candidatos Normal #133 e Team Lite #134 continuam com CI completo aprovado. AUTH-03 também passou no laboratório pela PR #131. Isso não torna a release pronta.

Novos pontos relevantes desta rodada:

1. A candidata Normal #133 já reúne o conteúdo funcional de #131 e o alvo de API de #132, mas herda o workflow de #74 que ainda exige exatamente a versão 3.4.7, igual à versão Normal implantada. O guard mais seguro de #89 exige versão estável superior a 3.4.7 e preflight de migrations, mas pertence a uma linhagem divergente. É necessário portar o guard para a arquitetura escolhida, não integrar #89 às cegas.
2. A função server-mediated `upstatus-signal` existe apenas em código Draft. Não está implantada em produção, não tem check PR no seu HEAD e não está ligada por padrão nos clientes. Normal e Team Lite mantêm `signaling_transport_enabled=false` e endpoint vazio por padrão.
3. Foi confirmado um drift HTTP no laboratório: a RPC de voz retorna `VOICE_ATTEMPT_ALREADY_ACTIVE`, mas a Edge Function `upstatus-signal-test` v32 só converte `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` em HTTP 409. O caminho de integração CI testa a RPC diretamente; o teste de 409 é um helper offline. Assim, o runtime HTTP implantado pode devolver 500 nesse conflito sem que os checks atuais falhem.
4. O Realtime de produção tem 67 mensagens persistidas, todas `private=false`. As permissões de tabelas, Default ACLs e Storage continuam excessivas.
5. Os branches `master`, `team-lite-official` e QA reportam `protected=false`; as PRs examinadas continuam Draft e sem reviews humanas.

## 1. Heads, documento e governança

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `77e89b00be7275e0b07264d628064fcbe22170c1` |

GitHub informa `protected=false` para os três branches. O endpoint administrativo de branch protection retornou 403, mas o campo `protected` dos próprios objetos de branch foi consultado com sucesso.

O compare atual mostra QA **202 commits à frente e 1 atrás** de master. A PR #82 ainda aponta para a base antiga `a9288ccf`, um commit atrás do master atual. A PR #74 também usa essa base antiga.

O arquivo [docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) foi recuperado integralmente pelo blob SHA `7cfbd70886df42ce790c078c224b19284a632595`: 8.410 linhas. A última seção do documento é de **08/11/2026 18:30 UTC**; portanto, o documento está desatualizado em relação aos candidatos #131–#139 e ao snapshot Supabase desta rodada. O arquivo principal foi preservado.

### PRs e checks observados

| PR | HEAD | Base | Estado / evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `fb878537` | master `a9288ccf` | Open/Draft; Validate e Smoke históricos aprovados. Git compare: 883 commits à frente e 1 atrás do master atual. |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90` | team-lite-official | Open/Draft; Candidate Checks histórico, limitado a scripts/metadados. Não é a candidata atual. |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `3b1406dd` | team-lite-official | Open/Draft; Candidate Checks [42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e Call Source Guard [42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) aprovados. 378 commits à frente do branch oficial; #76 está 319 commits à frente de #75. |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `77e89b00` | master `a9288ccf` | Open/Draft; Validate [42897563134](https://github.com/Reekyi/UpStatus/actions/runs/42897563134) falhou em `production updateURL mismatch`, `scripts/validate.mjs:26`. |
| [#89 AUTH-03/cutover](https://github.com/Reekyi/UpStatus/pull/89) | `5c46eea3` | branch de cutover `f04d18d7` | Open/Draft; guard [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) executou e bloqueou corretamente o cutover. Linhagem divergente de #74: 94 commits próprios e 883 atrás de #74. |
| [#101 sinalização server-mediated](https://github.com/Reekyi/UpStatus/pull/101) | `2ef7c332` | #74 antigo `9c0133e8` | Open/Draft; nenhum workflow no HEAD exato. Diverge do #74 atual em 10 commits próprios e 6 ausentes. |
| [#125 dispatcher Team Lite](https://github.com/Reekyi/UpStatus/pull/125) | `35c9122d` | master | Open/Draft; offline guard [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) PASS, deploy SKIPPED; Validate [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) FAIL por updateURL. |
| [#129 bloqueio do dispatcher legado](https://github.com/Reekyi/UpStatus/pull/129) | `886d364d` | team-lite-official | Open/Draft; guard [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) PASS, ainda não integrado. |
| [#131 rate limit de convites](https://github.com/Reekyi/UpStatus/pull/131) | `17169a30` | #74 `fb878537` | Open/Draft; Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) PASS, 136/136 autenticados. |
| [#132 alvo de API Normal](https://github.com/Reekyi/UpStatus/pull/132) | `74d787ba` | #74 `fb878537` | Open/Draft; Validate [42773004553](https://github.com/Reekyi/UpStatus/actions/runs/42773004553) PASS. |
| [#133 Normal consolidado](https://github.com/Reekyi/UpStatus/pull/133) | `8d38036e` | #74 `fb878537` | Open/Draft; Smoke [42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) e Validate [42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) PASS. 14 commits à frente de #74. |
| [#134 Team Lite consolidado](https://github.com/Reekyi/UpStatus/pull/134) | `ee246aa2` | #76 `3b1406dd` | Open/Draft; Candidate Checks [42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e Call Source Guard [42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) PASS. 10 commits à frente de #76. |
| [#135 recuperação de migrations](https://github.com/Reekyi/UpStatus/pull/135) | `98e96cfe` | master | Open/Draft; Validate [42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) FAIL por updateURL. |
| [#137 cleanup AUTH-03](https://github.com/Reekyi/UpStatus/pull/137) | `73cf0461` | #89 antigo `4224dc31` | Open/Draft, `mergeable=false`, nenhum workflow no HEAD. |
| [#139 check de paridade do signaling](https://github.com/Reekyi/UpStatus/pull/139) | `be0d10e7` | #74 `fb878537` | Open/Draft; workflow [42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626) PASS, mas a etapa de paridade foi explicitamente SKIPPED porque a fonte de produção não existe no merge ref dessa PR. |

As reviews consultadas nas PRs #74, #75, #76, #82, #89, #101, #125, #129, #131, #132, #133, #134, #135, #137 e #139 estão vazias. Nenhuma aprovação humana foi encontrada.

## 2. CI: o que foi realmente validado

- **Normal #133:** 136/136 verificações autenticadas; chamadas WebRTC, áudio remoto, voz, compartilhamento de tela, mesh de três participantes, rate limit, convites, recibos de leitura e limpeza de fixtures. Isso é CI no laboratório, não teste físico no Sale Smartly.
- **Team Lite #134:** 110/110 autenticadas, 16/16 não autenticadas e 11/11 contratos HTTP offline. A suíte inclui Playwright Full-IIFE e regressões de voz/tela.
- **#131:** o log confirma 136/136 autenticadas; 24 solicitações concorrentes de emissão de convite resultaram em 5 permitidas e 19 bloqueadas, com isolamento de bucket e cleanup. Também passou a suíte de enrollment.
- **#132:** Validate passou com build Normal/TEST 3.4.7, guard de alvo TEST, regressões de signed upload, chat e updater. Não é deploy nem teste do runtime implantado.
- **#75:** baseline histórico limitado; não foi contado como suíte completa.
- **#139:** PASS do workflow não significa paridade testada; o próprio log registra que a etapa foi ignorada.
- **#82, #125 e #135:** Validate falhou no mesmo mismatch de updateURL.
- **#137:** sem check no HEAD e não mergeable.

Não executei os testes manualmente, não abri navegador, não simulei queda de rede e não iniciei workflows.

## 3. Normal: alvo de API e versão de publicação

A produção Normal v480 embute userscript 3.4.7. O cabeçalho do userscript aponta o updateURL para a função `upstatus`, mas o CLOUD_SERVER aponta para `upstatus-screen-share-3-1-1-beta10`. A arquitetura implantada ainda é de dois runtimes.

A build de #132 e #133 muda o PROD_FUNCTION para `upstatus`, fazendo distribuição e API apontarem para o mesmo runtime. A blob de `scripts/build.mjs` em #132 e #133 é idêntica. #133 também contém blobs idênticos aos de #131 para a migration, o server template e o teste de rate limit de convites, embora a ancestralidade dos branches tenha divergido.

**Problema de release:** #133 herda o workflow de #74. Esse workflow exige `release.json.version === 3.4.7`, e o build do candidato continua em 3.4.7. A produção já serve 3.4.7. Publicar conteúdo alterado com a mesma versão não garante atualização automática dos userscripts instalados. O guard de #89 exige versão estável superior a 3.4.7 e verifica migrations, mas pertence à linhagem de dois runtimes, 883 commits atrás de #74. A solução segura é portar o guard de versão/preflight para a arquitetura escolhida, não mesclar #89 integralmente.

**Decisão pendente:** runtime único `upstatus` (caminho #132/#133) ou dois runtimes (caminho #89). A escolha precisa preceder a consolidação de build, endpoint, manifesto e cutover.

## 4. Sinalização autenticada e contrato HTTP de voz

Os templates Normal e Team Lite têm o mesmo adaptador de transporte, mas ambos leem `signaling_transport_enabled` com default false e endpoint vazio. O transporte só inicia se a flag for ativada manualmente, houver token e endpoint HTTPS da mesma origem. Os clientes implantados inspecionados não contêm `private:true` nem `realtime.setAuth()`. A produção não lista uma Edge Function `upstatus-signal`.

A fonte candidata de #101 tem pontos positivos por inspeção de código:
- valida o token de sessão pelo hash e expiração;
- deriva o remetente da sessão, verifica usuário e membership aceito;
- remove claims de identidade do payload;
- limita corpo a 20 KiB;
- aplica rate limit de 90 escritas/minuto e 240 leituras/minuto;
- faz limpeza limitada de eventos/salas/attempts;
- converte `VOICE_ATTEMPT_ALREADY_ACTIVE` e `VOICE_ATTEMPT_CONFLICT` em HTTP 409.

Mas #101 está Draft, sem check PR no HEAD e não está implantada. #139 não prova paridade porque seu workflow pulou essa etapa.

### Drift confirmado no laboratório

A RPC de voz no laboratório pode retornar `VOICE_ATTEMPT_ALREADY_ACTIVE`. A Edge Function `upstatus-signal-test` v32 só mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409; o novo código de erro cai no default HTTP 500.

A suíte autenticada chama a RPC diretamente por service role para validar o singleton; não passa pelo wrapper HTTP nesse cenário. O teste de contrato 409 usa `mapOpenVoiceRoomResult` do helper em `supabase/test-functions`, não o código implantado v32. Portanto, os 11/11 contratos HTTP offline não validam o runtime real. É necessário um teste de integração que provoque o erro pela rota HTTP implantada e exija 409.

## 5. Supabase: snapshot read-only

### Produção — `dlfvkawaiqduhlazsszm`

- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Branch gerenciada `main`: **MIGRATIONS_FAILED**.
- 7 migrations remotas e 38 Edge Functions ativas.
- 67 mensagens em `realtime.messages`, todas `private=false`: 35 `user_status`, 20 `db_change`, 6 `remote_command`, 6 `remote_result`.
- `realtime.messages`: RLS habilitado, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE efetivos.
- Três funções broadcast continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role e retorno `trigger`; estão anexadas a triggers. O Advisor sinaliza os grants, mas não foi demonstrada chamada RPC direta dessas funções trigger.
- Dez tabelas públicas com RLS e sem policies; nove têm grants efetivos amplos para papéis clientes, incluindo TRUNCATE. RLS não protege TRUNCATE.
- Default ACLs: 120 privilégios destinados a anon/authenticated em objetos futuros, abrangendo defaults de postgres e supabase_admin em public/storage/GraphQL.
- Buckets `chat-images` e `profile-images` públicos, limite 20 MiB; zero policies em Storage. `storage.objects` mantém privilégios amplos para anon/authenticated.
- Funções principais: Normal v480, Team Lite v15, TEST v281 dentro do próprio projeto de produção e Screen Share beta10 v6. As 38 funções reportam `verify_jwt=false` no metadata; isso não prova ausência de autenticação customizada nos handlers.
- Não há função `upstatus-signal` implantada.

### Laboratório — `bfpjtfqlnypisxljoxkb`

- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.003; sem branches de desenvolvimento.
- 39 migrations, duas Edge Functions de teste, zero mensagens Realtime e zero buckets.
- 18 tabelas públicas com RLS e sem policies; nenhuma concede grants diretos de tabela a anon/authenticated.
- Três funções broadcast SECURITY DEFINER com `search_path=""` e EXECUTE negado a anon/authenticated; service_role mantém execução. Essa hardening está no laboratório, não em produção.
- Default ACLs ainda concedem 96 privilégios a papéis clientes em objetos futuros.
- A Edge Function `upstatus-signal-test` implantada é v32 e mantém o drift HTTP de voz descrito acima.

### Migrations e isolamento

O laboratório contém migrations de teste separadas, não um espelho byte a byte do histórico de produção. O README de `supabase/test-migrations` diz explicitamente que esses SQLs são apenas para o projeto isolado e nunca devem ir para produção ou para o TEST oficial. O histórico do laboratório contém a versão de teste `20261110000612` para o rate limit de setup; a migration candidata de produção `20261109230000_setup_invite_rate_limit.sql` não aparece como aplicada no histórico remoto.

O guard `scripts/migration-layout.test.mjs` verifica a separação e a presença dos arquivos, mas não compara byte a byte a migration de produção com sua contraparte de teste. Isso deixa risco de drift entre os dois SQLs.

Produção continua com apenas 7 migrations e status MIGRATIONS_FAILED. Quatro arquivos originais ainda não foram recuperados byte a byte:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 recupera statements do ledger, não os arquivos originais byte a byte. Nenhuma migration foi executada nesta auditoria.

## 6. Team Lite: publicação

A workflow oficial em `team-lite-official` continua manual, usa Supabase CLI `latest` e executa `supabase functions deploy upstatus`; o slug de produto é `upstatus-team-lite`. Não há validação de project ref/SHA equivalente à candidata.

- #125 propõe dispatcher com SHA exato, PR aprovado, versão e confirmação explícita (default false). O guard offline passou e o deploy ficou SKIPPED; o Validate do branch falhou.
- #129 propõe desativar o dispatcher legado e seu guard offline passou, mas a PR continua Draft e não integrada.

Não despachar o workflow oficial atual.

## 7. Testes manuais e aceitação

A [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN em **0/8**. O último comentário de Engenharia é de 08/11. Não há confirmação física de perda de internet, retorno sem F5, reentrada na sala, nova chamada, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.

## 8. Gates desta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | **blocked** | 67/67 mensagens privadas? Não: 67/67 estão `private=false`; endpoint server-mediated não implantado. |
| TEST-ISOLATION | **in_progress** | Laboratório isolado e limpo, mas sem Storage/Realtime full-product e com test migrations separadas. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; #135 recupera statements, não arquivos originais. |
| AUTH-03 | **in_progress** | #131 passou no laboratório; produção ainda sem migrations/RPCs do novo fluxo. |
| ACL-STORAGE | **blocked** | Grants, Default ACLs e buckets públicos permanecem excessivos em produção. |
| RECONNECT | **pending** | Issue #78 permanece 0/8; nenhum teste físico confirmado. |
| HUMAN-REVIEW | **pending** | PRs Draft, sem reviews humanas e sem autorização de release. |

## 9. Próximos passos recomendados

1. Ricardo/Engenharia definir a topologia Normal única ou dupla; não autoriza deploy.
2. Portar o guard de versão >3.4.7 e preflight de migrations para a arquitetura escolhida.
3. Integrar e testar o endpoint server-mediated em Normal e Team Lite; manter o legado bloqueado até a migração comprovada.
4. Adicionar teste HTTP real para `VOICE_ATTEMPT_ALREADY_ACTIVE` → 409 contra a Edge Function do laboratório.
5. Criar verificação de paridade entre migration de produção e contraparte isolada; recuperar os quatro arquivos originais.
6. Revisar grants, Default ACLs, Storage e Realtime privado/autorizado em produção, com plano revisado e autorização separada.
7. Corrigir o dispatcher oficial Team Lite e exigir SHA/projeto/CLI/review.
8. Depois da integração e revisão humana, executar os oito testes físicos da Issue #78.

**Conclusão:** manter `not_ready`. CI verde comprova os cenários executados no laboratório, não comprova transporte seguro ativo, publicação coerente ou aceitação física. Nenhuma escrita em produção, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL ou publicação de userscript ocorreu nesta execução.
