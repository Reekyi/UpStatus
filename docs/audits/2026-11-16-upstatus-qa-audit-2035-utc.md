# Auditoria independente UpStatus — 2026-11-16 20:35 UTC

**Veredito: NOT READY.** Esta rodada foi read-only em GitHub e Supabase, exceto pela criação deste relatório na branch QA e pela atualização do comentário QA dedicado na Issue #79. Nenhum teste foi executado manualmente pela auditoria.

## 1. Escopo e heads conferidos

- Branch QA `qa/release-readiness-2026-11-04-master`: HEAD antes deste relatório `b019dcea917490691afea8b84ab53dc9c2104fc8`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`; `develop`: `6b33e1...`; `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA está um commit atrás de master. O commit master-only observado é documental; não fiz rebase nem incorporação automática.
- PR #74: `dcaf6a072546eda0089e0cee4018c3047011f600`; 887 commits à frente e 1 atrás de master.
- PR #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; 59 commits à frente de team-lite-official.
- PR #76: `00a578e9174e08238a1289a35feb02d171625421`; 389 commits à frente de team-lite-official e 330 à frente da #75.
- PR #82: `b019dcea917490691afea8b84ab53dc9c2104fc8`; 378 commits à frente e 1 atrás de master. O diff atual tem 214 arquivos, todos Markdown. É documental, mas herda o Validate vermelho de master.
- PRs #74, #75, #76 e #82 seguem abertas/Draft; a consulta de reviews não retornou aprovação humana.

### Documento de prontidão

Li `docs/RELEASE_READINESS.md` na branch QA. Ele tem 8.423 linhas e o último checkpoint registrado é de **2026-11-15 06:30 UTC**. É a baseline anterior, não um retrato atualizado desta execução. Mantive o histórico e registrei a revalidação neste arquivo separado.

## 2. CI e testes existentes

### PR #74 — Normal

