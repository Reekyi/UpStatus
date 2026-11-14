# UpStatus — auditoria independente QA
**Data:** 2026-11-11 09:35 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`

## Veredito

**NOT READY.** Esta execução foi de inspeção read-only. Não houve teste manual, execução de scripts locais, novo workflow, deploy, merge, migration, publicação de userscript ou alteração de configuração.

Achado novo de compatibilidade: o HEAD Normal #74 consome convite de primeiro acesso, mas não contém o rate limit de emissão presente no HEAD Team Lite #76. O teste correspondente em #74 foi explicitamente `skipped`; em #76 passou no projeto isolado.

## 1. Integridade documental e heads

O documento `docs/RELEASE_READINESS.md` foi recuperado integralmente pela URL raw na branch QA. Seu último bloco de auditoria é **08/11/2026 15:30 BRT / 18:30 UTC**. Portanto, está desatualizado em relação aos candidatos e checkpoints de 09–11/11. O arquivo principal não foi alterado; este relatório é um arquivo novo.

Heads consultados diretamente:

| Referência | HEAD | Base | Relação / estado |
|---|---|---|---|
| `master` | `9d40461` | — | HEAD atual |
| `team-lite-official` | `9065bc1` | — | HEAD atual |
| QA / #82 | `77f5634a0000c17b446f89969e59ba93cb4a4981` | master `a9288cc` | 216 ahead / 1 behind |
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master `a9288cc` | 883 ahead / 1 behind; 90 arquivos |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official `9065bc1` | 59 ahead / 0 behind; 10 arquivos |
| #76 Team Lite | `4edfbf25476c7c751741b2e14c2c88fdc554f618` | team-lite-official `9065bc1` | 380 ahead / 0 behind; 57 arquivos |
| #143 Normal dispatcher | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` | `fix/normal-beta10-api-parity` | 13 ahead / 1 behind da base |
| #128 Team Lite review provenance | `ad2ceb5f04989e5a84047723431f08abf52ee7cf` | dispatcher Team Lite | Draft |
| #129 Team Lite legacy guard | `f48a2d9edf5d46aaca46d79f4b26c6fd8305c51c` | team-lite-official | Draft |

As PRs examinadas permanecem abertas, Draft e não mescladas. A consulta de reviews retornou zero reviews em #74, #75, #76, #82, #143, #128 e #129.

A API de rulesets retornou lista vazia. As consultas de branch protection para master e QA retornaram HTTP 401; portanto, **proteção de branch não verificada**. Não concluo que as branches estejam desprotegidas.

## 2. CI e contratos

### #74 Normal — PASS com uma lacuna

- [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336): SUCCESS no HEAD exato.
- [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411): SUCCESS no HEAD exato.
- Smoke executou endpoint não autenticado, integração autenticada/browser, rate limit de signaling, recibos de leitura e consumo atômico de convite.
- **O passo “Verify distributed setup-invite issuance rate limit” foi SKIPPED.** O script `scripts/test-setup-invite-rate-limit.mjs` não existe no HEAD #74 consultado.
- Inspeção do template Normal #74 encontrou `consume_upstatus_setup_invite`, mas não encontrou chamada a `consume_upstatus_setup_invite_rate_limit`.

Classificação: CI PASS para o escopo executado; rate limit de emissão de convite Normal não verificado/não presente nesse HEAD.

### #75 e #76 Team Lite

- #75: [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico da baseline. Não substitui #76.
- #76: [Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) SUCCESS no HEAD exato `4edfbf25476c7c751741b2e14c2c88fdc554f618`.
- Log confirma **110/110 checks autenticados**, WebRTC de chamada/voz/tela com entrega de tracks, malha de três participantes, teardown, rate limit distribuído (90 aceitos e 1 HTTP 429), recibos atômicos, consumo único de convite, rate limit de emissão de convite, guard de layout de migrations, contrato do workflow e limpeza de fixtures.
- A rota Team Lite chama `consume_upstatus_setup_invite_rate_limit`; falha do limitador retorna 503 (fail closed), limite retorna 429. O teste de concorrência, isolamento de bucket e limpeza passou.
- O workflow candidato contém push para `team-lite-official` sem filtro de paths e um filtro de paths para PR. Porém o run 42993916169 foi evento **pull_request**, não push real na branch oficial. A cadeia de checks ainda não foi comprovada por um push real em team-lite-official.

