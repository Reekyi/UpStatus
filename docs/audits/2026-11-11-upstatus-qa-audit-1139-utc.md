# Auditoria independente UpStatus — 2026-11-11 11:39 UTC

## Veredito

**NOT READY.** A nova candidata Normal AUTH-03 #131 corrigiu a lacuna de rate limit de emissão de convites no código candidato e passou no teste isolado. Isso é avanço real, mas não está implantado em produção, não cobre throttling de tentativas de login e ainda não foi exercitado por HTTP através de uma Edge Function Normal implantada.

Os bloqueadores de maior impacto permanecem: Realtime público e divergente, grants/Default ACL excessivos, Storage público, migrations históricas sem fonte e branch Supabase main em MIGRATIONS_FAILED. A publicação Normal #143 também não acompanha o HEAD atual da API #142.

## Método e limites

- GitHub: leitura de refs, PRs, diffs, reviews, workflows e logs já existentes.
- Supabase: somente consultas SELECT/catalog, inventário de projetos, migrations, Edge Functions e Advisors.
- Não foi feito checkout local; nenhum teste local, navegador manual ou HTTP manual foi executado.
- Não iniciei nem repeti workflows. Os resultados de CI abaixo são execuções existentes.
- O run #131 usa o projeto isolado com opt-in explícito de mutação, cria buckets de teste e executa cleanup. Essa mutação foi feita pelo workflow histórico, não por esta auditoria. A consulta read-only posterior encontrou zero linhas na tabela de rate limit.
- Nenhuma escrita em produção, migration, deploy, merge, release, publicação de userscript ou alteração de secret/flag/role/grant/policy/ACL foi realizada.

## Heads reais

| Referência | HEAD | Estado/base |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | branch sem proteção |
| QA | d1b78029772c4db162a8b60a21aaff2b2a880acb | 218 à frente / 1 atrás de master |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | branch sem proteção |
| PR #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | open / Draft, base master |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | open / Draft, base team-lite-official |
| PR #76 Team Lite | 4edfbf25476c7c751741b2e14c2c88fdc554f618 | open / Draft, base team-lite-official |
| PR #82 QA | d1b78029772c4db162a8b60a21aaff2b2a880acb | open / Draft, base master |
| PR #131 Normal AUTH-03 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b | open / Draft, base exata no HEAD #74 |
| PR #142 API Normal | f4b1a6dbccecf63152bf353fcaaadfcd41357e11 | open / Draft |
| PR #143 dispatcher Normal | 34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa | open / Draft |

Comparações importantes:

- #131 é filha direta do HEAD atual #74: 1 commit à frente / 0 atrás. Não houve force-push ou reescrita.
- #76 contém a linha de #75: 321 commits à frente / 0 atrás. #75 deve ser tratado como ancestral histórico, não como payload independente de release.
- #143 e o HEAD atual #142 estão divergentes: #143 está 13 commits à frente e 1 atrás do HEAD #142.
- #131 e #142 pertencem a linhas muito diferentes: comparação retornou 884 commits à frente e 29 atrás, com merge-base no antigo a9288cc. Não integrar por cherry-pick cego ou rebase automático.
- master, QA e team-lite-official retornam protected=false; required status checks estão desativados. A lista de rulesets do repositório está vazia.

## CI e inspeção de PRs

| PR / run | Resultado observado | Limite |
|---|---|---|
| #74 Validate 42753434411 | SUCCESS no HEAD fb878537 | CI |
| #74 Smoke 42753434336 | SUCCESS no HEAD fb878537; 19/19 não autenticados e 136/136 autenticados | A etapa de rate limit de emissão de convites foi SKIPPED |
| #75 Candidate Checks 41674353127 | PASS histórico | Baseline ancestral, superado pela #76 |
| #76 Candidate Checks 42993916169 | SUCCESS no HEAD 4edfbf25; 16/16 não autenticados e 110/110 autenticados | Rate limit de emissão de convites executado; Chromium WebRTC e cleanup passaram |
| #82 Validate 43005889995 | FAILURE no HEAD atual d1b780 | Erro exato: production updateURL mismatch |
| #131 Signaling Smoke 42760281798 | SUCCESS no HEAD 17169a30 | 136/136 autenticados; rate limit executado; CI isolado |
| #143 Guard 42984657754 | SUCCESS | offline_guard passou; deploy SKIPPED |
| #143 Validate 42984668622 | SUCCESS | Validação de distribuição/API/dispatcher |

