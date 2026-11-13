# UpStatus — auditoria independente QA
**Data:** 2026-11-13 23:33:58 UTC  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase laboratório:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master

## 1. Método e limites

Foram consultados GitHub (refs, PRs, reviews, diffs, workflows e logs), o documento RELEASE_READINESS.md integralmente e os dois projetos Supabase por inventário, catálogos PostgreSQL, Edge Functions, migrations e Security Advisor. As consultas SQL desta rodada foram SELECT-only.

Não foram executados testes manuais, uploads reais, chamadas externas de sinalização, alterações de fixtures, reruns, deploys, migrations, merges, releases, publicações de userscript, alterações de secrets/flags/roles/grants/policies/ACLs ou operações destrutivas. Os testes citados como PASS são evidências de CI nos SHAs indicados, não testes físicos.

O documento docs/RELEASE_READINESS.md foi lido integralmente: 8.410 linhas e 1.045.105 caracteres. Seu último checkpoint técnico continua datado de 2026-11-08 18:30 UTC. O arquivo original foi preservado; este relatório é um arquivo separado.

## 2. Heads e PRs

Refs conferidas por GitHub API:

- master: 9d40461babcec8eb8686c2a04be9c675df7da381 (não protegido).
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6.
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281 (não protegido).
- QA antes deste relatório: fa07d21af71ad2b53eb4c10e98e4f9e1696d1136.
- QA versus master: 291 commits à frente, 1 atrás; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b.

| PR | HEAD | Base | Estado |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master | Open / Draft |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | Open / Draft |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | team-lite-official | Open / Draft |
| #82 QA | fa07d21af71ad2b53eb4c10e98e4f9e1696d1136 | master | Open / Draft |
| #161 Normal | 557814dc31bed779b84a2094358dc6b2a7e67689 | chore/continuity-foundation | Open / Draft |
| #163 Voz | 00f357b0f5921d1995bb52c7b50f53ef8276e334 | #161 | Open / Draft |
| #164 Upload | 6844cf7c51fdf3b2a19e8b6286544a9fcb781a64 | develop | Open / Draft |

As sete PRs continuam abertas e Draft. A consulta de reviews retornou zero reviews em cada uma. A branch QA e a PR #82 estavam sincronizadas no início da gravação deste relatório.

## 3. CI por SHA exato

| Linha | Run | Resultado |
|---|---|---|
| #74 Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | SUCCESS |
| #74 Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | SUCCESS |
| #75 Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico; baseline, não substitui #76 |
| #76 Candidate Checks | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | SUCCESS; 110/110 autenticados e 16/16 não autenticados |
| #82 Validate | [43520587871](https://github.com/Reekyi/UpStatus/actions/runs/43520587871) | FAILURE: production updateURL mismatch |
| #161 Validate | [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) | SUCCESS |
| #161 Smoke | [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | SUCCESS; 136/136 autenticados e 19/19 não autenticados |
| #163 Validate | [43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) | SUCCESS |
| #163 Voice Contract | [43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) | SUCCESS |
| #164 Validate | [43524438225](https://github.com/Reekyi/UpStatus/actions/runs/43524438225) | SUCCESS no HEAD 6844cf7 |

O log da #76 confirma negociação WebRTC em Chromium para chamada, voz e vídeo de tela, mesh autenticado de três participantes, teardown, 90 solicitações aceitas e uma rejeitada com HTTP 429/Retry-After, rate limit distribuído, concorrência de convites e recuperação de tentativas de voz. O log da #161 confirma 136/136 checks autenticados, os fluxos de mídia Chromium, mesh de três participantes, rate limit de sinalização e convites, consumo atômico e cleanup.

A #163 confirma o contrato de status 400/404/410/409/500 e o mapeamento VOICE_ATTEMPT_ALREADY_ACTIVE para 409. O teste é offline/contratual; não chama a Edge Function implantada.

A #164 validou build PROD 3.0.40 / TEST 3.0.40-beta.22 e testes de cliente/servidor por VM e mocks. Não houve PUT real no Storage.

