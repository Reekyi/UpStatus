# UpStatus — Auditoria independente de prontidão

**Data:** 2026-11-17 03:34 UTC  
**Escopo:** GitHub Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb.  
**Método:** inspeção read-only de refs, PRs, workflows e logs; leitura integral de docs/RELEASE_READINESS.md; inspeção de bundles implantados, catálogos PostgreSQL, migrations, Edge Functions e Security Advisors.  
**Veredito:** **NOT READY**.

Nenhum teste foi iniciado manualmente pela QA. Os resultados de CI abaixo são execuções existentes e foram inspecionados, não repetidos. O commit documental 68890b foi seguido automaticamente pelo Validate 44011179240, que repetiu o erro de updateURL; não houve rerun manual. Nenhuma escrita SQL, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/permissão ou operação destrutiva foi realizada. A única escrita desta rodada é este relatório novo na branch QA.

## 1. Documento de prontidão e integridade das refs

O documento docs/RELEASE_READINESS.md foi lido integralmente: 1.046.356 bytes e 8.423 linhas. O último checkpoint existente no documento é de 2026-11-15 06:30 UTC; portanto, não incorpora as verificações desta rodada. O documento usa distinção entre AUTOMATED PASS, CODE INSPECTION, MANUAL PENDING, BLOCKED e NOT VERIFIED. Este relatório mantém essa separação.

Heads observados:

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA qa/release-readiness-2026-11-04-master | 68890b33619c4b8d2c98675399c8bc5d16d26bab |

Antes da gravação deste relatório, QA estava 385 commits à frente e 1 atrás de master. O único commit master-only é 9d40461, que adiciona apenas docs/checkpoints/2026-11-08-production-migration-history-preflight.md (66 linhas, sem mudança de runtime). O commit 68890b33619c4b8d2c98675399c8bc5d16d26bab gravou a primeira versão deste relatório e passou a ser o novo HEAD QA; não fiz rebase nem incorporei o commit master-only.

PRs obrigatórias, todas abertas, Draft e sem reviews humanas:

| PR | HEAD | Base | Situação |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master em a9288cc | CI PASS |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official em 9065bc1 | PASS histórico limitado |
| #76 Team Lite | 00a578e9174e08238a1289a35feb02d171625421 | team-lite-official em 9065bc1 | bloqueada por quota |
| #82 QA | 68890b33619c4b8d2c98675399c8bc5d16d26bab | master em a9288cc | Validate FAIL |

A #76 é continuação da #75: 330 commits à frente e zero atrás. Tratar #75 como entrega independente para integração duplicaria o baseline contido na #76. #74 e #82 usam base master antiga; master avançou somente com o checkpoint documental acima. Nenhuma atualização de branch foi feita.

Issue #78 está OPEN e permanece em 0/8 critérios físicos aprovados. Issue #79 está OPEN, com 16/35 itens marcados e 19 pendentes.

## 2. CI por HEAD exato

### PR #74 — Normal

- Validate: [run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), SUCCESS no HEAD dcaf6a0.
- Smoke: [run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200), SUCCESS no HEAD dcaf6a0.
- 136/136 verificações autenticadas passaram.
- Chromium validou negociação WebRTC, entrega de áudio, voz, compartilhamento de tela, mesh de três participantes e encerramento de peers.
- Rate limit de sinalização: 90 aceitos e o seguinte rejeitado com HTTP 429 e Retry-After.
- Recibos atômicos, consumo único de convite e cleanup de fixtures passaram.
- O teste de rate limit de emissão de convites foi SKIPPED: o harness não existia no artefato Normal.

Classificação: AUTOMATED PASS para os contratos executados; não é aceitação física no Tampermonkey/Sale Smartly.

### PR #75 — Team Lite

- [run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), SUCCESS.
- O job executou somente verificação de scripts e metadata de versão.
- É evidência histórica do baseline, não validação da candidata atual #76.

Classificação: AUTOMATED PASS limitado.

### PR #76 — Team Lite

- [run 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235).
- Job signed-upload-contracts: SUCCESS; contratos offline de servidor e cliente aprovados.
- Candidate Checks: FAILURE na etapa de autenticação do endpoint isolado.
- O endpoint devolveu HTTP 402 em vez de 401. Resultado: 0/16 verificações não autenticadas passaram.
- O corpo da resposta identifica: exceed_edge_functions_invocations_quota. O proprietário precisa revisar o plano ou remover o spend cap para restaurar o serviço.
- Playwright, integração autenticada, concorrência de rate limit, recibos, consumo de convite e verificações seguintes foram SKIPPED após a falha.

