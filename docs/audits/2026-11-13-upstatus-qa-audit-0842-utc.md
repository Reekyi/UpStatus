# UpStatus - auditoria independente de qualidade
**Execução:** 2026-11-13 08:42 UTC  
**Repositório:** Reekyi/UpStatus  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY

## 1. Escopo, método e limites

- Revalidados os heads de master, QA e team-lite-official; PRs #74, #75, #76, #82 e a nova #159; Issues #78 e #79; workflows e logs de CI.
- Releitura integral do blob atual de docs/RELEASE_READINESS.md: 1.045.105 bytes, 8.410 linhas, SHA 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint técnico registrado no documento continua em 2026-11-08 18:30 UTC.
- Inspecionados os oito arquivos alterados pela #159, os templates Normal e Team Lite das candidatas, os workflows oficiais e os userscripts embutidos nas Edge Functions implantadas.
- Supabase consultado exclusivamente por SELECT, leitura de catálogo, migrations, Edge Functions e Advisors.
- Não havia checkout local do projeto, navegador/Tampermonkey controlado ou ambiente full-product TEST. Nenhum teste local ou manual foi executado. Os resultados de CI abaixo são runs já existentes, não reruns desta auditoria.

## 2. Heads e integridade da QA

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA antes deste relatório | 1d47e9d18306733dd48f8a9e279c8c2fc28165c6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| PR #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 |
| PR #82 QA | 1d47e9d18306733dd48f8a9e279c8c2fc28165c6 |
| PR #159 updater/auth | 0bf5a9b76156dea69380468197f19d6ee4bcffc3 |

A comparação master -> QA retorna 274 commits à frente e 1 atrás. Os 132 caminhos divergentes são exclusivamente docs; nenhum arquivo de produto diverge nessa comparação. QA, master e team-lite-official estão sem proteção de branch. A atualização documental desta execução usa compare-and-swap pelo SHA esperado; se a ref mudar, a gravação deve falhar, sem sobrescrever o concorrente.

O documento RELEASE_READINESS.md foi preservado. O relatório anterior mais recente localizado é docs/audits/2026-11-13-upstatus-qa-audit-0740-utc.md.

## 3. PRs e CI

| PR | Resultado observado | Classificação |
|---|---|---|
| #74 Normal | Validate 43376770142 PASS; Smoke 43376770200 PASS, 136/136 autenticados | CI em merge ref |
| #75 Team Lite baseline | 41674353127 PASS | CI histórico, não substitui #76 |
| #76 Team Lite | 43363871881 PASS, 110/110 autenticados e 16/16 não autenticados | CI da candidata |
| #82 QA | 43387582940 FAIL: production updateURL mismatch | CI falhou |
| #159 updater/auth | 43392498395 e 43392506216 PASS | CI offline da candidata |

Nenhuma das PRs #74, #75, #76, #82 ou #159 possui review humana registrada. Todas permanecem Draft/abertas.

### #74 Normal

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- Smoke confirmou 136/136 verificações autenticadas, além de 19/19 não autenticadas, incluindo WebRTC, voz, compartilhamento de tela, mesh de três participantes, teardown e rate limit de sinalização.
- Dois passos de setup-invite foram SKIPPED: syntax-check do harness de emissão e teste distribuído de rate limit de emissão.
- Inspeção do template confirma setupToken de 64 caracteres hexadecimais e consumo atômico por consume_upstatus_setup_invite.
- Porém issueSetupInvite não chama consume_upstatus_setup_invite_rate_limit. A candidata Normal tem convite de uso único, mas ainda não tem o limitador distribuído de emissão que existe na Team Lite #76.
- release.json e o build Normal continuam em 3.4.7, igual à versão Normal instalada. Não há incremento de release.

### #76 Team Lite

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- Passou 110/110 verificações autenticadas e 16/16 não autenticadas.
- O workflow cobre first-access enrollment, rate limit distribuído de emissão, WebRTC, voz, tela, recuperação de salas, singleton de tentativa de voz, Playwright e contratos de updater.
- O handler Team Lite chama consume_upstatus_setup_invite_rate_limit com limite 5 por 900 segundos antes de emitir convite.
- A versão candidata é 3.4.31; a instalada permanece 3.4.30.
- O workflow de candidata é CI, não é o workflow oficial de publicação.

### #82 QA

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43387582940
- O log confirma VALIDATION FAILED: production updateURL mismatch em scripts/validate.mjs:26.
- A falha é do contrato de build/updater herdado; o PR é documental.

### #159 - novo achado de regressão de autorização

- PR: https://github.com/Reekyi/UpStatus/pull/159
- Head 0bf5a9b76156dea69380468197f19d6ee4bcffc3; base QA 1d47e9d18306733dd48f8a9e279c8c2fc28165c6; oito arquivos alterados; Draft; mergeable; sem review.
- Push Validate: https://github.com/Reekyi/UpStatus/actions/runs/43392498395
- Pull Request Validate: https://github.com/Reekyi/UpStatus/actions/runs/43392506216
- Os dois runs passaram em sintaxe, guard do build TEST, contratos offline de release/chat e scripts/validate.mjs. O log declara TEST target inert sentinel (not deployable). Não houve integração Supabase nem browser real.

