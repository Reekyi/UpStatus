# UpStatus — auditoria independente de qualidade
**Data/hora:** 07/11/2026 14:30 BRT (17:30 UTC)  
**Repositório:** \`Reekyi/UpStatus\`  
**Produção Supabase:** \`dlfvkawaiqduhlazsszm\`  
**Laboratório isolado:** \`bfpjtfqlnypisxljoxkb\`  
**Branch documental:** \`qa/release-readiness-2026-11-04-master\`

## Método e vocabulário

Primeiro foi lido \`docs/RELEASE_READINESS.md\` na branch QA. Seu blob atual é \`1ae48aab678a06b4ff75d061d2355a6449cbe1e0\`. O documento foi preservado nesta rodada.

- **AUTOMATED PASS:** workflow concluído com sucesso no HEAD exato informado.
- **CODE INSPECTION:** leitura de código, configuração ou catálogo; não equivale a teste runtime.
- **MANUAL PENDING:** depende de navegador/dispositivo/aceite humano.
- **BLOCKED:** dependência ou risco confirmado impede o gate.
- **NOT VERIFIED:** evidência não existe ou pertence apenas a outro ambiente.

Todas as consultas Supabase desta rodada foram SELECT-only. Foram consultados heads, diffs, reviews, arquivos, runs e logs existentes do GitHub. Nenhum workflow foi iniciado ou repetido pela auditoria.

## 1. GitHub — heads atuais

Snapshot consultado diretamente no GitHub às 14:30 BRT:

| PR | Base | HEAD completo | Estado | Commits / arquivos |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | \`27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02\` | Open / Draft | 843 / 82 |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` | \`7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309\` | Open / Draft | 59 / 10 |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` | \`2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7\` | Open / Draft | 313 / 42 |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | \`6b5bf481ac68602f3ff45e6af225bb92d6eabff5\` | Open / Draft | 102 / 15 |
| [#84 isolamento TEST](https://github.com/Reekyi/UpStatus/pull/84) | develop \`6b33e1e26ad105143f00372ae6d0f2fa52df60d6\` | \`21341f331270e142bdf7584c1cdf16e6011e41b3\` | Open / Draft | 30 / 13 |
| [#85 updater/upload/admin](https://github.com/Reekyi/UpStatus/pull/85) | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | \`17554523ef51bafd503e74b3f1271d55f43a6eda\` | Open / Draft | 21 / 7 |

Todas as seis PRs permanecem abertas, Draft e sem merge. As consultas de reviews retornaram zero submissões de review nas seis PRs. #76 está 254 commits à frente do HEAD histórico #75; #75 permanece apenas baseline histórico.

## 2. CI — evidência nos HEADs exatos

### Normal #74 — AUTOMATED PASS

- [Validate 42389921918](https://github.com/Reekyi/UpStatus/actions/runs/42389921918): SUCCESS no HEAD \`27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02\`.
- [Signaling Smoke 42389921913](https://github.com/Reekyi/UpStatus/actions/runs/42389921913): SUCCESS no mesmo HEAD.
- Logs do Smoke: 19/19 checks não autenticados e 129/129 checks autenticados.
- Chromium/integração isolada aprovou negociação WebRTC e entrega de áudio remoto para call/voice, vídeo remoto de screen-share, teardown, convite/grupo autenticado e mesh de três participantes.
- Recuperação de voice-room attempt: cancel-before-open/tombstone, open idempotente, aliases Normal/Team Lite, cancelamento do membro correto e serialização de corrida open/cancel sem membership órfã.
- Rate limit distribuído: 90 aceitas e uma HTTP 429 com \`Retry-After: 60s\`.
- Concorrência de read receipts e consumo atômico de setup invite aprovados.
- Logs registram cleanup de usuários, sessões, salas, memberships e eventos temporários. O snapshot SELECT independente abaixo também confirmou zero fixtures no laboratório.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302): SUCCESS no HEAD \`2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7\`.
- 16/16 checks não autenticados e 103/103 autenticados.
- WebRTC call/voice/screen, mesh de três participantes, rate limit 90+1/429/Retry-After, read receipts, setup invite, voice-room leave/retry, pagehide/reload recovery e fail-closed quando armazenamento durável falha.
- Versão candidata 3.4.31; sintaxe dos portais Lucca/Ycaro, isolamento de sessão e cenários de updater aprovados.
- Uma falha intermediária em HEAD anterior era uma asserção estática que lia a cópia Normal antiga dentro do branch Team Lite. Foi corrigida para verificar o template efetivamente utilizado pelo Team Lite. O HEAD atual passou; não reutilizar a falha intermediária como status atual.

### Baseline #75 — PASS histórico

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS no HEAD inalterado \`7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309\`.
- É evidência histórica do baseline, não substitui a #76 atual.

### Isolamento TEST #84 — AUTOMATED PASS, sem deploy

- [Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361): SUCCESS no HEAD \`21341f331270e142bdf7584c1cdf16e6011e41b3\`.
- Passaram build-target guard, metadata guard, teste de escopo do token/workflow, signed-upload client contract e Validate.
- O workflow candidato é manual-only, exige \`vars.SUPABASE_TEST_PROJECT_ID\`, fixa checkout em \`github.sha\`, confere \`GITHUB_REF\` e igualdade do SHA, rejeita produção/laboratório, verifica organização/status/database host e implanta somente \`upstatus-test\`.
- O run foi Validate, não \`workflow_dispatch\`. Não houve chamada real à Management API nem deploy.

### Updater/security #85 — AUTOMATED PASS com mocks

- [Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749): SUCCESS no HEAD \`17554523ef51bafd503e74b3f1271d55f43a6eda\`.
- Build PROD/TEST 3.4.7; signed-upload client regression, signed-upload server Node VM com mocks de Storage/DB e chat regression passaram.
- Cobertura mockada inclui rota/bucket, MIME, tamanho, HTTPS, origem, path, token, URL pública, avatar e fallback legado.
- Não houve upload real no Supabase.

### QA #82 — VALIDATE FAIL herdado de master

- [Validate 42392158080](https://github.com/Reekyi/UpStatus/actions/runs/42392158080): FAILURE no HEAD \`6b5bf481ac68602f3ff45e6af225bb92d6eabff5\`.
- Erro exato: \`VALIDATION FAILED: production updateURL mismatch\`.
- A PR #85 corrige o contrato do builder/validador em branch separada, mas ainda está Draft e não foi integrada em master. A falha da #82 é do baseline de validação atual; não é evidência de defeito no conteúdo Markdown.
- Não enfraquecer o validador para obter verde.

## 3. Deploy TEST — bloqueador operacional

### Workflow ativo em develop

Arquivo: [.github/workflows/deploy-test.yml em develop](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml)  
Blob SHA: \`d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839\`  
HEAD/base de develop observado via PR #84: \`6b33e1e26ad105143f00372ae6d0f2fa52df60d6\`.

Inspeção do arquivo confirma:
- trigger \`push\` em develop e \`workflow_dispatch\`;
- usa \`secrets.SUPABASE_PROJECT_ID\` compartilhado;
- usa Supabase CLI \`latest\`;
- implanta \`upstatus-test\`;
- não valida identidade/organização/status/host do projeto de destino;
- não fixa o checkout ao SHA do evento.

O valor do secret não foi lido. Portanto, o destino efetivo não foi determinado; o achado é que o workflow não garante isolamento.

A #84 corrige esse desenho no branch Draft, mas não protege develop até integração revisada. Não executar o workflow atual enquanto a proteção não estiver integrada e o ambiente TEST correto não existir.

## 4. Ambiente TEST e compatibilidade dos produtos

A consulta de projetos Supabase retornou somente:
- produção \`dlfvkawaiqduhlazsszm\`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002;
- laboratório \`bfpjtfqlnypisxljoxkb\`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto TEST full-product.

O laboratório tem duas Edge Functions: \`upstatus-signal-test\` v32 e \`upstatus-signal-e2e-once\` v3. É laboratório de signaling/auth/RPC, não backend completo dos dois produtos.

Inspeção de \`scripts/build.mjs\` no branch Team Lite:
- gera \`upstatus-team-lite\` por \`renderTeamLiteFunction()\`;
- gera \`upstatus.user.js\` e \`upstatus-test.user.js\`;
- não gera \`upstatus-team-lite-test\`;
- o workflow candidato #84 implanta apenas \`upstatus-test\`.

Assim, os testes Team Lite aprovam o cliente e a integração com o signaling isolado, mas não comprovam um runtime Edge Function Team Lite completo em TEST.

Paridade de senha nos candidatos, por inspeção dos templates e CI individual:
- nova senha: mínimo 6 caracteres em Normal e Team Lite;
- login legado: mínimo 4 caracteres nos dois.
A comparação automatizada direta entre branches ainda não foi encontrada.

## 5. Produção Supabase — inventário atual

### Projetos, migrations e Edge Functions

Produção:
- 7 migrations; última \`20261027155438\`.
- 38 Edge Functions ACTIVE; todas reportam \`verify_jwt=false\`.
- 36 de 38 slugs contêm nomenclatura test/beta/backup. Isso é achado de inventário, não prova de que todas estejam sem consumidores. Além dos quatro runtimes centrais, 34 variantes/backs antigos precisam de inventário de dependências, auth, consumidores e rollback antes de qualquer desativação.
- Nenhuma função \`upstatus-signal\` dedicada existe em produção.

Runtimes centrais inspecionados:
| Função | Versão Edge | SHA de source (prefixo) |
|---|---:|---|
| upstatus | v480 | \`bb2713ceb554\` |
| upstatus-test | v281 | \`7b5dfb1279f3\` |
| upstatus-team-lite | v15 | \`2c13414a011f\` |
| upstatus-screen-share-3-1-1-beta10 | v6 | \`f6c5f8a4e32e\` |

Todas as quatro continuam com \`verify_jwt=false\`; o produto usa sessão customizada em rotas autenticadas, portanto o flag sozinho não prova ausência de autenticação. A revisão de cada rota permanece necessária.

### AUTH-03 legado ainda implantado

Inspeção das quatro fontes implantadas confirmou:
- \`GET /api/account\` retorna \`needsSetup\`;
- \`POST /api/setup\` chama o fluxo antigo \`login(req,true)\`;
- não há consumidor \`setup_invite\` nem RPC \`consume_upstatus_setup_invite\` nas quatro fontes;
- quando o papel existente está vazio, o setup antigo ainda deriva \`implementation_admin\` por allowlist de nome (\`Ricardo\`, \`Lohan\`, \`Guilherme\`);
- não há rate limiter específico de login/setup nessas fontes.

Política de senha implantada ainda diverge:
- Normal \`upstatus\` e beta10 exigem 6 caracteres;
- \`upstatus-test\` e Team Lite exigem 4 caracteres.

Consulta agregada read-only em produção:
- 5 usuários;
- 0 sem senha;
- 0 sem papel;
- 3 com papel \`implementation_admin\`.

Não foi encontrada conta atualmente sem senha/papel. O risco do setup antigo é latente para futuras contas provisionadas sem configuração.

## 6. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Security Advisor, observado em 2026-11-07 17:31 UTC:
- 3 WARN para SECURITY DEFINER executável por anon;
- 3 WARN para SECURITY DEFINER executável por authenticated;
- 10 INFO de RLS habilitado sem policy.

Catálogo SQL confirmou três funções SECURITY DEFINER:
- \`public.upstatus_broadcast_messages()\`
- \`public.upstatus_broadcast_remote_state()\`
- \`public.upstatus_broadcast_users()\`

As três têm \`search_path=public\`, EXECUTE efetivo para anon/authenticated e triggers habilitados:
- \`upstatus_messages_broadcast\` em \`public.messages\`;
- \`upstatus_remote_state_broadcast\` em \`public.upstatus_state\`;
- \`upstatus_users_broadcast\` em \`public.users\`.

Definições atuais:
- messages publica OLD/NEW completo por \`to_jsonb\`, incluindo conteúdo e metadados;
- remote-state publica sender, target, status, reason, error e timestamps;
- user-status publica name/status/reason/updated_at/sync;
- todos chamam \`realtime.send(..., false)\`, ou seja, broadcast público.

Nove tabelas backend-owned em public têm RLS, zero policies e privilégios efetivos de anon/authenticated incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE; a consulta também encontrou REFERENCES/TRIGGER/MAINTAIN. \`upstatus_visual_config\` não tem esses grants de cliente. Zero policies não prova leitura/escrita de linhas via PostgREST, mas os grants são superfície excessiva; TRUNCATE não é protegido por RLS.

\`realtime.messages\` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

### Default ACLs de produção

Consulta read-only em \`pg_default_acl\` confirmou defaults amplos:
- role postgres em schemas public e storage: anon/authenticated recebem privilégios de sequence, EXECUTE em funções e privilégios completos de tabela (\`arwdDxtm\`);
- role supabase_admin em public, graphql e graphql_public: defaults semelhantes para anon/authenticated;
- há ainda defaults de postgres/supabase_admin em outros schemas.

Isso afeta objetos futuros criados por esses owners, não apenas os grants atuais. ACL-02 exige plano administrativo próprio; não alterado nesta auditoria.

### Laboratório isolado

- 34 migrations; última \`20261107165942 pin_empty_search_path_trigger_broadcasts_test\`.
- Security Advisor: 0 WARN, 17 INFO de RLS sem policies.
- Tabelas backend-owned em public: zero grants de cliente para anon/authenticated.
- Três RPCs de broadcast permanecem SECURITY DEFINER por serem trigger functions, mas agora têm \`search_path=''\` e EXECUTE negado a anon/authenticated; triggers continuam habilitados.
- Payloads foram reduzidos a \`{op}\`, porém continuam \`private=false\`.
- \`realtime.messages\` ainda tem SELECT/INSERT/UPDATE para anon/authenticated e zero policies.

A migration isolada de search_path está no ledger; a migration de produção correspondente \`20261107170000_pin_empty_search_path_trigger_broadcasts.sql\` existe no candidato #74 (blob \`650efd2ab325ef3924ce9e95e83b72c0510a3f3f\`) mas não está no ledger de produção.

### Limite importante do teste Realtime isolado

O último checkpoint da issue #79 relata que um probe transacional no laboratório executou os três triggers, mas \`realtime.send\` emitiu warning engolido porque não havia partições filhas em \`realtime.messages\`; o probe foi revertido.

Consulta independente confirmou:
- laboratório: 0 linhas em \`realtime.messages\`, 0 partições filhas;
- produção: 50 linhas e 7 partições filhas.

Logo, o laboratório comprova configuração de função/trigger/grants/payload, mas **não comprova entrega de broadcast Realtime em runtime**. Também não prova canal privado: os dois ambientes ainda usam \`private=false\`. Não foi executado probe pela auditoria.

## 7. Storage e anexos

Consulta em \`storage.buckets\` de produção:
| Bucket | Público | Limite |
|---|---|---:|
| chat-images | true | 20 MiB |
| profile-images | true | 20 MiB |

A consulta a \`pg_policies\` para \`storage.objects\` não retornou policies explícitas. Buckets públicos permitem leitura por URL pública; a PR #85 valida e retorna \`publicUrl\`. Upload assinado protege a operação de escrita, não torna a leitura privada. Se anexos do chat devem ser restritos à equipe, é necessário decidir migração para bucket privado e URLs de download assinadas.

Na #85, o cliente/servidor signed-upload para chat/avatar passou em mocks. Não houve upload real; o laboratório não tem esses buckets.

Áudio continua em caminho separado:
- cliente grava e envia data URL para \`/api/chat/audio\`;
- servidor usa \`mediaRoute\`/upload legado, com limite de 5 MiB para áudio;
- esse fluxo não usa o novo signed-upload route nem está coberto pela regressão signed-upload de chat/avatar.
O cliente aceita blob até 20 MiB antes do envio; a diferença com o limite server-side de 5 MiB é um contrato a alinhar/testar. A gravação atual limita duração e bitrate, mas isso não substitui teste de limite.

## 8. Updater, URL e PR #85

A leitura do \`release.json\` em #85 confirma versão 3.4.7 e \`scriptUrl\` estável em \`/functions/v1/upstatus/upstatus.user.js\`.

O builder #85 usa \`release.scriptUrl\` para UpdateURL/DownloadURL de produção, mas mantém \`CLOUD_SERVER\` apontando para beta10 como backend de API legado. São papéis distintos; não classificar essa diferença isolada como bug.

O validador #85 agora confere UpdateURL/DownloadURL contra \`release.json\` e impede que o artefato TEST contenha URL estável de produção. A correção ainda está em branch Draft, portanto não está no master que executa o Validate da #82. O erro \`production updateURL mismatch\` da #82 permanece herdado do master atual.

O cutover do backend continua pendente: API, autenticação, signaling, Storage, versões, compatibilidade de clientes já instalados e rollback precisam ser tratados como uma mudança coordenada.

## 9. Issues

### [#78 — recuperação de voz após reconexão](https://github.com/Reekyi/UpStatus/issues/78)

Permanece OPEN, com 8 critérios não marcados. O último comentário de engenharia disponível registra 0/8 testes físicos. Não há evidência de teste real no Tampermonkey com queda de rede por ~10 segundos, retorno sem F5, reload offline, permissões físicas de microfone/display e interoperabilidade entre instalações Normal ↔ Team Lite. CI Chromium/VM não substitui esses testes.

### [#79 — checklist de release](https://github.com/Reekyi/UpStatus/issues/79)

Permanece OPEN, 97 comentários. O corpo principal ainda contém snapshot de 12:23 BRT; o comentário mais recente, 13:56 BRT, atualiza os heads #74/#76/#82/#84/#85 e registra a migration de search_path no laboratório e o probe Realtime sem partições. O corpo precisa ser reconciliado pelos responsáveis; não foi editado nesta auditoria.

## 10. Fixtures do laboratório

Consulta SELECT agregada atual:
- users 0;
- sessions 0;
- rooms 0;
- memberships 0;
- bindings 0;
- events 0;
- call attempts 0;
- voice attempts 0;
- rate-limit buckets 0;
- chat reads 0;
- messages 0.

Também \`realtime.messages=0\`. Não foram executados scripts de teste/limpeza nem qualquer mutação pela auditoria.

## 11. Bloqueadores e próximos gates

1. **Crítico:** integrar e revisar a proteção do workflow TEST antes de executar o workflow atual de develop.
2. **Bloqueado:** provisionar TEST full-product independente, com identidade, host, organização, secrets e rollback próprios.
3. **Bloqueado:** gerar/deployar runtime TEST próprio para Team Lite; hoje o builder só gera a função Team Lite de produção e o workflow TEST só implanta \`upstatus-test\`.
4. **Crítico:** planejar migração de autenticação legada, setup por convite, remoção do fallback administrativo por nome e rate limit de login/setup.
5. **Crítico:** projetar Realtime autorizado/privado ou transporte server-mediated, removendo full-row payloads. Não basta trocar \`private=false\` sem resolver JWT/policies e o modelo de sessão customizada.
6. **Crítico:** revisar grants atuais e default ACLs de postgres/supabase_admin com plano de validação/rollback em TEST.
7. **Pendente:** decidir privacidade de chat-images/profile-images; validar upload e download reais em TEST. Incluir áudio no contrato/limites de upload ou documentar explicitamente o caminho legado.
8. **Pendente:** inventariar 34 variantes/backup adicionais e confirmar consumidores/rollback antes de desativar qualquer função.
9. **Pendente:** concluir 8 critérios físicos da #78.
10. **Pendente:** reconciliar #79, resolver o Validate herdado da #82 após revisão da correção #85 e obter reviews humanas.

## 12. Veredito

- Normal #74: **AUTOMATED PASS** no HEAD atual.
- Team Lite #76: **AUTOMATED PASS** no HEAD atual.
- #84: **AUTOMATED PASS** de guard/validação; deploy e Management API reais não executados.
- #85: **AUTOMATED PASS** de testes mockados; Storage real não testado.
- #82: **VALIDATE FAIL** por contrato herdado de master.
- #78: **MANUAL PENDING**.
- Produção: **BLOCKED** por setup legado, grants/default ACLs, broadcasts públicos e ausência de rollout coordenado.
- TEST full-product: **BLOCKED**.

Não atribuir percentual. CI verde de subsistema isolado não equivale a aprovação do backend completo, aceitação física ou prontidão de produção.

## Registro de segurança

Nenhum SQL write, migration, deploy, alteração de Edge Function, secret/token/flag/role/grant/policy/ACL, limpeza de fixture, merge, release ou publicação de userscript foi realizado. Nenhuma branch de engenharia foi alterada. A única escrita desta rodada é este relatório novo na branch QA dedicada. O arquivo principal \`docs/RELEASE_READINESS.md\` foi preservado no blob SHA informado no início.


## 13. Validação automática do commit documental

A criação do relatório gerou o commit \`84d08a882912becd08aee8b882aff2390875eb0e\`. O workflow automático [Validate 42397106911](https://github.com/Reekyi/UpStatus/actions/runs/42397106911) foi associado a esse commit e terminou em FAILURE.

Job \`128476729384\`; erro em \`scripts/validate.mjs:26\`:
\`VALIDATION FAILED: production updateURL mismatch\`.

O log construiu PROD/TEST 3.4.7 antes da asserção. A falha é a mesma do baseline master já registrada para #82; não é causada pelo relatório Markdown. Nenhum validador foi modificado ou contornado. O novo relatório continua sendo documentação-only.


## 14. Snapshot final da branch QA

A tabela de heads na seção 1 registra o snapshot dos candidatos antes da gravação deste relatório. Após a gravação e o adendo da validação, o HEAD documental atual da PR #82 é \`2fab01b0f6d9d2b47eacee4a6770fba95e6ac677\` (104 commits, 16 arquivos, Open/Draft). O relatório verificado imediatamente antes deste adendo tinha blob \`9f6a3f3c3265da44162adeb84b4f72929981d064\`.

O run [42397106911](https://github.com/Reekyi/UpStatus/actions/runs/42397106911) foi disparado pelo commit documental anterior \`84d08a882912becd08aee8b882aff2390875eb0e\` e falhou em \`production updateURL mismatch\`. Na última consulta, não havia workflow associado ao HEAD \`2fab01b0f6d9d2b47eacee4a6770fba95e6ac677\`. Não inferir resultado para esse HEAD.