O workflow Validate da linha #161 agora inclui chore/continuity-foundation em pull_request.branches, que é a base real da #161. O Validate e o Smoke passaram no mesmo SHA. A falha atual da #82 é distinta: o log termina em VALIDATION FAILED: production updateURL mismatch. O validator foi preservado e não houve rerun.

CI automatizado não fecha os critérios físicos da Issue #78: Tampermonkey instalado, queda real de rede, reconexão sem F5, permissões reais de microfone/tela e interoperabilidade instalada Normal ↔ Team Lite.

## 4. Reauditoria independente da #164 — ownership de avatar

A Engenharia atualizou a #164 para o HEAD 6844cf7. A inspeção do diff e dos testes confirma avanço real:

- A função avatarUserId(name) consulta users.id pelo nome autenticado e exige exatamente uma linha válida; ausência, ID inválido ou nome duplicado falha fechado.
- avatarOwnerPrefix deriva um prefixo estável do ID por hash.
- Upload assinado e caminho legado de avatar usam o prefixo por ID.
- profileRoute rejeita URL fora do bucket/profile do projeto, caminho não canônico e prefixo de outro proprietário (403).
- A rota de upload assinado retorna 409 quando não consegue resolver uma identidade única.
- createSignedUploadUrl usa upsert:false, impedindo sobrescrita pelo ticket.
- Os testes VM cobrem ID ausente/ambíguo/inválido, prefixos distintos, URL cross-owner e upsert:false.

**Limitações que permanecem:**

1. A sessão ainda é identificada por nome. O servidor resolve users.id a partir de ctx.name; isso melhora o ownership do objeto e falha fechado em ambiguidade, mas não conclui uma migração de sessão para user_id.
2. A rota confere p.size e p.mime declarados pelo cliente. O navegador faz PUT diretamente no Storage, sem inspeção server-side dos bytes efetivamente recebidos nem verificação de assinatura do conteúdo.
3. O bucket implantado profile-images é público e permite 20 MiB. O limite candidato de avatar é 2 MiB, mas o ticket não prova que o objeto recebido respeitou esse limite real.
4. A resposta anuncia expiresIn=7200; a janela do ticket deve ser revisada e reduzida.
5. O bucket continua sem policies próprias em storage.objects.
6. A #164 altera src/server/index.template.ts e src/userscript/upstatus.user.template.js; não altera o template Team Lite. Não há paridade Team Lite demonstrada por esta PR.
7. Os testes de servidor substituem Storage e banco por mocks. Não comprovam PUT real, MIME por magic bytes, quarentena, leitura pública ou ACL em um projeto Supabase.

A melhoria de ownership e upsert:false está aprovada em CI no SHA 6844cf7, mas a #164 deve permanecer Draft. Recomenda-se upload em quarentena privada, finalização server-side, inspeção dos bytes/MIME real, ownership por identidade imutável e publicação somente após validação.

## 5. Compatibilidade e AUTH-03

### Produção implantada

A listagem do projeto de produção contém 38 Edge Functions ACTIVE, todas com verify_jwt=false. Funções operacionais relevantes:

- upstatus v480, userscript 3.4.7.
- upstatus-team-lite v15, userscript 3.4.30.
- upstatus-test v281, userscript 3.3.28.
- upstatus-screen-share-3-1-1-beta10 v6.

verify_jwt=false não prova, isoladamente, que todas as rotas sejam anônimas; o produto usa autenticação própria por token de sessão. Ainda assim, exige inventário explícito de autenticação e autorização por rota.

A inspeção dos bundles embutidos Normal e Team Lite confirma:
- Upload de avatar com limite de 20 MiB e createSignedUploadUrl(..., {upsert:true}).
- Primeiro acesso sem setupToken/convite único.
- Nenhum rate limit específico de tentativas de login encontrado.
- Sessões e perfis continuam usando user_name; não há user_id nessas tabelas.
- O login Normal exige seis caracteres, enquanto Team Lite exige quatro.

O banco possui cinco usuários, zero hashes de senha vazios, zero roles vazias e zero grupos de nomes duplicados. Isso não elimina o problema estrutural: users.name não tem constraint UNIQUE e a identidade das sessões permanece baseada em nome.