A #159 melhora o guard de build TEST, separa updateURL/downloadURL da API e remove o fallback que promovia Ricardo/Lohan/Guilherme a implementation_admin por nome. Também exige role administrativa persistida para limpar o chat.

**Regressão P1:** o template Normal da #159 não contém setupToken nem chama consume_upstatus_setup_invite. O fluxo voltou a permitir configurar senha de qualquer conta ainda sem password_hash apenas pelo nome, embora o papel default seja implementation_user. Isso evita promoção automática a admin, mas não exige convite de uso único e reabre a tomada de primeiro acesso de uma conta ainda não configurada. A suíte da #159 testa o papel default e a ausência do fallback nominal, mas não exige setupToken nem testa rate limit de emissão.

Comparação:
- #74 Normal: convite único obrigatório; sem rate limit distribuído de emissão.
- #76 Team Lite: convite único obrigatório e rate limit distribuído de emissão.
- #159 Normal: setup por nome, sem token e sem rate limit de emissão.
- Os três runtimes instalados ainda usam o fluxo antigo sem convite e fallback nominal.

A #159 altera somente o template Normal; não altera src/server/team-lite-index.template.ts. Não integrar a #159 isoladamente nem usá-la como substituta da #74. Rebasear/portar as correções sobre a linha Normal que preserva setup-invite, anexos e rate limit, e adicionar testes de paridade Normal/Team Lite.

Outra limitação: /api/chat/clear na #159 ainda exige name === "Ricardo" junto de admin(name). O papel é consultado no banco, mas o proprietário continua identificado por display name. users.name não é UNIQUE e upstatus_sessions guarda user_name, não user_id. A autorização deve migrar para identidade imutável.

### Guard de build TEST na #159

O guard é um avanço válido:
- Sem configuração, gera sentinel inerte e chave publishable inerte.
- Exige UPSTATUS_TEST_PROJECT_ID e UPSTATUS_TEST_PUBLISHABLE_KEY juntos.
- Rejeita o projeto de produção, o laboratório somente de sinalização e a chave publishable de produção.
- O artefato TEST usa a origem configurada, prefixo próprio e não carrega o release manifest de produção.

Limite: aceita qualquer project ref de 20 caracteres que não seja os dois projetos proibidos. Não prova que o destino tem schema, Storage e Edge Functions full-product. O sentinel protege o build padrão, mas não cria ambiente full-product TEST.

## 4. Runtimes efetivamente instalados

Os artefatos embutidos nas Edge Functions foram decodificados nesta execução.

| Produto | Edge Function | Userscript | Namespace | API do bundle |
|---|---|---|---|---|
| Normal | upstatus v480 | 3.4.7 | upseller | beta10 de produção |
| Team Lite | upstatus-team-lite v15 | 3.4.30 | upseller-team-lite | upstatus-team-lite |
| TEST | upstatus-test v281 | 3.3.28 | upseller | beta10 de produção |

Normal e TEST compartilham namespace upseller e prefixo GM upstatus_screen_share_beta8_. TEST aponta @updateURL para a função upstatus-test, mas CLOUD_SERVER aponta para upstatus-screen-share-3-1-1-beta10 no projeto de produção. O runtime TEST instalado compartilha backend e armazenamento local com Normal.

Os três bundles não contêm private:true nem realtime.setAuth(). Normal e TEST executam remote_command quando command.target corresponde ao membro local. Team Lite também executa o comando, depois de verificar a própria sessão e geração local; isso não autentica o emissor do broadcast. Os handlers instalados continuam aceitando sinalização de voz/tela pelo caminho público.

O projeto de produção possui 38/38 Edge Functions ACTIVE, todas com verify_jwt=false no gateway. Doze funções têm prefixo upstatus-test. Não existe função upstatus-signal em produção. verify_jwt=false não prova ausência de autenticação por si só: os handlers usam sessão customizada, que precisa ser revisada por rota.

## 5. Supabase produção: RLS, grants, SECURITY DEFINER, Realtime e Storage

Projeto dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.

### RLS e grants

- Dez tabelas public têm RLS habilitado e zero policies.
- Nove tabelas public concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER: 126 entradas de grant no total.
- Há 18 grants TRUNCATE, nove para cada papel cliente. RLS não protege TRUNCATE; não foi tentada execução.
- Default ACLs para anon/authenticated permanecem amplas: 120 entradas expandidas nos schemas public, storage, graphql e graphql_public; 48 no schema public.
- Security Advisor: 6 WARN e 10 INFO. Os WARNs correspondem às três funções de broadcast SECURITY DEFINER com EXECUTE para anon e authenticated.
- As três funções upstatus_broadcast_* usam search_path=public e ACL inclui PUBLIC, anon, authenticated e service_role. São funções de trigger; não foi demonstrada invocação RPC direta. O grant amplo continua desnecessário e search_path deve ser endurecido.