Classificação: BLOCKED por infraestrutura; não é prova de defeito funcional do upload assinado.

### PR #82 — QA

- [Validate run 44011179240](https://github.com/Reekyi/UpStatus/actions/runs/44011179240), FAILURE no novo HEAD documental 68890b.
- O job fez checkout do merge ref e construiu PROD 3.4.7 / TEST 3.4.7; scripts/validate.mjs:26 reportou production updateURL mismatch.
- O commit 68890b alterou somente documentação; o erro continua no validador/build herdado da base.
- Não iniciei rerun manual.

Classificação: CI FAILURE confirmado.

## 3. Normal e Team Lite: runtime, API e Realtime

Inspecionei e decodifiquei os userscripts embutidos nas Edge Functions implantadas.

| Função implantada | Versão Edge | Versão embutida | API usada pelo cliente | Tópico Realtime |
|---|---:|---|---|---|
| upstatus | 480 | 3.4.7 | beta10 | upstatus-screen-share-live-3-1-1-beta10 |
| upstatus-screen-share-3-1-1-beta10 | 6 | 3.1.1-beta8 | beta8 | upstatus-screen-share-live-3-1-1-beta8 |
| upstatus-team-lite | 15 | 3.4.30 | upstatus-team-lite | upstatus-screen-share-live-3-1-1-beta10 |

Consequências observadas:

1. Normal 3.4.7 é distribuído pelo slug upstatus, mas as chamadas de API continuam indo para beta10.
2. A função beta10 v6 embute um userscript beta8, cujo próprio updateURL, CLOUD_SERVER e tópico apontam para beta8. O slug que serve o arquivo e a versão/endpoint declarados no arquivo não coincidem.
3. Team Lite 3.4.30 usa a API própria, mas ainda assina o tópico legado beta10.
4. Os triggers PostgreSQL de produção publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Nenhum dos dois userscripts implantados acima assina esse tópico.

Isso é uma incompatibilidade concreta de distribuição/API/Realtime. Não atribuo a ela, sem prova, a causa dos HTTP 402.

Os candidatos #74 e #76 usam o tópico novo alinhado aos triggers. Ambos mantêm o transporte server-mediated autenticado como opt-in, com signaling_transport_enabled default false. O canal continua público, sem private:true e sem setAuth(). Quando a flag é habilitada, os handlers públicos de voz/tela são ignorados e call_signal só aceita controle autenticado, exceto hints de descoberta. Com a flag desligada, o fallback público legado continua ativo. O candidato também transforma remote_command em wake-up para polling HTTP autenticado, mas isso não fecha o transporte de mídia.

**RT-01 permanece BLOCKED.** Trocar o tópico não torna o canal privado nem prova identidade/membership do remetente.

## 4. AUTH-03 e diferença entre candidatos

Os três runtimes implantados consultados (Normal upstatus, beta10 e Team Lite) não contêm setupToken, consume_upstatus_setup_invite nem rate limit de emissão de convite. O POST /api/setup continua no caminho legado. O primeiro setup ainda pode atribuir implementation_admin por fallback nominal a Ricardo, Lohan e Guilherme quando o papel está vazio.

Nos candidatos:

- Normal #74 exige setupToken e consome convite via RPC, mas issueSetupInvite não chama consume_upstatus_setup_invite_rate_limit.
- Team Lite #76 exige setupToken e chama consume_upstatus_setup_invite_rate_limit, com limite de cinco emissões por administrador em 900 segundos.
- Ambos usam minPasswordLength=setup?6:4 no código candidato.

Portanto, a proteção de primeiro acesso não está implantada e a implementação de rate limit de emissão não está consistente entre Normal e Team Lite.

**AUTH-03 permanece BLOCKED.**

## 5. Supabase: projetos, Edge Functions e logs

Organização UpStatus: plano Free. Existem somente dois projetos:

| Projeto | Ref | Estado | Migrations |
|---|---|---|---:|
| Produção | dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 7 |
| Laboratório | bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 39 |

A branch gerenciada main de produção continua MIGRATIONS_FAILED, embora o projeto/preview apareça ACTIVE_HEALTHY. A causa não foi identificada.

Produção tem 38 Edge Functions ACTIVE, todas com verify_jwt=false. Isso não prova ausência de autenticação: os runtimes usam token próprio do UpStatus. Exige, porém, revisão da autorização interna por rota. O slug upstatus-test (v281) está no próprio projeto de produção; não é um Full-Product TEST isolado. O laboratório contém upstatus-signal-test v32 e upstatus-signal-e2e-once v3, mas é um projeto de sinalização/autenticação, não um ambiente completo do produto.

### Logs de Edge Functions, janela de 24 horas consultada

- Produção: 77.925 eventos, todos com HTTP 402, de 2026-11-16 11:41:55.514 UTC a 21:00:47.824 UTC.
- Laboratório: 48 eventos, todos com HTTP 402, de 2026-11-16 12:37:25.477 UTC a 12:41:42.781 UTC.
- O erro do laboratório é explicitamente exceed_edge_functions_invocations_quota.
- Na última hora consultada (02:25:42–03:25:42 UTC de 17/11), os dois projetos apresentaram apenas logs PostgreSQL/PgBouncer, sem function_edge_logs.

Não há evidência suficiente para dizer que produção voltou ou continua falhando agora. A telemetria de Edge Functions cessou após 21:00:47 UTC. Recuperação de produção não está confirmada; ausência de logs não equivale a sucesso.

## 6. PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas no schema public; RLS habilitado em todas; zero policies.
- 126 grants de tabela para anon/authenticated em nove tabelas; 18 grants TRUNCATE.
- 106 linhas em realtime.messages, todas private=false; zero policies; anon e authenticated possuem SELECT, INSERT e UPDATE.
- Três funções SECURITY DEFINER de trigger: upstatus_broadcast_messages, upstatus_broadcast_users e upstatus_broadcast_remote_state. Todas usam search_path=public e têm EXECUTE para anon/authenticated.
- O Security Advisor reporta 10 RLS Enabled No Policy, três avisos de SECURITY DEFINER para anon e três para authenticated.

Ressalva de classificação: as três funções de broadcast retornam trigger. Não demonstrei execução direta via RPC e não executei chamadas exploratórias. Os grants são desnecessários e o Advisor sinaliza exposição, mas isso não deve ser apresentado como exploração comprovada.

O risco de dados é confirmado no código dos triggers:
- upstatus_broadcast_messages envia to_jsonb(OLD/NEW), isto é, a linha completa da mensagem, para db_change no tópico público.
- upstatus_broadcast_users publica nome, status, motivo, updated_at e sync.
- upstatus_broadcast_remote_state publica metadados de remote_command e remote_result.

Default ACLs de produção continuam amplas para objetos futuros: owners postgres e supabase_admin concedem privilégios de tabela/função/sequência a anon/authenticated em public; postgres também mantém defaults amplos em storage. Há ainda ACLs amplas em schemas GraphQL.

Storage:
- chat-images: público, 168 objetos.
- profile-images: público, 20 objetos.
- Limite de 20 MiB por bucket.
- Zero policies próprias em storage.objects.

### Laboratório

- 18 tabelas públicas com RLS e zero policies; zero grants diretos de tabela para anon/authenticated; zero TRUNCATE.
- Três funções SECURITY DEFINER de broadcast usam search_path vazio e não concedem EXECUTE a anon/authenticated.
- Security Advisor não reporta avisos SECURITY DEFINER no laboratório; mantém 18 informações de RLS sem policy.
- Não há buckets nem objetos Storage no laboratório.
- As default ACLs não estão totalmente limpas: alguns defaults de supabase_admin em public e defaults de postgres em storage ainda concedem privilégios amplos para anon/authenticated. O laboratório está melhor que produção, mas não é prova de hardening completo para objetos futuros.

**ACL-STORAGE permanece BLOCKED.**

## 7. Migrations e proveniência

A PR [#176](https://github.com/Reekyi/UpStatus/pull/176) está aberta e Draft. Revalidei os quatro arquivos recuperados contra os statements de produção em supabase_migrations.schema_migrations:

- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

Os quatro arquivos correspondem exatamente ao statement registrado, acrescido de uma quebra de linha final. Isso é recuperação do SQL executado no ledger, não prova de bytes idênticos aos arquivos originais, comentários ou formatação. Nenhum SQL foi reaplicado.

A #176 não executou replay/preflight: não há Full-Product TEST e o laboratório está com quota excedida. O Validate da #176 falha porque o baseline develop não contém o helper de upload assinado. A PR #174 tem Validate PASS no HEAD 277dd7b, mas não comprova transferência real de Storage nem aceitação de navegador.

**MIGRATION-PROVENANCE permanece IN PROGRESS**, não DONE.

## 8. Workflows de publicação

### Normal

O deploy-production.yml da candidata #74 é manual-only, restringe a branch master, verifica o project ID esperado e presença do token, fixa Supabase CLI 2.122.1 e publica somente a função upstatus. O guard exige versão estável exatamente 3.4.7. Isso não coordena a API beta10 que o cliente 3.4.7 realmente chama e impede um bump simples para versão estável superior sem ajuste do guard. O workflow não aplica migrations.

O deploy-test.yml candidato é manual-only, exige develop e um projeto TEST dedicado, rejeita produção e o projeto de sinalização, fixa CLI 2.122.1 e publica upstatus-test. Como não existe um terceiro projeto Full-Product TEST, o guard corretamente impede usar o laboratório como substituto.

### Team Lite

O workflow oficial em team-lite-official usa CLI latest e executa supabase functions deploy upstatus, não upstatus-team-lite. Não tem os mesmos guards de projeto/SHA/migrations do Normal.

A team-lite-candidate.yml é CI, não workflow de publicação. Ela executa contratos offline e testes no laboratório; a etapa de autenticação foi bloqueada pela quota.

**Não despachar o workflow oficial Team Lite.**

## 9. Testes físicos e revisão humana

Issue #78 permanece OPEN com 0/8 critérios aprovados:
- Normal sem F5 após perda/retorno de rede.
- Team Lite sem F5.
- Reentrada em sala.
- Iniciar/receber chamadas após reconectar.
- Ausência de áudio duplicado, peers órfãos e polling duplicado.
- Participantes que permaneceram online continuam funcionando.
- Regressões automatizadas/CI.
- Teste manual no navegador.

Nenhum teste físico foi executado pela QA. Chromium/Playwright do CI não substituem Tampermonkey com permissões reais, microfone, captura de tela e perda física de rede.

As PRs #74, #75, #76 e #82 não têm reviews humanas. HUMAN-REVIEW permanece PENDING; não houve autorização de release.

## 10. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Canal público, payloads públicos e transporte autenticado opt-in |
| TEST-ISOLATION | BLOCKED | Só há produção e laboratório; Full-Product TEST inexistente |
| MIGRATION-PROVENANCE | IN PROGRESS | Quatro statements recuperados; bytes originais/replay não comprovados |
| AUTH-03 | BLOCKED | Runtimes sem convite obrigatório; rate limit candidato inconsistente |
| ACL-STORAGE | BLOCKED | Grants/default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | 0/8 critérios físicos na #78 |
| HUMAN-REVIEW | PENDING | Zero reviews humanas nas PRs obrigatórias |

**Recomendação de release: NOT READY.**

## 11. Próximos passos

1. O proprietário da organização Supabase deve revisar Usage/Billing e spend cap do laboratório; não há confirmação de que Ricardo seja o administrador responsável.
2. Diagnosticar separadamente os 402 de produção e restabelecer telemetria de Edge Functions.
3. Consolidar Normal entre updater, API e versão; coordenar a publicação de beta10 e upstatus.
4. Corrigir o workflow oficial Team Lite para o slug correto, com CLI pinada e guards.
5. Unificar AUTH-03 e rate limit de emissão de convites nos dois candidatos.
6. Tornar o transporte autenticado o caminho padrão; remover execução de comandos/mídia por broadcast público e minimizar payloads.
7. Corrigir grants, default ACLs, SECURITY DEFINER e Storage com revisão de owner.
8. Criar Full-Product TEST, validar migrations e diagnosticar MIGRATIONS_FAILED.
9. Executar os oito testes físicos da #78 e obter reviews/aprovação humana.

---

**Segurança da execução:** todas as consultas SQL desta auditoria foram SELECT-only. Nenhum workflow foi iniciado ou repetido manualmente pela QA. Nenhuma produção, branch de engenharia, secret, flag, migration, role, grant, policy, ACL, fixture, deploy, merge, release ou publicação de userscript foi alterada.