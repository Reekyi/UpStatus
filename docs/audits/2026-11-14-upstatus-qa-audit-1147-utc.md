# Auditoria independente QA do UpStatus — 2026-11-14 11:47 UTC

## Parecer

**NOT READY.** O Realtime instalado continua sem autenticação do emissor; o transporte server-mediated não está disponível nas linhas de produção. A QA continua falhando no contrato de updateURL. Há progresso real em candidatos de avatar, sinalização, AUTH-03 e recuperação de statements SQL, mas nenhum desses candidatos foi integrado e validado em produção.

## Método e limites

- Inspeção read-only do GitHub, dos workflows e dos dois projetos Supabase.
- Consultas SQL somente SELECT e leitura de catálogos.
- Inspeção estática dos bundles de userscript efetivamente implantados e dos templates candidatos.
- Logs de CI existentes foram consultados. Nenhum workflow foi iniciado ou repetido manualmente.
- Não houve teste físico no Tampermonkey, navegador com permissões reais, microfone, tela ou queda de rede.
- Não houve exploração de Realtime, publicação de broadcasts, injeção de SDP/ICE ou captura de áudio/tela.
- O conector não expõe o setting de Dashboard "Allow public access"; a possibilidade de publicação externa em canal público não foi reproduzida.
- Não há checkout local nem ambiente browser de teste nesta execução. A documentação foi escrita diretamente na branch QA pelo GitHub.

## Documento central e refs

O blob de docs/RELEASE_READINESS.md na branch QA foi recuperado integralmente por SHA:
- Blob: 7cfbd70886df42ce790c078c224b19284a632595
- Tamanho: 1.045.105 caracteres e 8.410 linhas.
- Último checkpoint interno encontrado no próprio documento: 2026-11-08 15:30 BRT / 18:30 UTC. Os relatórios de 14/11 estão em arquivos separados; o documento central ainda não contém esta rodada.

Heads consultados:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA: d7d5e0382cb6c1674d92fdf94421f04ffb524423

Divergência calculada contra as bases:
- #74: 887 commits à frente e 1 atrás de master.
- #75: 59 à frente e 0 atrás de team-lite-official.
- #76: 386 à frente e 0 atrás de team-lite-official.
- #82: 304 à frente e 1 atrás de master. O HEAD da QA é d7d5e038.
- #82 contém 159 arquivos, todos em docs/. Nenhum arquivo de runtime foi alterado.

As PRs #74, #75, #76 e #82 continuam abertas e Draft. Não há reviews humanas registradas nessas quatro PRs.

## CI das PRs obrigatórias

| PR | HEAD | Evidência | Resultado |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Validate 43376770142; Smoke 43376770200 | PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Candidate Checks 43363871881 | PASS |
| #82 QA | d7d5e0382cb6c1674d92fdf94421f04ffb524423 | Validate 43586287560 | FAIL |

A falha de #82 é herdada de master e reproduzida no novo HEAD documental:
- Build: UpStatus 3.4.7 / TEST 3.4.7.
- Erro: "VALIDATION FAILED: production updateURL mismatch".
- Origem: scripts/validate.mjs:26.
- O relatório Markdown não é a causa. Não houve rerun nem alteração do validator.

## Candidatos adicionais relevantes

| PR | HEAD | CI exato | Leitura QA |
|---|---|---|---|
| #89 AUTH-03/cutover | 5c46eea3e4c9f909d3e0992bacfbd2263c2d8024 | 42840853509 PASS | Guard bloqueia cutover porque release continua 3.4.7 e as três migrations AUTH-03 não estão aplicadas |
| #124 signed uploads | 77c9d4c3b525325996db973cbec609ae2ddb0d83 | 42594697302 PASS | Contrato client/server offline; não torna buckets privados nem inspeciona bytes realmente enviados |
| #135 migration recovery | 98e96cfe59b0db585fd4a322736cbfdd12484ba0 | 42805693777 FAIL herdado | Statements recuperados do ledger; não são arquivos originais byte a byte |
| #146 remote-command/reconnect | 71c5ce2f730ade8ee3e8b090498202933809ce5c | 43108250452 PASS | Broadcast remote_command vira hint para polling autenticado; não fecha voz/tela |
| #149 Team Lite call provenance | 77352d2e3b93722d6b69a9eec31a92bb63158230 | 43173176077 e 43173176232 PASS | Proveniência sai do payload controlável; ainda não habilita transporte privado por padrão |
| #157 Team Lite avatar owner | b7baf3a98e22b8a9555d667878e49e121d7bcf8c | 43333849082 PASS | Prefixo deriva de users.id, mas signed upload ainda usa upsert:true |
| #158 updater metadata | 25775192ed5be4197581b55123cd4f2f78386c51 | 43363857861 FAIL | Falha na regressão: "files are staged instead of uploaded immediately" |
| #161 Normal API/rate limit | 557814dc31bed779b84a2094358dc6b2a7e67689 | 43479685384 e 43479685445 PASS | Rate limit de emissão de convites; não é rate limit de tentativas de login |
| #163 voz HTTP 409 | 00f357b0f5921d1995bb52c7b50f53ef8276e334 | 43488822143 e 43488822237 PASS | Contrato offline; não houve HTTP real contra Edge Function implantada |
| #164 avatar server-mediated | a27ced56564f3d18948c70138f6d6b2a1f2d0907 | 43544570609 PASS | Limite de corpo/arquivo, MIME por assinatura, ownership por ID e upsert:false; testes usam mocks |