### Realtime

Consulta somente leitura das partições de 09 a 15/11 encontrou 125 linhas, todas extension=broadcast, private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

Os clientes instalados assinam upstatus-screen-share-live-3-1-1-beta10. O tópico dos triggers não coincide com o tópico dos clientes. O trigger de mensagens transmite OLD/NEW completos; os outros triggers emitem status e alterações de comando/resultado.

Não existe upstatus-signal em produção. O laboratório tem upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A flag de transporte autenticado nas candidatas começa false; portanto não há cutover seguro demonstrado.

### Storage

- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- storage.objects: zero policies próprias.
- O bucket chat-images aceita imagens, áudio, vídeo e documentos. O acesso público por URL não prova ownership por usuário.

## 6. AUTH-03, identidade e migrations

Produção:
- Sete migrations no ledger.
- Zero colunas setup_token_* em public.users.
- Tabela upstatus_setup_invite_rate_limits ausente.
- Tabelas upstatus_signal_* ausentes.
- users.name sem constraint UNIQUE.
- upstatus_sessions armazena user_name; upstatus_profiles também usa user_name.

Laboratório:
- 39 migrations.
- Quatro colunas setup_token_* em users.
- Tabela upstatus_setup_invite_rate_limits presente.
- Tabelas de salas, membros, eventos, bindings e rate limits de sinalização presentes.
- Sem buckets ou objetos Storage; sem tráfego Realtime no snapshot.

A branch Supabase main permanece MIGRATIONS_FAILED, enquanto o projeto e o preview reportam ACTIVE_HEALTHY. Os quatro arquivos SQL correspondentes às migrations do ledger continuam ausentes em master:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

As quatro consultas de arquivo retornaram 404. O ledger não substitui a proveniência dos arquivos originais.

A função de laboratório upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE. A conclusão é por inspeção de código; não foi feita requisição HTTP real.

## 7. Workflow de publicação Team Lite

O workflow em team-lite-official/.github/workflows/deploy-production.yml ainda executa:

supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api

Também usa Supabase CLI latest e não valida SHA/projeto/migrations com as proteções do Normal. O destino correto é upstatus-team-lite. A PR #76 não modifica esse workflow de produção; altera workflows de candidata e TEST.

**Não despachar o workflow oficial Team Lite.**

## 8. Issues e testes manuais

- Issue #78 permanece OPEN com 0/8 critérios marcados. Os critérios exigem reconexão física sem F5 em Normal e Team Lite, reentrada em sala, iniciar/receber chamadas, ausência de peers/áudio/polling duplicados e teste manual no navegador.
- Issue #79 permanece OPEN; 16 itens marcados e 19 pendentes no checklist do corpo.
- Nenhum teste manual foi executado nesta rodada: sem navegador/Tampermonkey controlado, microfone/tela reais ou ambiente full-product TEST.
- CI é evidência automatizada nos SHAs e runs listados. Inspeção de código e catálogo não equivale a teste HTTP. Os testes físicos continuam pendentes.

## 9. Gates e recomendação

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | BLOCKED | 125 broadcasts private=false; sem endpoint upstatus-signal de produção |
| TEST-ISOLATION | BLOCKED | TEST v281 usa namespace/prefixo/API beta10 de produção |
| MIGRATION-PROVENANCE | BLOCKED | main MIGRATIONS_FAILED; quatro SQLs originais ausentes |
| AUTH-03 | BLOCKED | Produção sem setup-token/rate-limit; #159 regressa ao setup sem convite |
| ACL-STORAGE | BLOCKED | RLS sem policies, grants amplos, SECURITY DEFINER público e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; sem teste físico |
| HUMAN-REVIEW | PENDING | Nenhum review humano nas PRs auditadas e sem autorização de release |

**Recomendação: NOT READY.** Não aprovar merge/release a partir desta auditoria.

## 10. Próximas prioridades

1. Não integrar #159 isoladamente. Rebasear/portar sobre #74 preservando setupToken, consumo único e anexos.
2. Adicionar rate limit distribuído de emissão de convite ao Normal e manter paridade com Team Lite.
3. Migrar owner/admin/sessões/perfis para user_id imutável; remover autorização por display name.
4. Criar projeto full-product TEST, validar schema, Storage, funções e chaves; só então configurar build.
5. Implantar endpoint server-mediated de produção, coordenar tópicos e tornar transporte autenticado default antes de desligar o caminho público.
6. Corrigir workflow oficial Team Lite para upstatus-team-lite, SHA exato, projeto validado e CLI pinada.
7. Corrigir grants, Default ACL, SECURITY DEFINER, RLS e política de Storage.
8. Recuperar proveniência das quatro migrations e diagnosticar MIGRATIONS_FAILED.
9. Corrigir HTTP 409 da voz e validar por HTTP real.
10. Executar os oito critérios físicos da #78 e obter aprovação humana do SHA final.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. A escrita limita-se a este novo relatório na branch QA e à atualização do comentário QA existente na Issue #79; o comentário da Engenharia foi preservado.
