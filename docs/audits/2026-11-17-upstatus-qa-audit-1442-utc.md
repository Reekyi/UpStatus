# UpStatus — auditoria independente QA

**Data:** 2026-11-17 14:42 UTC (11:42 BRT)  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, diffs, reviews, workflows/logs, bundles implantados, catálogo PostgreSQL, Advisors e logs agregados. Nenhum teste novo foi executado.

## 1. Classificação da evidência

- **AUTOMATED PASS/FAIL:** resultado de workflow existente no SHA indicado. Não foi repetido nesta rodada.
- **CODE INSPECTION:** leitura estática de fonte, bundle, workflow ou catálogo.
- **MANUAL PENDING:** requer navegador/instalação real, microfone/tela ou operador.
- **BLOCKED:** dependência ou falha de infraestrutura impede a validação.
- **NOT VERIFIED:** evidência insuficiente para afirmar comportamento.

O arquivo `docs/RELEASE_READINESS.md` foi lido na branch QA. Ele tem aproximadamente 1.046.356 caracteres e sua última seção de revalidação é de 2026-11-15 06:30 UTC. Portanto, é um checkpoint histórico, não um retrato atualizado de 17/11. As refs e os ambientes foram consultados novamente abaixo.

## 2. Heads reais e proteção

Refs confirmadas por GitHub API:

| Branch | HEAD | Proteção |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | `protected=false` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | `protected=false` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | `protected=false` |
| qa/release-readiness-2026-11-04-master | `ee4164319d98376a235148a46e947eea8a81d6d7` | `protected=false` |

O endpoint de rulesets retornou lista vazia. Nenhuma das quatro branches tem required status checks ativos. Isso é um risco de governança: o processo depende de revisão operacional, não de proteção técnica do repositório.

## 3. PRs e commits

Todas as PRs abaixo seguem OPEN/Draft/unmerged. As consultas de reviews retornaram zero reviews submetidas para #74, #75, #76, #82, #161 e #177.