### #82 QA

[Validate 42989222502](https://github.com/Reekyi/UpStatus/actions/runs/42989222502) falhou no HEAD exato `77f5634a0000c17b446f89969e59ba93cb4a4981`.

Log: build PROD/TEST 3.4.7 seguido de `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`. Não relaxei o validator e não iniciei rerun.

### #143, #128 e #129 — guards de publicação

- #143: [offline guard 42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) e [Validate 42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) SUCCESS no HEAD atual `34cbf587`; job deploy foi SKIPPED. O candidato publica beta10 antes de `upstatus`, fixa Supabase CLI 2.122.1 e exige dispatch manual, SHA, checks e aprovações. Continua Draft/empilhado, não ativo em master.
- #128: [Review Provenance 42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899) SUCCESS no HEAD atual; é contrato offline de aprovação/revisão, não aprovação humana de release.
- #129: [Legacy Deploy Safety Guard 42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) SUCCESS no HEAD atual; não desativa o workflow oficial até ser integrado.
- Nenhum desses resultados autoriza deploy. Todos os jobs de publicação observados foram SKIPPED ou não foram executados.

## 3. Compatibilidade Normal / Team Lite e AUTH-03

A paridade ainda não está fechada:

- Normal #74 tem consumo de convite, mas não contém o rate limit de emissão nem o teste no HEAD examinado.
- Team Lite #76 já possui limite distribuído de emissão, retorno 429 e fail-closed 503, com teste de concorrência no laboratório.
- A mudança de rate limit é compartilhada por migrations candidatas, mas a implementação Normal equivalente está em uma linha separada (#130), não no HEAD #74 auditado.

Produção, por consulta SELECT/catálogo:
- zero colunas `setup_token_*` em `public.users`;
- zero funções `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`;
- tabela `upstatus_setup_invite_rate_limits` ausente;
- handlers implantados ainda roteiam `POST /api/setup` para o fluxo antigo `login(req,true)`.

O laboratório tem as migrations e funções candidatas, mas isso não é prova de implantação em produção.

## 4. Supabase — fotografia read-only

### Migrations e Edge Functions

| Item | Produção | Laboratório |
|---|---:|---:|
| Migrations no ledger | 7 | 39 |
| Edge Functions | 38 | 2 |
| Estado da branch gerenciada | `main=MIGRATIONS_FAILED` | sem branch gerenciada |
| Realtime rows | 67 | 0 |
| Buckets Storage | 2 | 0 |

Produção está `ACTIVE_HEALTHY`, mas a branch gerenciada `main` continua `MIGRATIONS_FAILED`. Quatro fontes SQL aplicadas em produção continuam ausentes de master: visual config, nome de documento, MIME de documentos e limite de upload. Não reconstruí SQL por inferência.

Todas as 38 Edge Functions de produção reportam `verify_jwt=false` no metadata. Isso **não prova ausência de autenticação**: os handlers principais `upstatus` v480 e `upstatus-team-lite` v15 usam `x-upstatus-token`, lookup de sessão e cache de 30 segundos por isolate. Essa amostra não substitui inventário de autenticação rota a rota das 38 funções. Não existe `upstatus-signal` em produção; o laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

### Realtime

Consulta agregada encontrou 67 registros em `realtime.messages`, todos:
- `private=false`;
- tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- última ocorrência observada em 2026-11-10 21:00:28 UTC.

A tabela `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado e zero policies. A inspeção anterior dos bundles servidos (cujos SHA de runtime continuam iguais) identificou clientes Normal/Team Lite assinando o tópico beta10 `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers. Os três broadcasts continuam SECURITY DEFINER, `search_path=public`, retorno `trigger` e EXECUTE para anon/authenticated. O Advisor sinaliza os grants; não há demonstração de RPC direta para funções que retornam trigger. O risco concreto permanece o broadcast público e o payload de mensagens completo identificado na inspeção de código anterior.

### RLS, grants e Storage

- Produção: 10 tabelas públicas com RLS e sem policies.
- Nove tabelas concedem a anon e authenticated oito privilégios cada: DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Total: 144 combinações de privilégio por tabela/papel.
- Default ACL: 120 privilégios para papéis clientes.
- Storage: `chat-images` e `profile-images` públicos, 20 MiB cada; zero policies próprias em `storage.objects`.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies.
- Laboratório: 18 tabelas RLS sem policies, zero grants diretos para clientes nas tabelas públicas auditadas, 96 Default ACL, zero buckets e zero linhas Realtime; Advisor sem WARN e 18 INFO de RLS sem policies.

RLS sem policies não protege TRUNCATE. Nenhuma operação destrutiva foi tentada.

## 5. Chat e voz

- Produção tem 279 mensagens; cinco são documentos e **as cinco têm `file_name` NULL**.
- A coluna `file_name` existe. O template Normal #74 já seleciona, grava e devolve esse campo, mas os runtimes implantados não foram atualizados.
- Os handlers implantados ainda usam a rota de setup antiga e a limpeza global do chat por nome fixo; não trate o helper de papel administrativo do candidato como implantação.
- No laboratório, `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409; `VOICE_ATTEMPT_ALREADY_ACTIVE` não tem mapeamento específico e pode cair no fallback 500. Inspeção estática; não foi feita requisição HTTP real.

## 6. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios marcados. Não houve queda física de internet, retorno sem F5, reentrada em sala, teste de dispositivo ou interoperabilidade instalada nesta execução.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo principal registra 16 itens marcados e 19 pendentes; comentário mais recente da Engenharia é de 11/11 09:27 UTC. O comentário QA dedicado foi atualizado separadamente.

## 7. Gates e próximos passos

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcast público e divergência de tópico/autorização |
| TEST-ISOLATION | IN_PROGRESS | Laboratório isolado existe e os testes #76 passaram; ainda não é TEST full-product endurecido |
| MIGRATION-PROVENANCE | BLOCKED | Quatro fontes SQL históricas ausentes e branch main em MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Produção sem tokens/RPC/rate-limit; paridade Normal/Team Lite incompleta |
| ACL-STORAGE | BLOCKED | Grants, MAINTAIN/TRUNCATE, Default ACL e buckets públicos |
| RECONNECT | PENDING | 0/8 critérios físicos; sem confirmação de Ricardo |
| HUMAN-REVIEW | PENDING | PRs Draft, sem reviews e sem autorização explícita |

Próximas ações técnicas:
1. Corrigir Realtime com identidade/autorização compatível com o token UpStatus e remover broadcasts públicos de payload sensível.
2. Recuperar as quatro fontes SQL originais e diagnosticar `MIGRATIONS_FAILED`; não sintetizar migrations.
3. Alinhar rate limit de convites Normal/Team Lite e só considerar AUTH-03 fechado após validação HTTP e banco em ambiente apropriado.
4. Revisar grants, Default ACL, SECURITY DEFINER e Storage com plano de rollout revisado.
5. Corrigir o workflow Team Lite oficial: hoje aponta para `upstatus`, não `upstatus-team-lite`, e usa CLI `latest`.
6. Manter o dispatcher Normal #143 Draft até review humana, versão nova e preflight válido.
7. Executar os oito critérios físicos da #78 e obter aprovação humana antes de qualquer release.

## 8. Limites e segurança desta execução

- GitHub e Supabase foram usados para leitura/inspeção; a única escrita foi este novo relatório e a atualização do comentário QA dedicado na Issue #79.
- Todas as consultas SQL foram SELECT-only.
- Nenhum workflow foi iniciado ou repetido pela auditoria; apenas execuções existentes foram consultadas.
- Nenhum teste manual, upload real, chamada HTTP real, teste Tampermonkey ou teste físico foi realizado.
- Nenhuma produção foi alterada; sem migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva.

**Recomendação final: NOT READY.**
