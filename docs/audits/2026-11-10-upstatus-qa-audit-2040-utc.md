# UpStatus — auditoria independente QA

**Execução:** 2026-11-10T20:40:06.856Z  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY

## Método e limites

Inspeção read-only de GitHub, heads, PRs, workflows existentes, fontes e artefatos Edge Function, catálogos PostgreSQL, migrations, advisors e funções implantadas. Não executei scripts locais, não iniciei workflows, não fiz teste manual/browser e não enviei broadcasts. Os resultados de CI abaixo são execuções já existentes no GitHub, não testes disparados por esta auditoria.

Vocabulário: CI PASS/FAIL refere-se ao workflow no SHA indicado; CODE INSPECTION é leitura estática/catálogo; MANUAL PENDING exige navegador/dispositivo real; BLOCKED indica dependência de release ainda aberta.

## Heads e documentação

- master: 9d40461babcec8eb8686c2a04be9c675df7da381.
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- QA qa/release-readiness-2026-11-04-master: 4f8ccd4f963000a66198cdff12f633feed67c3bb antes deste relatório.
- Comparação QA contra master: 201 commits à frente, 1 atrás; estado diverged.
- Branch metadata informa protected=false para master, QA e team-lite-official. Rulesets do repositório retornaram lista vazia. A leitura detalhada de branch protection foi recusada com HTTP 403, então required reviewers/status checks não puderam ser inspecionados.
- docs/RELEASE_READINESS.md foi lido integralmente via blob 7cfbd70886df42ce790c078c224b19284a632595: 8.410 linhas. O último checkpoint registrado no arquivo é 2026-11-08 18:30 UTC. O snapshot está desatualizado para os heads e runs de 10/11 e deve ser interpretado como histórico, não como fotografia atual.

## PRs e CI nos heads atuais

| PR | HEAD | Estado | Evidência atual |
|---|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | Open / Draft | Signaling Smoke 42753434336 e Validate 42753434411, ambos pull_request PASS no SHA exato. |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open / Draft | Candidate Checks 41674353127 PASS em 03/11; baseline histórico. |
| #76 Team Lite | 3b1406ddb56aecfa5b5515791ca99aea92c305ab | Open / Draft | Candidate Checks 42753492373, pull_request PASS no SHA exato. #76 está 319 commits à frente de #75 e o supersede; não tratar os dois como PRs independentes para merge. |
| #82 QA | 4f8ccd4f963000a66198cdff12f633feed67c3bb | Open / Draft | Validate 42887355506, pull_request FAIL no SHA exato. |
| #89 AUTH-03 Normal | 5c46eea3e4c9f909d3e0992bacfbd2263c2d8024 | Open / Draft | Guard 42840853509, pull_request PASS. Executou Validate offline, consumo de convite no laboratório e regressões offline do guard; não executou deploy/cutover. |
| #101 sinalização server-mediated | 2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7 | Open / Draft | Nenhum workflow associado ao HEAD exato. |
| #133 Normal provenance | 8d38036ead5e1c3c9cc00db9791f8c9de093ba62 | Open / Draft | API Validate 42804903827 e Signaling Smoke 42804903887, pull_request PASS. |
| #134 Team Lite provenance | ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5 | Open / Draft | Candidate Checks 42804453298 e Call Source Guard 42804453252, pull_request PASS. |
| #135 recuperação SQL | 98e96cfe59b0db585fd4a322736cbfdd12484ba0 | Open / Draft | Validate 42805693777, pull_request FAIL. |
| #137 cleanup AUTH-03 | 73cf0461b8f173277a18e1d2525e8d5ea7aa5526 | Open / Draft | mergeable=false; nenhum check no HEAD consultado. |
| #139 bootstrap parity | be0d10e7c5208f23b4769614c5ac33bba938a91a | Open / Draft | 42851899626, pull_request PASS, mas o passo de paridade executa apenas se a fonte de produção estiver no merge ref; neste PR ela não está, então o script imprime notice e segue. Não valida a fonte #101. |

#133 está 14 commits à frente do HEAD #74; #134 está 10 commits à frente do HEAD #76. Todas as PRs examinadas continuam sem reviews humanas.

## Falhas e incompatibilidades de build/publicação

### QA #82 e recuperação #135

O Validate falha em production updateURL mismatch (scripts/validate.mjs:26). A causa está no build da QA: ele aponta a API de produção para upstatus-screen-share-3-1-1-beta10 e deriva o updateURL desse mesmo host. release.json, porém, aponta a distribuição para /functions/v1/upstatus/upstatus.user.js. O validator está detectando uma divergência real entre distribuição e API; não deve ser relaxado.