#85 também tem Validate PASS no HEAD b75707b, mas está baseado no master anterior a 9d40461 e foi supersedido pelo trabalho mais recente de #158. O #158 é baseado no master atual e continua falhando na regressão de anexos staged.

## Realtime e código instalado

Management API e bundles:
- Normal distribuidor: função upstatus v480, userscript 3.4.7.
- API Normal usada pelo userscript: upstatus-screen-share-3-1-1-beta10 v6.
- Team Lite: upstatus-team-lite v15, userscript 3.4.30.
- upstatus-test v281 continua dentro do projeto de produção.
- Laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

Nos userscripts Normal e Team Lite implantados:
- Canal criado com channel(UP_REALTIME_TOPIC), sem private:true e sem realtime.setAuth().
- Normal executa executeRemoteCommand quando o target do payload corresponde ao membro local.
- Team Lite também exige sessão local válida e geração atual, mas não autentica o emissor do broadcast.
- call_signal, voice-room e screen-share recebem payloads públicos sem prova de identidade do remetente.
- O comando remoto pode usar a sessão local para sincronizar status no Sale Smartly. O impacto externo depende da permissão de broadcast público, que não foi possível consultar; não houve exploração.

No banco, o snapshot atual contém 106 linhas Realtime, todas private=false, no tópico dos triggers:
- 72 user_status
- 26 db_change
- 4 remote_command
- 4 remote_result

Tópicos:
- Triggers PostgreSQL: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0
- Clientes instalados: upstatus-screen-share-live-3-1-1-beta10

Os tópicos não coincidem. Portanto, as linhas publicadas pelos triggers não comprovam entrega aos clientes atuais. O trigger de mensagens envia a linha OLD/NEW completa por to_jsonb.

As candidatas #74 e #76 mantêm signalTransportFlag=false por padrão e endpoint vazio. Os templates src/server/index.template.ts e src/server/team-lite-index.template.ts não contêm as rotas /room/open, /room/leave ou /signal exigidas pelo cliente. O helper server-mediated existe apenas no laboratório. #146 reduz remote_command a hint; #149 move a proveniência de call-signal para fora do payload. Nenhuma dessas correções está integrada aos runtimes de produção ou torna o transporte privado/default.

**RT-01 permanece bloqueado.**

## PostgreSQL, RLS, grants e SECURITY DEFINER

Produção:
- 10 tabelas public com RLS habilitado e zero policies.
- Nove concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. upstatus_visual_config é a exceção sem esses grants diretos.
- RLS sem policies bloqueia acesso por linha; não protege TRUNCATE. Nenhuma operação foi tentada.
- realtime.messages: RLS true, FORCE RLS false, zero policies; anon/authenticated possuem SELECT, INSERT e UPDATE.
- Default ACL: 300 entradas totais; 120 entradas concedidas a anon/authenticated em schemas/defaults consultados.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, EXECUTE para anon/authenticated/service_role e retornam trigger.
- Security Advisor: 6 WARN (3 anon + 3 authenticated) e 10 INFO. O alerta de RPC direta não foi tratado como exploração comprovada, pois as três funções retornam trigger; os grants amplos continuam desnecessários e o search_path precisa de revisão.

Laboratório:
- 18 tabelas public com RLS e zero policies, sem grants diretos de tabela para anon/authenticated.
- realtime.messages sem linhas, RLS true, zero policies, mas ainda com grants SELECT/INSERT/UPDATE para anon/authenticated.
- Default ACL: 277 entradas totais; 96 para anon/authenticated.
- As três funções de broadcast têm search_path vazio e EXECUTE somente para service_role.
- Security Advisor: 18 INFO e zero WARN.

## Storage

Produção:
- chat-images: público, 20 MiB, 168 objetos.
- profile-images: público, 20 MiB, 20 objetos.
- Zero policies próprias em storage.objects.

Laboratório:
- Nenhum bucket de produto.

O runtime instalado ainda usa upload assinado direto, confiando em MIME/tamanho declarados pelo cliente e com upsert:true. A candidata #157 vincula avatar ao prefixo derivado de users.id, mas mantém upsert:true. A #164 Normal usa upload server-mediated e upsert:false, mas ainda precisa decoder/re-encode confiável, limite de pixels e teste real no Storage. Nenhum upload real foi feito nesta auditoria.