| PR | HEAD | Base | Comparação | Arquivos | Estado |
|---|---|---|---:|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | master `a9288ccf` | 887 ahead / 1 behind | 90 | Open/Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 ahead / 0 behind | 10 | Open/Draft |
| [#76 Team Lite continuation](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | team-lite-official | 389 ahead / 0 behind | 59 | Open/Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `ee4164319d98376a235148a46e947eea8a81d6d7` | master `a9288ccf` | 399 ahead / 1 behind | 232 | Open/Draft |
| [#161 Normal AUTH-03](https://github.com/Reekyi/UpStatus/pull/161) | `557814dc31bed779b84a2094358dc6b2a7e67689` | #74 HEAD | 12 commits na PR | 10 | Open/Draft |
| [#177 Normal 3.4.8](https://github.com/Reekyi/UpStatus/pull/177) | `58c709ca351a345897df6e7fae9ad34542593fcf` | #161 HEAD | 1 ahead / 0 behind | 1 | Open/Draft |

#76 é continuação da #75: comparação direta indica 330 commits à frente e zero atrás. Não tratar #75 e #76 como payloads independentes.

### CI existente nos HEADs exatos

| PR | Workflow | Run | Resultado |
|---|---|---:|---|
| #74 | Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | **PASS** |
| #74 | Signaling Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **PASS** |
| #75 | Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico** |
| #76 | Candidate Checks | [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) | **FAIL** |
| #82 | Validate | [44094547996](https://github.com/Reekyi/UpStatus/actions/runs/44094547996) | **FAIL** |
| #161 | Validate | [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) | **PASS** |
| #161 | Signaling Smoke | [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | **PASS** |
| #177 | Validate | [44080068698](https://github.com/Reekyi/UpStatus/actions/runs/44080068698) | **PASS** |

#74 e #161 têm evidência automatizada de WebRTC/voz/tela, mesh de três participantes, rate limit e concorrência de convites/recibos. O resultado de #161 é histórico e foi obtido antes de o laboratório ficar INACTIVE. Não substitui validação no ambiente atual nem teste físico.

#76: o job de contratos offline de signed-upload passou. O job de candidate checks falhou no passo `Test isolated signaling endpoint authentication`: 0/16 checks não autenticados passaram porque o endpoint devolveu HTTP 402 com `exceed_edge_functions_invocations_quota`, em vez de 401/405. Playwright, IIFE completo, integração autenticada, concorrência e cleanup foram ignorados.

#82: o Validate falhou em `scripts/validate.mjs:26` com `production updateURL mismatch`. O erro é herdado do build/validator da master; o diff da #82 é documental. O commit QA atual é o mesmo HEAD da #82.

#177 altera somente `release.json` de 3.4.7 para 3.4.8. Seu Validate passa, mas o workflow de produção da master exige exatamente 3.4.7. A PR não altera o workflow. Não despachar o deploy com essa combinação.

## 4. Workflows de publicação

Inspeção dos arquivos atuais:

- **master / deploy-production.yml:** manual-only, environment `production`, exige `release.json.version === 3.4.7`, usa Supabase CLI `latest` e publica somente `upstatus`.
- **master / deploy-test.yml:** manual-only, usa o secret genérico `SUPABASE_PROJECT_ID`, não contém guard explícito que compare o alvo com produção/laboratório e publica `upstatus-test`.
- **team-lite-official / deploy-production.yml:** manual-only, rejeita apenas prerelease, usa CLI `latest` e publica `upstatus`, não `upstatus-team-lite`. **Não executar.**
- **team-lite-official / deploy-test.yml:** ainda tem gatilho push em develop e usa `SUPABASE_PROJECT_ID` genérico. Não há guard de projeto TEST dedicado.
- **#76 candidate deploy-test:** melhora o caminho TEST com workflow_dispatch, `SUPABASE_TEST_PROJECT_ID` e bloqueios para IDs conhecidos de produção/laboratório. Essa proteção permanece somente na candidata e não cria um workflow correto de produção Team Lite.

Nenhum workflow foi despachado.

## 5. Supabase: projetos, migrations e Edge Functions

A organização conectada lista somente dois projetos:

| Projeto | Estado observado | Observação |
|---|---|---|
| produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | PostgreSQL 17.11.0.002 |
| `upstatus-security-test` `bfpjtfqlnypisxljoxkb` | **INACTIVE** | PostgreSQL 17.11.0.003 |

Não existe Full-Product TEST ativo. O status ACTIVE_HEALTHY do projeto de produção não contradiz os HTTP 402 registrados nas Edge Functions.

Produção lista sete migrations; a última é `20261027155438`. A branch gerenciada `main` retorna `MIGRATIONS_FAILED`, embora o preview informe ACTIVE_HEALTHY. Nenhuma migration foi aplicada. O histórico QA anterior registrou quatro statements recuperados comparados ao ledger após remover somente a quebra de linha terminal; essa comparação de origem não foi repetida nesta rodada.

A inventory retornou **38/38 Edge Functions ACTIVE e 38/38 com platform `verify_jwt=false`**. Isso não prova que todas estejam sem autenticação: a inspeção de fonte das funções centrais `upstatus` v480, `upstatus-team-lite` v15 e API beta10 v6 encontrou autenticação customizada por `x-upstatus-token`, SHA-256, consulta a `upstatus_sessions` e validação de expiração. Há cache de sessão por até 30 segundos, portanto revogação pode ter atraso limitado. A cobertura de autenticação das 38 funções ainda não foi auditada rota por rota.

## 6. Disponibilidade: HTTP 402 em produção

Consulta read-only de `function_edge_logs`, usando `response.status_code='402'`:

**Últimas 24 horas consultadas (2026-11-16 14:34 UTC a 2026-11-17 14:34 UTC): 68.657 respostas 402.**

| Rota | 24h |
|---|---:|
| `/api/chat` | 36.586 |
| `/api/status` | 16.012 |
| `/api/remote-status` | 16.001 |
| `/api/members` | 20 |
| `/api/me` | 20 |
| `/api/account` | 16 |
| download `/upstatus/upstatus.user.js` | 2 |

**Última hora consultada (13:34 a 14:34 UTC): 6.650 respostas 402** — chat 3.520, status 1.562, remote-status 1.560, members 3, me 3 e download 2.

Os endpoints de API acima são chamados em `upstatus-screen-share-3-1-1-beta10`. A causa específica dos 402 de produção não foi identificada. Não atribuir automaticamente à quota do laboratório: a mensagem de quota foi comprovada no projeto de teste, não na produção.

## 7. Bundles instalados e compatibilidade

Os bundles foram recuperados das funções implantadas e decodificados para inspeção estática:

| Componente | Versão do userscript | Função servidora | Destino interno da API |
|---|---|---|---|
| Normal | 3.4.7 | `upstatus` v480 | `upstatus-screen-share-3-1-1-beta10` |
| Team Lite | 3.4.30 | `upstatus-team-lite` v15 | `upstatus-screen-share-3-1-1-beta10` |
| API legada | 3.1.1-beta8 | `upstatus-screen-share-3-1-1-beta10` v6 | própria função beta10 |

Normal distribui pelo endpoint `/functions/v1/upstatus/upstatus.user.js`; Team Lite usa raw GitHub em `team-lite-official`. Apesar dos endpoints de distribuição distintos, ambos os bundles ainda chamam a API beta10.

Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`. O banco contém broadcasts no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Há incompatibilidade de tópico entre o código instalado e os triggers atuais.

Na inspeção dos handlers instalados, Normal executa `executeRemoteCommand` quando o payload tem `target===member`; Team Lite exige sessão local autenticada e geração/membro atuais, mas o remetente do broadcast não é autenticado criptograficamente pelo payload. `voiceRoomReceive` e `screenShareReceive` usam campos `from`, `roomId` e `to` fornecidos pelo próprio evento. Isso é CODE INSPECTION, não exploração reproduzida. A configuração externa `Allow public access` não estava disponível para inspeção, então não afirmo que um terceiro tenha conseguido publicar eventos.

## 8. Realtime, RLS, grants, SECURITY DEFINER e Storage

Consulta SQL read-only em produção:

- `realtime.messages`: 106 broadcasts, todos `private=false`, extension `broadcast`, no tópico `upstatus-live-...`; registros entre 10/11 e 13/11.
- `pg_policies`: zero policies em `public`, `storage` e `realtime`.
- Security Advisor: dez tabelas públicas com RLS habilitado sem policy; três funções SECURITY DEFINER executáveis por anon e as mesmas três por authenticated.
- Grants em `public`, `storage` e `realtime`: 83 entradas para anon e 83 para authenticated; nove grants TRUNCATE para cada papel (18 no total).
- Três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, com EXECUTE para anon/authenticated/service_role. São funções trigger; não executei RPC nem demonstrei exploração.
- Buckets `chat-images` e `profile-images` estão `public=true`, limite 20 MiB cada, e há 188 objetos em Storage. Não existem policies próprias em `storage.objects`.

RLS habilitado sem policy não substitui uma política de autorização explícita. Grants amplos continuam relevantes mesmo quando a aplicação normalmente acessa o banco por Edge Function/service role.

## 9. AUTH-03 e issues

Consulta a `information_schema` em produção não encontrou colunas `setup_token_*`, tabela/RPC de emissão/consumo de convite ou rotinas de rate limit com os nomes esperados pela candidata #161. A #161 contém migrations staged para `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`, mas não estão aplicadas em produção. AUTH-03 permanece bloqueado.

**Issue #78:** OPEN; os oito critérios físicos permanecem sem aceite. Os comentários documentam que o teste real Tampermonkey com perda/retorno de internet, reentrada sem F5, microfone/tela e interoperabilidade Normal ↔ Team Lite ainda não foi concluído.

**Issue #79:** corpo contém 16 itens marcados e 19 pendentes. O comentário dedicado QA foi atualizado; o comentário da Engenharia foi preservado.

## 10. Gates reavaliados nesta execução

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | BLOCKED | 106 broadcasts privados=false, zero policies, tópico incompatível e transporte autenticado ausente no runtime instalado |
| TEST-ISOLATION | BLOCKED | laboratório INACTIVE; somente produção e laboratório aparecem na organização |
| AUTH-03 | BLOCKED | colunas/RPCs esperadas ausentes em produção; candidata #161 ainda depende das migrations |
| ACL-STORAGE | BLOCKED | zero policies, grants amplos, 18 TRUNCATE, funções SECURITY DEFINER e dois buckets públicos |
| RECONNECT | PENDING | Issue #78 sem os oito testes físicos |
| HUMAN-REVIEW | PENDING | zero reviews submetidas nas PRs verificadas; sem autorização explícita |

MIGRATION-PROVENANCE não foi alterado nesta rodada: a lista de migrations e o estado da branch gerenciada foram rechecados, mas a comparação dos quatro SQLs recuperados não foi repetida.

## 11. Recomendação

**NOT READY — não fazer merge, deploy, release ou publicação de Normal/Team Lite.**

Prioridades:
1. Administrador da organização deve revisar Usage/Billing e restaurar um laboratório ativo ou provisionar Full-Product TEST independente.
2. Investigar a causa específica dos 402 de produção.
3. Coordenar versão, API, workflow e migrations AUTH-03; 3.4.8 não passa pelo guard atual da master que exige 3.4.7.
4. Implementar sinalização server-mediated autenticada por membership e remover o fallback público sensível.
5. Corrigir grants, default ACLs, RLS e Storage com plano revisado.
6. Criar deploy Team Lite próprio, com slug `upstatus-team-lite`, projeto correto, SHA exato e CLI fixada.
7. Executar os oito testes físicos da #78 e obter aprovação humana.

## 12. Limitações e segurança da execução

Nenhum teste novo foi executado. Os workflows existentes foram inspecionados, não repetidos. Não houve exploração, teste de navegador, Tampermonkey, microfone ou captura de tela. Não houve SQL write, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL, limpeza de fixture ou publicação de userscript.

A única alteração desta execução é este relatório documental novo na branch QA dedicada e a atualização do comentário QA existente na Issue #79. Nenhum comentário da Engenharia foi alterado.