### PR #131 — novo avanço AUTH-03 Normal

A PR #131 substitui a candidata antiga e divergente #130 por um filho limpo do HEAD #74. O workflow PR-triggered executou no merge ref que contém o HEAD 17169a30 e a base fb878537.

O log confirma:
- 136/136 verificações autenticadas passaram.
- O teste de rate limit de emissão foi executado, não skipped.
- 24 chamadas concorrentes no primeiro bucket: cinco permitidas e 19 negadas.
- Bucket independente: cinco permitidas e uma negada.
- O uso do segundo bucket não reiniciou o primeiro.
- Reset da janela e cleanup passaram.
- Chromium validou áudio de chamada, áudio de sala, vídeo de compartilhamento de tela, malha de três participantes e teardown.
- O workflow apontou para o projeto isolado bfpjtfqlnypisxljoxkb.

A migration de produção e a migration de teste são byte-idênticas às de Team Lite #76:
- Migration de produção: blob ab73b5cd8200147a449327d21798eef588834d50.
- Migration de teste: blob bd12f37dc464c3b1ab322494914d0763fa733d49.
- Harness: blob ba22efb520cc0c23078a1395b207b62a96078231.

Inspeção do SQL candidato:
- Tabela com RLS habilitado.
- Revoga privilégios de PUBLIC, anon e authenticated.
- Concede SELECT/INSERT/UPDATE/DELETE somente a service_role.
- RPC SECURITY INVOKER, search_path vazio, EXECUTE somente service_role.
- Upsert atômico para janela fixa.
- Limpeza oportunista limitada a 100 buckets antigos por execução.
- Backend usa cinco emissões por administrador em 900 segundos.
- RPC indisponível retorna 503 (fail closed); limite excedido retorna 429 antes de ler o corpo.

Limites restantes:
- O contrato da rota usa cliente de banco mockado; a RPC real foi exercitada no laboratório.
- Não houve HTTP através de uma Edge Function Normal candidata implantada.
- Não cobre throttling de tentativas de login nem fecha todo o AUTH-03.
- A migration não foi aplicada em produção.
- A produção não contém a tabela nem a RPC.

Nota de hardening P2: o contador continua incrementando mesmo depois de ultrapassar o limite. Considerar saturar o contador em limite+1 para reduzir crescimento e escrita desnecessária sob uma sessão administrativa abusiva.

### #142 e #143

#143 passou nos guards, mas seu base SHA 6fa53bd está atrás do HEAD atual #142 f4b1a6. A comparação retorna 13 à frente / 1 atrás. O dispatcher ainda precisa ser reconciliado com a API que realmente será publicada. A versão Normal no manifesto também precisa ser superior à versão implantada 3.4.7 antes de qualquer release. Nenhuma aprovação humana foi registrada.

## Supabase — produção

Projeto dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.

- 7 migrations no ledger.
- 38/38 Edge Functions ACTIVE.
- Funções principais: upstatus v480, upstatus-team-lite v15, upstatus-test v281 e beta10 v6.
- Não existe upstatus-signal em produção.
- verify_jwt=false no metadata das 38 funções. Isso não prova ausência de autenticação: os handlers principais usam autenticação customizada por sessão/token; não classificar todas como abertas sem inspeção de rota.

A branch gerenciada Supabase main continua MIGRATIONS_FAILED, embora o projeto esteja ACTIVE_HEALTHY.

### Proveniência de migrations

master contém somente três arquivos SQL em supabase/migrations. O ledger de produção contém sete versões. Continuam ausentes de master:

1. 20261023154754_create_upstatus_visual_config.sql
2. 20261026195855_add_chat_message_file_name.sql
3. 20261027154329_allow_chat_document_mime_types.sql
4. 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruir esses SQLs por inferência e não aplicar migration sem revisão e autorização.

### Realtime

Consulta SELECT em realtime.messages retornou 67 registros, todos private=false, no tópico legado:
- db_change: 20
- remote_command: 6
- remote_result: 6
- user_status: 35

Os userscripts efetivamente servidos em upstatus v480 e upstatus-team-lite v15 foram decodificados:
- ambos assinam upstatus-screen-share-live-3-1-1-beta10;
- não configuram private:true;
- não chamam realtime.setAuth().