O build da #135 conserva a mesma lógica antiga, por isso sua falha também é coerente com o mismatch. A PR #135 arquiva statements recuperados do ledger, mas isso não equivale a recuperar os arquivos originais byte a byte nem fornece rollback.

### Duas arquiteturas Normal incompatíveis

- #89 mantém dois runtimes: distribuição upstatus e API beta10; publica API antes da distribuição, verifica SHA/projeto/organização, preflight read-only de migrations e fixa Supabase CLI 2.122.1. O guard exige versão estável maior que 3.4.7.
- #133 constrói runtime único upstatus e publica somente essa função; seu workflow exige exatamente 3.4.7 e não contém o mesmo preflight coordenado de cutover.
- release.json continua em 3.4.7. Portanto, as regras de versão e os contratos de publicação não podem ser combinados sem decisão de arquitetura e versionamento.

A escolha entre dois runtimes e runtime único continua pendente. Não é seguro integrar #89 e #133 por simples cherry-pick.

### Team Lite

O workflow de team-lite-official continua usando Supabase CLI latest e executa deploy de upstatus, não upstatus-team-lite. Não encontrei verificação equivalente de SHA, project ref, migrations e rollback. Não despachar o workflow atual. A candidata #134 melhora o cliente e os guards de origem, mas não altera o workflow oficial de produção.

## Sinalização e compatibilidade Normal/Team Lite

A fonte candidata #101 implementa autenticação customizada via x-upstatus-token, identidade derivada do servidor, validação de membership de remetente e destinatário, rate limit distribuído de 90 eventos/minuto, limite de corpo de 20 KiB e mapeamento de VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409.

Entretanto:
- #101 não tem check no HEAD atual.
- #139 passa sem executar a paridade, porque o source file de produção não está no merge ref desse PR.
- Nenhum workflow de publicação Normal examinado inclui o slug upstatus-signal.
- A função upstatus-signal não existe no inventário de produção.
- Normal e Team Lite candidatos mantêm signaling_transport_enabled=false como default e endpoint vazio. O listener público call_signal continua registrado; os listeners públicos de voz/tela continuam ativos quando a flag está desligada.
- Os bundles implantados são mais antigos e nem sequer contêm a integração server-mediated.

Na produção, o userscript Normal v3.4.7 chama a API beta10. Team Lite v3.4.30 chama upstatus-team-lite. Ambos assinam o tópico beta10 e não usam private:true nem realtime.setAuth(). Os bundles implantados não contêm a flag/endpoint server-mediated.

### Drift HTTP no laboratório

A Edge Function upstatus-signal-test v32 ainda mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409, mas não VOICE_ATTEMPT_ALREADY_ACTIVE. A fonte #101 contém esse mapeamento.

O teste scripts/test-signal-test-helper-http-contract.mjs declara explicitamente que é offline, sem rede, credenciais ou fixtures; ele testa mapOpenVoiceRoomResult e a ligação do helper ao código-fonte de teste, não o runtime Edge Function v32 implantado. Portanto, seu PASS não prova o contrato HTTP do runtime implantado.

## Supabase — produção

Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. A branch gerenciada main está MIGRATIONS_FAILED, embora o preview apareça ACTIVE_HEALTHY. Produção possui 7 migrations, última 20261027155438.

Edge Functions: 38 ativas; todas reportam verify_jwt=false no metadata. Isso não prova ausência de autenticação, pois os handlers principais usam autenticação customizada. Runtimes relevantes:
- upstatus v480, userscript 3.4.7.
- upstatus-team-lite v15, userscript 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6.
- upstatus-test v281, ainda dentro do projeto de produção.
- Nenhuma upstatus-signal implantada.

### Setup/AUTH-03

Nos bundles Normal e Team Lite implantados, POST /api/setup chama login(req,true). O código implantado não contém setupToken nem consume_upstatus_setup_invite e mantém fallback de implementation_admin por nome para Ricardo, Lohan e Guilherme quando role está vazio. AUTH-03 não está implantado em produção.

### RLS, grants, SECURITY DEFINER e Storage