## AUTH-03, identidade e Edge Functions

Projetos:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions ACTIVE.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, duas funções de teste.
- Não existe terceiro projeto Full-Product TEST.
- Branch gerenciada main: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY. O laboratório não tem branches.
- Todas as 38 Edge Functions de produção reportam verify_jwt=false. Isso não prova ausência de autenticação: os handlers principais usam token customizado, que precisa continuar sendo auditado por rota.

Produção:
- 5 usuários, 319 sessões, 5 perfis.
- users.id é bigint; upstatus_sessions e upstatus_profiles continuam ligados por user_name, sem user_id.
- Nenhuma coluna setup_token_* e nenhuma RPC consume_upstatus_setup_invite.
- Nenhum rate limit de tentativas de login foi encontrado.

Laboratório:
- Quatro colunas setup_token_*.
- RPC consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit, SECURITY INVOKER, search_path vazio e EXECUTE somente service_role.
- Nenhum bucket de Storage.

#89 tem três migrations AUTH-03 candidatas e um guard de cutover que falha fechado. O CI passa, mas o guard confirma que a versão de produção permanece 3.4.7 e as migrations não estão aplicadas. #161 mantém rate limit de emissão de convites, não de senha/login.

## Migrations e proveniência

Ledger:
- Produção: 7 migrations.
- Laboratório: 39 migrations.

PR #135 arquiva quatro statements executados em docs/migration-recovery/. Comparei cada arquivo com o campo statements do ledger de produção:
- 20261023154754: correspondência exata; rollback NULL.
- 20261026195855: correspondência exata; rollback NULL.
- 20261027154329: correspondência exata; rollback NULL.
- 20261027155438: correspondência exata; rollback NULL.

Cada registro contém um statement. Isso comprova recuperação exata do texto executado armazenado no ledger, não recuperação byte a byte dos arquivos originais, comentários, formatação ou commit Git original. PR #135 permanece Draft e sem review; não mover os arquivos para supabase/migrations nem executá-los.

**MIGRATION-PROVENANCE está em andamento, não concluído.**

## Workflows

Team Lite oficial:
- workflow_dispatch manual.
- Usa SUPABASE_PROJECT_ID de secret genérico.
- Supabase CLI latest.
- Executa deploy de upstatus, não upstatus-team-lite.
- Não valida SHA/projeto/migrations como o workflow Normal candidato.
- **Não despachar.**

Normal #74:
- Confere master, SHA exato, projeto e token.
- CLI 2.122.1.
- O workflow fixa release 3.4.7 e publica somente upstatus; não coordena beta10.

Stack #89:
- Manual-only, checkout SHA exato, valida organização/projeto e faz preflight read-only de migrations.
- Publicaria beta10 antes de upstatus, sem aplicar migrations automaticamente.
- Cutover bloqueado até versão estável superior a 3.4.7 e migrations AUTH-03 revisadas/autorizadas.

## Issues e aceitação física

- Issue #78: aberta, 0/8 critérios físicos marcados.
- Issue #79: aberta, 16 marcados e 19 pendentes.
- Reviews humanas nas PRs #74, #75, #76 e #82: zero.
- Nenhum teste manual de Tampermonkey, reconexão sem F5, microfone real, compartilhamento real ou interoperabilidade instalada foi executado.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, sem emissor autenticado e sem endpoint de produção |
| TEST-ISOLATION | BLOCKED | Apenas produção e laboratório; laboratório sem Storage |
| MIGRATION-PROVENANCE | IN_PROGRESS | Quatro statements recuperados e comparados ao ledger, mas não são arquivos originais |
| AUTH-03 | IN_PROGRESS | Candidatos com CI; produção sem setup invite/rate limit |
| ACL-STORAGE | BLOCKED | Grants/default ACL amplos e buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 0/8; exige teste físico e confirmação de Ricardo |
| HUMAN-REVIEW | PENDING | Sem reviews humanas ou autorização de release |

## Próximas ações

1. Integrar transporte server-mediated em Normal e Team Lite, com autenticação, membership, replay/expiry e rate limit no servidor; remover fallback público.
2. Corrigir #158 sem enfraquecer a regressão de anexos staged; revalidar updateURL no HEAD exato.
3. Corrigir o workflow Team Lite para o slug correto, projeto fixo, SHA exato e CLI pinada.
4. Portar ownership por ID e upload seguro para Team Lite; fazer teste real de Storage isolado.
5. Completar AUTH-03 e revisar rate limit de login antes de qualquer aplicação em produção.
6. Corrigir grants, Default ACL, SECURITY DEFINER e Storage sob plano revisado.
7. Obter revisão independente dos statements recuperados e preservar a distinção entre SQL executado e arquivo original.
8. Executar os oito critérios físicos da #78 e obter aprovação humana.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. A única escrita desta rodada é este relatório na branch QA e a atualização do comentário QA dedicado na Issue #79.