### Candidatas

Normal #161 e Team Lite #76 incluem setup-invite com consumo atômico e rate limit de emissão: cinco convites por administrador em quinze minutos. Não encontrei rate limit de tentativas de login nas duas candidatas. O rate limit de convite não substitui proteção contra brute force no login.

### Laboratório

O projeto isolado possui quatro colunas setup-token em users e duas RPCs:
- consume_upstatus_setup_invite
- consume_upstatus_setup_invite_rate_limit

Ambas são SECURITY INVOKER, search_path vazio e EXECUTE restrito a postgres/service_role. Essas proteções não estão implantadas em produção.

## 6. Realtime, RLS, grants e SECURITY DEFINER

### Realtime de produção

Consulta SELECT em realtime.messages:

- 106 mensagens nos últimos 14 dias; 106/106 private=false.
- Eventos: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- Todas no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- RLS habilitado, FORCE RLS desabilitado, sete partições e zero policies.
- anon e authenticated possuem SELECT, INSERT e UPDATE.

Os bundles Normal e Team Lite foram decodificados do código implantado: ambos assinam upstatus-screen-share-live-3-1-1-beta10, não usam private:true nem realtime.setAuth(). O tópico dos clientes difere do tópico dos triggers.

O listener público de remote_command chama executeRemoteCommand quando target corresponde ao membro local. call_signal, voice-room e screen-share entregam payloads aos handlers sem prova autenticada do emissor ou membership validada no servidor. Nenhum broadcast externo foi injetado e nenhum ataque foi reproduzido; o achado é uma superfície de confiança pública confirmada por inspeção estática, não incidente explorado.

O trigger de mensagens envia a linha completa via to_jsonb(OLD/NEW), incluindo conteúdo e metadados, em broadcast público. Os triggers de status remoto e usuários também usam private=false.

### SECURITY DEFINER

Produção tem três funções SECURITY DEFINER de broadcast:
- upstatus_broadcast_messages()
- upstatus_broadcast_remote_state()
- upstatus_broadcast_users()

As três retornam trigger, usam search_path=public e têm EXECUTE efetivo para PUBLIC, anon, authenticated e service_role. Como retornam trigger, não foi demonstrada chamada RPC direta comum pelo PostgREST. Os grants amplos são desnecessários e o payload público de mensagens é o risco concreto.

No laboratório, as três funções também são SECURITY DEFINER, mas usam search_path vazio e EXECUTE somente para postgres/service_role.

### RLS, grants e Default ACL

Produção:
- 10 tabelas public com RLS habilitado e zero policies.
- Nove dessas tabelas concedem a anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER.
- RLS não protege TRUNCATE; os privilégios foram inspecionados, não exercitados.
- Default ACLs continuam amplas para anon/authenticated em objetos de postgres e supabase_admin nos schemas public/storage/GraphQL.
- Security Advisor: 6 WARN relacionados às três SECURITY DEFINER e 10 INFO de RLS sem policy.

Laboratório:
- 18 tabelas public com RLS e sem policies.
- Zero privilégios diretos de tabela public para anon/authenticated nas tabelas consultadas.
- Security Advisor: zero WARN e 18 INFO.
- realtime.messages ainda não tem policies e mantém grants SELECT/INSERT/UPDATE para anon/authenticated, embora esteja sem linhas.

## 7. Storage

Produção:
- chat-images: público, 20 MiB, 168 objetos.
- profile-images: público, 20 MiB, 20 objetos.
- Zero policies próprias em storage.objects.

Os limites e a allowlist do bucket são controles de armazenamento, mas não provam MIME por assinatura nem ownership. A candidata #164 ainda não altera buckets/policies e não foi implantada.

Laboratório: nenhum bucket Storage de chat/perfil; portanto, não é ambiente de teste full-product para upload.

## 8. Migrations e projetos

Há exatamente dois projetos Supabase:
- Produção dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY.
- Laboratório upstatus-security-test / bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY.

Não existe Full-Product TEST independente.