- [Validate #43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): **SUCCESS** no HEAD exato `dcaf6a0`.
- [Signaling Smoke #43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): **SUCCESS** no mesmo HEAD.
- O log registra **136/136 verificações autenticadas** aprovadas, negociação WebRTC de chamada, voz e tela com entrega de áudio/vídeo remoto, teardown, mesh de três participantes, rate limit distribuído (90 aceitos e o seguinte rejeitado com HTTP 429), concorrência de recibos de leitura e consumo atômico de convite de primeiro acesso.
- Limitação: `Syntax-check setup invite rate-limit harness when present` e `Verify distributed setup-invite issuance rate limit` foram **SKIPPED**. O handler de convite Normal desta candidata não chama a RPC de rate limit usada pela candidata Team Lite. Não considerar AUTH-03 completo no Normal.

### PR #75 — Team Lite baseline

- [Candidate Checks #41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): **SUCCESS**, mas o job executou essencialmente verificação de scripts/metadata, sintaxe dos portais e cenários do updater.
- É PASS histórico, não substitui a candidata atual #76 nem demonstra integração de voz/tela no backend atual.

### PR #76 — Team Lite candidata

- [Candidate Checks #43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): **FAILURE**.
- O job passou pelos guards de build isolado, adapter de sinalização, contrato de enrollment, recuperação de voice-room, recuperação de screen-share e **11/11 checks** do mapeador HTTP isolado.
- A primeira chamada real ao endpoint isolado `/health` recebeu HTTP 402 em vez de 200. As outras 15 verificações não autenticadas também receberam 402 em vez dos códigos esperados. Resultado: **0/16** verificações não autenticadas passaram.
- O corpo retornado pelo laboratório identifica `exceed_edge_functions_invocations_quota` e informa que o proprietário deve atualizar o plano ou remover spend cap para restaurar o serviço.
- Playwright, integração autenticada, concorrência, recibos e rate limit de convites foram **SKIPPED** após a falha.
- O job separado de contratos offline de upload assinado passou. Isso valida contratos/mocks, não upload real ao Storage.

### PR #82 — QA

- [Validate #43941659182](https://github.com/Reekyi/UpStatus/actions/runs/43941659182): **FAILURE** em `production updateURL mismatch`.
- A causa foi confirmada por inspeção: o `scripts/build.mjs` de master monta o updateURL a partir do endpoint beta10, enquanto `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. O log falha na asserção do validador, não no conteúdo Markdown.
- O PR #82 contém somente arquivos Markdown no diff atual. O commit documental não corrige nem causa a divergência de build.

## 3. Build, distribuição e workflows

### Normal

No HEAD da #74, `scripts/build.mjs`:
- Define o tópico novo `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Mantém `CLOUD_SERVER` apontando para `upstatus-screen-share-3-1-1-beta10`.
- Usa `release.json.scriptUrl` para o updateURL e valida que ele corresponda à distribuição `/upstatus/upstatus.user.js`.

O workflow `.github/workflows/deploy-production.yml` da candidata:
- É disparado manualmente.
- Restringe `release.json.version` a `3.4.7`.
- Usa Supabase CLI `latest`.
- Executa `supabase functions deploy upstatus`.
- O YAML não contém verificação explícita de branch master, SHA aprovado ou igualdade do project ref com o projeto de produção. Proteções externas do GitHub Environment não foram inspecionadas.
- Publica somente o slug `upstatus`, embora o userscript 3.4.7 servido por essa função continue apontando suas chamadas de API para beta10. Logo, publicar apenas `upstatus` não substitui o runtime que recebe chat/status/status remoto.

O build de master ainda gera o updateURL pelo endpoint beta10; o validador de master exige o caminho `/upstatus`. Essa é a causa direta do Validate vermelho em #82.

Há também uma tensão de versão: o artefato raiz `UpStatus.user.js` está em 3.4.7; o `--sync-root-artifact` da candidata recusa sincronizar conteúdo diferente sem versão estritamente maior, enquanto o workflow de produção da candidata exige exatamente 3.4.7. Não executei o build nem alterei o artefato.

### Team Lite

O workflow oficial em `team-lite-official/.github/workflows/deploy-production.yml`:
- É manual.
- Usa CLI `latest`.
- Não verifica branch/SHA/project ref no próprio YAML.
- Executa `supabase functions deploy upstatus`, que é o slug Normal, e não `upstatus-team-lite`.

**Não despachar o workflow oficial Team Lite.**

O workflow de TEST candidato da #76 é mais cuidadoso: fixa develop, exige `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto isolado de sinalização, confere o formato do ref e fixa CLI 2.122.1. Porém não há projeto Full-Product TEST disponível para satisfazer essa configuração.

## 4. Compatibilidade Normal / Team Lite e Realtime

### Runtimes implantados

Inventário read-only de produção:
- 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false`.
- `upstatus`: Edge v480, versão interna 3.4.7.
- `upstatus-team-lite`: Edge v15, versão interna 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: Edge v6, versão interna 3.1.1-beta8.
- `upstatus-test`: Edge v281, versão interna 3.3.28.

O `verify_jwt=false` não prova sozinho que todas as rotas aceitam anônimos: os runtimes usam token customizado em rotas próprias. Exige revisão de autenticação/autorização por rota.

O userscript Normal 3.4.7 servido por `upstatus` aponta a API para beta10 e assina `upstatus-screen-share-live-3-1-1-beta10`. O bundle servido pela função beta10 declara versão 3.1.1-beta8 e contém script beta8, inclusive API/tópico beta8. O slug beta10 e seu artefato interno estão desalinhados.

O Team Lite 3.4.30 usa a API `upstatus-team-lite`, mas assina o tópico beta10 legado. Os triggers do banco publicam no tópico `upstatus-live-6f5e7b31-...`. Assim, os clientes instalados não estão alinhados ao tópico publicado pelo banco.

### Candidatas

- #74 e #76 mudam o tópico de cliente para `upstatus-live-6f5e7b31-...`, que coincide com os triggers.
- Ambas mantêm o transporte autenticado server-mediated **default-off**. No template Normal, `GM_getValue(..., false) === true`; no bundle Team Lite candidato, o mesmo default false aparece.
- O canal Realtime continua criado sem `private:true` e sem `realtime.setAuth()`. O adapter HTTP custom-token existe no código candidato, mas não está ativado por padrão nem implantado em produção.
- Com a flag desligada, o fluxo público de sinalização permanece ativo. Trocar o tópico não torna o canal privado.

### Snapshot Realtime de produção

- `realtime.messages`: RLS habilitado, zero policies.
- `anon` e `authenticated` têm privilégios efetivos SELECT/INSERT nessa tabela.
- Foram observadas 106 linhas retidas, todas `private=false`: 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`.
- A linha mais recente retida é de 2026-11-13 20:52:22 UTC; não há linha mais recente nesse snapshot.
- `upstatus_broadcast_messages()` usa `to_jsonb(OLD/NEW)` e publica o registro completo no tópico público. As outras funções publicam status e metadados de comandos/resultados.
- Não publiquei broadcasts, não injetei ofertas/ICE e não reproduzi acesso externo ao canal.

## 5. RLS, grants, SECURITY DEFINER e Storage

Consultas SELECT-only aos catálogos de produção confirmaram:

- Dez tabelas públicas com RLS habilitado e zero policies.
- Nove dessas tabelas concedem a `anon` e `authenticated` SELECT, INSERT, UPDATE, DELETE e TRUNCATE efetivos. A tabela `upstatus_visual_config` não apresenta esses grants.
- TRUNCATE não é protegido por RLS; a permissão efetiva é um risco de integridade grave. Nenhuma operação destrutiva foi tentada.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, pertencem a postgres, usam `search_path=public`, retornam `trigger` e têm EXECUTE efetivo para anon/authenticated/service_role. Como retornam trigger, não tratei isso como prova de RPC diretamente invocável; os grants são desnecessários e o risco concreto inclui o código SECURITY DEFINER e os broadcasts públicos.
- O catálogo tem default ACLs amplas para owners postgres e supabase_admin em public e outros schemas, concedendo privilégios de tabela/função/sequence a papéis de cliente. Novos objetos podem herdar permissões excessivas.
- Security Advisor de produção: 6 WARN e 10 INFO.

Storage:
- `chat-images`: público, limite 20 MiB, 168 objetos.
- `profile-images`: público, limite 20 MiB, 20 objetos.
- Zero policies próprias em `storage.objects`.
- Não li conteúdo de objetos nem tentei acessá-los.

## 6. AUTH-03 e migrations

Consulta ao catálogo de produção:
- 5 linhas em `public.users`.
- Zero colunas `setup_token_*`.
- `upstatus_setup_invites` ausente.
- RPC `consume_upstatus_setup_invite` ausente.
- RPC `consume_upstatus_setup_invite_rate_limit` ausente.

Os runtimes implantados Normal e Team Lite ainda contêm o setup legado sem convite e fallback de papel administrativo baseado em nomes fixos.

As candidatas #74/#76 passam a exigir token no primeiro setup. A candidata Team Lite chama rate limit de convite (5 por 15 minutos); a candidata Normal não chama essa RPC e seu teste de emissão de rate limit foi skipped. Há paridade incompleta.

Migrations:
- Produção: 7.
- Laboratório: 38.
- PR #176 permanece aberta/Draft. Sua descrição informa recuperação dos quatro SQLs a partir do ledger de produção; isso é recuperação do texto executado, não prova de bytes originais/comentários.
- A PR #176 ainda não concluiu o preflight de um Full-Product TEST isolado. Não houve migration aplicada nesta execução.
- O projeto de laboratório tem duas Edge Functions (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3) e nenhuma branch Supabase. Não é Full-Product TEST.
- O Security Advisor do laboratório retornou 18 INFO de RLS habilitado sem policy; não substitui a validação de segurança da produção.

## 7. Disponibilidade: HTTP 402

Janela consultada em produção: **2026-11-16 14:35:18–20:35:13 UTC**, seis horas.

| Rota beta10 | Respostas 402 |
|---|---:|
| `/api/chat` | 25.705 |
| `/api/status` | 11.195 |
| `/api/remote-status` | 11.187 |
| `/api/me` | 12 |
| `/api/members` | 12 |
| `/api/account` | 2 |
| **Total** | **48.113** |

Último 402 observado: 20:35:13 UTC. O projeto de produção está `ACTIVE_HEALTHY`, mas isso não significa que as Edge Functions estejam respondendo normalmente. Os logs de produção mostram apenas `GET | 402 | URL`, execution time zero no registro amostrado e response body vazio; não revelam a causa. Não atribuir o 402 de produção à quota sem evidência direta.

No laboratório, o CI da #76 expôs a mensagem exata `exceed_edge_functions_invocations_quota`. A causa está comprovada para o laboratório, não para produção.

## 8. Issues, aceitação manual e gates

- Issue #78 permanece OPEN, com 0/8 critérios físicos aprovados.
- Não houve teste manual no Tampermonkey/Sale Smartly, queda real de internet, reconexão sem F5, microfone/tela com permissões reais ou interoperabilidade instalada nesta execução.
- Issue #79 recebeu atualização no comentário dedicado `<!-- UPCONTROL:QA -->`; o comentário da Engenharia foi preservado.

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, sem policies; transporte seguro default-off e ausente em produção |
| TEST-ISOLATION | blocked | Só existe laboratório de sinalização, não Full-Product TEST |
| MIGRATION-PROVENANCE | in_progress | SQLs recuperados pelo ledger na PR #176, mas PR Draft e sem preflight Full-Product TEST |
| AUTH-03 | blocked | Produção sem convites/RPCs/colunas; runtime legado |
| ACL-STORAGE | blocked | Grants amplos, default ACLs, funções SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | pending | Sem confirmação de testes físicos de Ricardo |
| HUMAN-REVIEW | pending | Sem reviews humanas e sem autorização de release |

## 9. Próximos passos

1. O proprietário do projeto de laboratório deve verificar Usage/Billing e spend cap para permitir novos testes integrados.
2. Diagnosticar separadamente a origem dos 402 de produção.
3. Consolidar uma candidata Normal que alinhe distribuição, API, versão, updater, convite e rate limit.
4. Corrigir o workflow Team Lite para publicar `upstatus-team-lite`, com projeto/SHA/branch verificados e CLI pinada.
5. Tornar o transporte autenticado default seguro em Normal e Team Lite, remover listeners públicos sensíveis e validar membership/replay/expiry/rate limit no servidor.
6. Corrigir grants, default ACLs, funções SECURITY DEFINER e política de privacidade do Storage com revisão e plano de rollback.
7. Recuperar/provar proveniência das migrations, provisionar Full-Product TEST e executar preflight sem tocar produção.
8. Após CI completo, executar os oito critérios físicos da #78 e obter revisão humana.

## 10. Limites e alterações realizadas

- Não executei testes nesta auditoria; apenas inspecionei resultados de CI existentes.
- Todas as consultas SQL foram SELECT-only.
- Não houve escrita SQL, alteração de produção, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva.
- A única escrita no repositório foi este relatório novo na branch QA. O comentário QA dedicado da Issue #79 foi atualizado; nenhum comentário da Engenharia foi alterado.
- As automações de Engenharia e QA não foram alteradas.

**Conclusão: NÃO LIBERAR.**