- 10 tabelas public com RLS habilitado e sem policies.
- 9 tabelas public concedem a anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- realtime.messages tem RLS=true, FORCE RLS=false, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- Default ACLs: 24 records, 300 itens expandidos, 120 privilégios destinados a anon/authenticated.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, retornam trigger, têm search_path=public e EXECUTE para PUBLIC, anon, authenticated e service_role. O Advisor reporta três warnings para anon e três para authenticated, além de 10 INFO de RLS sem policy. Não reproduzi invocação RPC direta; o broadcast público dos triggers está confirmado.
- upstatus_broadcast_messages serializa OLD/NEW completos via to_jsonb e envia db_change com private=false. remote_state e users também enviam broadcasts com private=false.
- Snapshot de realtime.messages: 66 registros, todos private=false: 34 user_status, 20 db_change, 6 remote_command e 6 remote_result. O tópico dos triggers é upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0; os clientes implantados assinam upstatus-screen-share-live-3-1-1-beta10. O setting Dashboard Allow public access não foi exposto pelo conector e não foi feita conexão externa para provar leitura por terceiro.
- Buckets chat-images e profile-images são públicos, 20 MiB cada. storage.objects tem RLS=true, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.

## Supabase — laboratório isolado

Projeto upstatus-security-test ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Possui 39 migrations e duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

- 18 tabelas public com RLS e sem policies; nenhuma concede grants diretos de tabela a anon/authenticated.
- Zero fixtures consultadas, zero mensagens/partições Realtime e zero buckets Storage.
- Default ACLs: 25 records, 277 itens expandidos, 96 privilégios para anon/authenticated. Defaults de postgres em storage e supabase_admin em public/graphql/graphql_public continuam amplos.
- Security Advisor: 18 INFO de RLS sem policy; nenhum WARN de SECURITY DEFINER.
- RPC consume_upstatus_setup_invite(p_user_name, p_setup_token_hash, p_password_hash) existe como SECURITY INVOKER, search_path vazio e EXECUTE somente service_role. A RPC de rate limit de convite também é SECURITY INVOKER e restrita a service_role. As colunas setup_token_* existem em users.
- O histórico remoto do laboratório contém migrations/test-migrations isoladas, mas não registra os mesmos números de versão das migrations de produção AUTH-03 e da nova migration 20261109230000. Os testes isolados não substituem prova de aplicação das migrations exatas.

## Issues, manual e governança

- Issue #78 permanece OPEN, 0/8 critérios físicos aprovados. Nenhum teste manual de perda real de internet, retorno sem F5, reentrada, novas chamadas ou interoperabilidade instalada foi realizado nesta execução.
- Issue #79 permanece OPEN; o corpo contém 16 itens marcados e 19 pendentes. O comentário dedicado UPCONTROL:QA foi atualizado no mesmo comentário existente; o comentário da Engenharia foi preservado.
- Branch metadata: master, QA e team-lite-official protected=false; rulesets vazios. Reviews das PRs examinadas: zero.

## Gates desta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 66/66 mensagens private=false; triggers enviam com false; clientes sem private:true/JWT Realtime. |
| TEST-ISOLATION | in_progress | Projeto isolado ativo, 39 migrations, zero fixtures; Default ACLs ainda amplas e não é full-product TEST. |
| MIGRATION-PROVENANCE | blocked | Quatro statements recuperados em documentação, mas arquivos originais/rollback não comprovados; branch main MIGRATIONS_FAILED. |
| AUTH-03 | blocked | Candidato testado no laboratório, mas produção ainda usa setup antigo e não possui migrations/RPC implantadas. |
| ACL-STORAGE | blocked | Grants amplos, Default ACLs permissivas e dois buckets públicos sem policies. |
| RECONNECT | pending | Issue #78 0/8; depende de teste físico confirmado por Ricardo. |
| HUMAN-REVIEW | pending | PRs Draft sem reviews; nenhuma autorização de release. |

## Próximos passos recomendados

1. Definir com a Engenharia a topologia Normal definitiva (dois runtimes ou runtime único) e alinhar versão, manifesto, build e workflow.
2. Integrar o runtime upstatus-signal em Normal e Team Lite, configurar endpoint autenticado e tornar o modo seguro obrigatório por padrão; remover listeners públicos sensíveis.
3. Executar teste HTTP contra a Edge Function implantada no laboratório, não apenas contra o helper offline; alinhar o mapeamento HTTP 409.
4. Corrigir o workflow oficial Team Lite para upstatus-team-lite, SHA/projeto fixos, CLI pinada, preflight e rollback.
5. Revisar grants, Default ACLs, SECURITY DEFINER, Realtime e Storage com owner autorizado.
6. Validar as migrations exatas em ambiente isolado e recuperar proveniência/rollback; não aplicar em produção sem aprovação explícita.
7. Obter reviews humanas e só então agendar os oito testes físicos da Issue #78.

## Segurança da execução

Nenhuma produção foi modificada. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT-only. Não executei testes locais nem testes manuais; apenas inspecionei resultados de CI já existentes. A única escrita desta execução é este relatório na branch QA e a atualização do comentário QA existente na Issue #79.