Os triggers PostgreSQL publicam em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. O trigger de mensagens envia OLD/NEW completo via to_jsonb. Os tópicos não coincidem.

As três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, EXECUTE para PUBLIC/anon/authenticated/service_role e retornam trigger, anexadas a triggers. Não foi demonstrada invocação RPC direta; o risco comprovado é o broadcast público e o payload excessivo.

realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE para anon e authenticated.

### RLS, grants e Default ACL

- Dez tabelas públicas com RLS e zero policies.
- Nove tabelas concedem sete privilégios a anon e authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- Total observado: 126 grants diretos nas nove tabelas.
- RLS não protege TRUNCATE.
- Default ACL: 24 registros de ACL e 120 grants individuais para anon/authenticated, principalmente em public, storage, graphql e graphql_public, sob postgres/supabase_admin.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy.
- Performance e Health Advisors sem findings.

### Storage e chat

Buckets de produção:
- chat-images: público, 20 MiB.
- profile-images: público, 20 MiB.
- Zero policies próprias em storage.objects.

Consulta agregada em public.messages:
- 279 mensagens.
- Cinco do tipo document.
- As cinco sem file_name.

O runtime beta10 v6 ainda não referencia file_name nem a RPC de rate limit. Signed upload existe, com limite de 20 MiB. A rota de limpeza global do chat continua comparando literalmente o nome Ricardo, apesar de existir helper administrativo por papel em outras rotas.

## Supabase — laboratório

Projeto bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

- 39 migrations.
- Duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Sem buckets Storage e sem runtimes full-product Normal/Team Lite.
- A tabela upstatus_setup_invite_rate_limits existe, está vazia, com RLS, zero policies e sem grants de cliente.
- A RPC consume_upstatus_setup_invite_rate_limit existe como SECURITY INVOKER, search_path vazio, EXECUTE somente service_role.
- Security Advisor sem WARN; 18 INFO de RLS sem policies.

O laboratório é adequado para contratos SQL isolados e testes de concorrência de rate limit, mas não é um ambiente full-product de aceitação.

A função upstatus-signal-test v32 continua sem o mapeamento específico de VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409. Não foi feita requisição HTTP manual.

## Issues e aceitação manual

- Issue #78 permanece aberta, 0/8 critérios físicos aprovados. Nenhuma queda real de internet, retorno sem F5, reentrada em sala, nova chamada, teste de microfone/tela com permissões reais ou interoperabilidade instalada foi executada nesta rodada.
- Issue #79 permanece aberta. O comentário dedicado QA foi atualizado; o comentário da Engenharia foi preservado.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcast público e tópicos divergentes |
| TEST-ISOLATION | IN_PROGRESS | RPC isolada e limpa, mas laboratório não é full-product |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs históricos ausentes; main MIGRATIONS_FAILED |
| AUTH-03 | IN_PROGRESS | #131 passou no laboratório, mas produção não tem schema/RPC e login throttling/HTTP real faltam |
| ACL-STORAGE | BLOCKED | Grants/Default ACL excessivos e buckets públicos |
| RECONNECT | PENDING | 0/8 critérios físicos |
| HUMAN-REVIEW | PENDING | PRs Draft sem reviews; nenhuma autorização de release |

## Próximos passos recomendados

1. Revisar #131 e integrar cuidadosamente na linha de API/chat, sem misturar histories divergentes automaticamente.
2. Completar AUTH-03 com login-attempt throttling e teste HTTP no runtime candidato isolado.
3. Alinhar #143 ao HEAD atual #142 e validar versão Normal superior a 3.4.7.
4. Corrigir Realtime para transporte privado/autorizado e reduzir payloads antes de qualquer migração de tópico.
5. Recuperar e validar os quatro SQLs históricos; diagnosticar MIGRATIONS_FAILED.
6. Revisar grants, Default ACL e Storage em ambiente isolado apropriado.
7. Corrigir workflow oficial Team Lite e adicionar proteção de branch/rulesets com revisão humana.
8. Após builds candidatos, executar os testes físicos da #78 e obter aprovação humana explícita.

**Nenhuma produção foi alterada. Todas as consultas SQL desta auditoria foram SELECT-only.**