Migrations:
- Produção: 7 no ledger.
- Laboratório: 39 no ledger.
- master e QA: somente três arquivos em supabase/migrations.

Quatro versões do ledger de produção não possuem SQL canônico correspondente em master/QA. O ledger confirma que as versões foram aplicadas, mas não recupera a proveniência byte a byte dos SQLs originais.

A branch gerenciada Supabase main permanece MIGRATIONS_FAILED; o preview está ACTIVE_HEALTHY. A causa do estado de migration branch não foi diagnosticada nesta rodada.

## 9. Workflows e publicação

### Normal

O workflow candidato Normal é manual-only, verifica refs de master, SHA de checkout, projeto dlfvkawaiqduhlazsszm e usa Supabase CLI 2.122.1. É mais seguro que o workflow Team Lite.

release.json em master permanece 3.4.7. O deploy workflow candidato também exige explicitamente version === 3.4.7. O build root-artifact sync exige versão estritamente superior à versão do artefato rastreado. Portanto, o próximo cutover de userscript precisa coordenar novo versionamento e atualização do guard; não há release aprovada nesta rodada.

### Team Lite oficial

O workflow em team-lite-official:
- usa Supabase CLI latest;
- recebe SUPABASE_PROJECT_ID de secret genérico, sem validação de projeto/SHA equivalente ao Normal;
- executa supabase functions deploy upstatus, em vez de upstatus-team-lite.

**Não despachar o workflow oficial Team Lite.**

### TEST

O workflow em develop tem workflow_dispatch e push para develop, usa SUPABASE_PROJECT_ID genérico e CLI latest. Não há verificação explícita no próprio workflow que vincule o projeto de deploy ao TEST project id usado pelo build. A validação do build rejeita project refs de produção e do laboratório, mas o workflow de deploy continua sem allowlist de destino.

## 10. Issues, revisão humana e testes físicos

- Issue #78 continua aberta, 0/8 critérios físicos aprovados.
- Issue #79 continua aberta, checklist com 16/35 itens marcados.
- Nenhuma review humana registrada nas PRs #74, #75, #76, #82, #161, #163 e #164.
- master e team-lite-official retornaram protected=false. O estado de proteção da QA não foi confirmado nesta consulta.

Nenhum teste manual foi realizado: não houve Tampermonkey instalado, perda real de rede, reconexão sem F5, microfone real, permissão de tela ou interoperabilidade física Normal ↔ Team Lite.

## 11. Gates

| Gate | Estado QA | Evidência/razão |
|---|---|---|
| RT-01 | BLOCKED | Broadcast público, payload completo e ausência de autenticação privada |
| TEST-ISOLATION | BLOCKED | Só produção e laboratório signaling/auth; sem Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Ledger produção 7 versus 3 SQLs canônicos |
| AUTH-03 | BLOCKED | Sem setup-invite em produção, sem login rate limit e sessões sem user_id |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, SECURITY DEFINER, buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 sem aceite físico; não houve teste sem F5 |
| HUMAN-REVIEW | PENDING | Nenhuma review humana nem autorização de release |

## 12. Veredito e próximos passos

**NOT READY.**

Prioridades:
1. Completar upload seguro com inspeção dos bytes reais, MIME por assinatura, quarentena privada e ownership por ID; depois portar a correção para Team Lite.
2. Corrigir o Validate QA sem remover assertions e manter os checks no SHA correto.
3. Criar Full-Product TEST independente; não usar o laboratório signaling/auth como substituto.
4. Implementar AUTH-03 completo, incluindo rate limit de login e identidade persistida por users.id.
5. Migrar Realtime para canais privados/autorizados, minimizar payloads e remover listeners públicos sensíveis.
6. Revisar grants, Default ACL, SECURITY DEFINER e Storage com plano de rollback.
7. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
8. Corrigir o workflow Team Lite e coordenar o próximo versionamento Normal.
9. Executar os oito critérios físicos da #78 e obter aprovação humana no SHA final.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags ou operação destrutiva foi realizada. A única escrita desta rodada é este relatório documental na branch QA e a atualização do comentário QA dedicado na Issue #79.
