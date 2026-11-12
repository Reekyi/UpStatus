# UpStatus — auditoria independente QA (12/11/2026, 21:48 UTC)

## Escopo e método

Revalidação read-only de GitHub e Supabase: branches/heads, PRs #74/#75/#76/#82/#152/#153/#154, workflows e logs existentes, issues #78/#79, artefatos de Edge Functions, bundles embutidos, catálogos PostgreSQL, RLS, grants, Default ACL, Realtime, Storage, migrations e advisors.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente: 8.410 linhas / 1.045.105 caracteres. Seu último append é de 08/11/2026 às 18:30 UTC; ele não registra os novos candidatos #152–#154 nem o checkpoint desta data. Este relatório é novo e não substitui o documento-base.

Não executei scripts localmente, requests HTTP, uploads, testes físicos, workflows ou reruns. Os resultados CI abaixo são runs já existentes, não execuções desta auditoria. Não há browser/Tampermonkey ou ambiente full-product TEST disponível nesta execução.

## Heads reais e relação entre candidatos

- master: 9d40461babcec8eb8686c2a04be9c675df7da381.
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- qa/release-readiness-2026-11-04-master: a53a1983e9926ad6c70c76cb935415a771ad7aba.
- PR #74: fb878537d95db9097cce6d29a14260b9fd8d2e3d.
- PR #75: 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309.
- PR #76: c4dee8d2c502499de5f95932ac14a90cffb56196.
- PR #82: a53a1983e9926ad6c70c76cb935415a771ad7aba.
- PR #152: 766e6144119bfae1de7d4d253e84cefb3c10fa95.
- PR #153: a4665753bab94e638b1a0c80f8caca90500611a8.
- PR #154: 269dd043f1a6397e7226d8d2b5c1b534a0bf5270.

QA está 262 commits à frente e 1 atrás de master; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. A comparação do HEAD QA com a base da #152 mostra seis commits exclusivos da QA, todos adições documentais; a #152 está 20 commits à frente de seu merge-base. Não há alteração concorrente de código de produto na diferença documental identificada.

#154 é uma candidata limpa, 4 commits à frente e 0 atrás da base #152 (766e614). #153 está non-mergeable e baseada em uma versão anterior da #152; não integrar #153 isoladamente.

## CI e PRs

| PR | HEAD | Evidência exata | Resultado |
|---|---|---|---|
| #74 Normal | fb878537 | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | Ambos SUCCESS |
| #75 Team Lite baseline | 7bbf9b90 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico, escopo curto de scripts/versão; não substitui #76 |
| #76 Team Lite | c4dee8d2 | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | SUCCESS, 110/110 checks autenticados |
| #82 QA | a53a198 | [Validate 43303156182](https://github.com/Reekyi/UpStatus/actions/runs/43303156182) | FAILURE: production updateURL mismatch em scripts/validate.mjs:26 |
| #152 | 766e614 | [PR Validate 43307594500](https://github.com/Reekyi/UpStatus/actions/runs/43307594500) | SUCCESS |
| #154 | 269dd043 | [PR Validate 43308787548](https://github.com/Reekyi/UpStatus/actions/runs/43308787548) | SUCCESS no merge ref |

### #74

O Validate inclui o TEST build target guard e passou. O Smoke confirmou 136/136 checks autenticados, chamadas/voz/tela WebRTC com remote tracks, mesh de três participantes, rate limit de sinalização 90 aceitas + 1 HTTP 429, concorrência de sala/voice attempts, read receipts e setup enrollment.

Limitação: duas etapas de rate limit de emissão de setup invite ficaram SKIPPED: a checagem de harness quando presente e a verificação distribuída. Portanto, o PASS do Smoke não cobre esse subgate no Normal. O run #76 cobre esse contrato.

### #76

O run passou 110/110 checks autenticados, browser WebRTC para call/voz/tela, mesh de três participantes, rate limit 90+1/429, setup-invite rate limit distribuído, concorrência, cleanup, Full-IIFE/Playwright com endpoints inertes e guards de mutação isolada. É CI automatizado no laboratório, não aceitação física instalada.

### #82

O run 43303156182 fez checkout do HEAD QA e falhou em production updateURL mismatch. Não removi assertion nem repeti o workflow.

### #152/#154

#152 acrescentou um guard para que o build TEST, por padrão, gere cliente com projeto e chave inertes; configurações apontando para produção ou para o laboratório de sinalização são rejeitadas antes de escrever artefatos. O teste usa projeto/chave de amostra e é offline.

#154 corrige a paridade estrutural das rotas signed-upload. O workflow 43308787548 fez checkout do merge commit 1a83d3b, combinando HEAD #154 269dd04 com base #152 766e614. Passaram as etapas de guard TEST, contratos release/chat, regressões offline e signed-upload parity. O resultado Validation OK: PROD 3.4.7 / TEST 3.4.7 não comprova upload real nem deploy.

#154 permanece Draft e sem reviews humanas. #152 também está Draft e sem reviews. As PRs #74, #75, #76 e #82 não têm reviews humanas registradas.

## Achados de upload na #154

O template agora implementa POST /api/chat/upload-url e POST /api/profile/avatar-upload-url, atrás do guard de sessão customizada. A rota valida MIME declarado, tamanho declarado até 20 MiB, gera caminho aleatório e pede signed upload URL com upsert; o cliente envia PUT com Content-Type declarado.

O teste scripts/signed-upload-parity.test.mjs é estático: verifica strings/trechos do cliente e servidor, existência de campos, rotas e ordem do guard. Não executa Deno, PUT real, Storage ou validação de bytes.

Lacunas observadas por inspeção:
1. O MIME é declarado pelo cliente e não há inspeção de assinatura/conteúdo dos bytes.
2. Não há rate limit/quota específico para emissão de tickets de upload.
3. O caminho não contém vínculo verificável ao usuário que pediu o ticket.
4. profileRoute canonicaliza URL do bucket, mas não comprova que o objeto pertence ao usuário da sessão; um usuário pode referenciar outro objeto público como avatar.
5. A rota assinada permite 20 MiB para avatar, enquanto o caminho legado de avatar limita 2 MiB. O caminho legado de imagem no chat aceita até 25 MiB, mas os buckets de produção limitam 20 MiB.

Classificação: paridade estrutural corrigida e CI PASS; validação de runtime, bytes, ownership e abuso ainda pendentes. Não integrar/publicar sem fechar ou aceitar formalmente essas lacunas.

## TEST-ISOLATION — guard novo não isola o runtime já implantado

A lista Supabase contém apenas dois projetos: produção dlfvkawaiqduhlazsszm e laboratório de sinalização bfpjtfqlnypisxljoxkb. Não há projeto full-product TEST independente.

A função upstatus-test v281 continua ACTIVE dentro do projeto de produção, verify_jwt=false, e seu código usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do projeto onde está implantada. O userscript embutido foi decodificado diretamente da fonte implantada:

- versão 3.3.28;
- @name “UpStatus - Sale Smartly” e @namespace “upseller”, iguais ao Normal;
- updateURL/downloadURL apontam para a própria função upstatus-test;
- CLOUD_SERVER aponta para upstatus-screen-share-3-1-1-beta10 em produção;
- UP_REALTIME_URL e tópico apontam para produção/beta10;
- prefixo GM é upstatus_screen_share_beta8_, igual ao Normal;
- sem private:true e sem realtime.setAuth().

Logo, o guard #152 corrige o artefato TEST que será gerado futuramente, mas não muda o runtime v281 já implantado. O cliente TEST instalado não está isolado e pode compartilhar namespace/armazenamento/API/Realtime com o Normal. Não tratar esse runtime como ambiente de teste seguro.

## Bundles instalados e compatibilidade Normal/Team Lite

Artefatos implantados no projeto de produção:
- upstatus v480: userscript Normal 3.4.7.
- upstatus-team-lite v15: Team Lite 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6: API usada pelo Normal.
- upstatus-test v281: userscript TEST 3.3.28.
- 38/38 Edge Functions estão ACTIVE e reportam verify_jwt=false. Isso não significa ausência de autenticação em todos os endpoints: os handlers usam sessão customizada; porém JWT Supabase não é a barreira usada.

Normal e Team Lite usam o tópico Realtime beta10 sem private:true e sem setAuth. Normal encaminha remote_command recebido para executeRemoteCommand quando target coincide com o membro local. Team Lite também verifica a própria sessão/generation/membro atual, mas isso não autentica a identidade do emissor. Ambos encaminham call_signal, voice_room_signal e eventos de screen-share aos handlers com dados de remetente/sala presentes no payload.

Nenhum ataque foi reproduzido. A configuração de Dashboard “Allow public access” não está exposta pelo conector; não foi feita inscrição externa nem injeção de broadcast. A conclusão é inspeção estática de uma fronteira de confiança não autenticada, não exploração demonstrada.

## Realtime e PostgreSQL

### Produção

Consulta SELECT-only em realtime.messages encontrou 125 linhas, todas private=false, no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os clientes instalados assinam upstatus-screen-share-live-3-1-1-beta10; tópico dos triggers e tópico dos clientes não coincidem.

Os três triggers estão habilitados:
- upstatus_messages_broadcast em public.messages INSERT/UPDATE/DELETE;
- upstatus_remote_state_broadcast em public.upstatus_state;
- upstatus_users_broadcast em public.users.

As funções correspondentes são SECURITY DEFINER, search_path=public e EXECUTE efetivo para anon/authenticated. A função de mensagens serializa OLD/NEW completos via to_jsonb e transmite com private=false. Remote-state envia metadados de comando/resultado e users envia status. As funções retornam trigger; não foi demonstrada invocação RPC direta. O risco concreto confirmado é o broadcast público e o payload, além de grants de execução desnecessários.

realtime.messages tem RLS true, FORCE RLS false, zero policies e privilégios SELECT/INSERT/UPDATE efetivos para anon/authenticated. O acesso externo efetivo a canais públicos não foi testado.

### Laboratório

As três funções de broadcast usam search_path vazio, EXECUTE negado a anon/authenticated e payload minimizado para operação. Continuam chamando realtime.send com private=false. O laboratório não tem mensagens/partições Realtime, portanto não comprova entrega trigger-to-client.

O Security Advisor atual: produção 6 WARN / 10 INFO; laboratório 0 WARN / 18 INFO. Os seis WARN de produção correspondem às três funções SECURITY DEFINER executáveis pelos dois papéis clientes.

## RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas public com RLS e zero policies.
- 9 dessas tabelas concedem a anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER.
- TRUNCATE não é bloqueado por RLS.
- Default ACL: 120 entradas de privilégio amplas envolvendo postgres/supabase_admin nos schemas public, storage, graphql e graphql_public.
- realtime.messages mantém grants SELECT/INSERT/UPDATE para anon/authenticated.
- Buckets chat-images e profile-images são públicos, com 168 e 20 objetos, respectivamente, limite de 20 MiB e zero policies em storage.objects.

Laboratório:
- 18 tabelas public com RLS e zero policies, sem grants diretos equivalentes para anon/authenticated em public.
- Default ACL: 96 entradas amplas ainda presentes: supabase_admin em public/GraphQL e postgres em storage.
- Zero buckets e zero objetos Storage.

O laboratório melhorou os grants de public, mas não fechou Default ACL de todos os owners/schemas nem a política de privacidade de Storage. ACL-STORAGE continua bloqueado.

## AUTH-03, migrations e Edge Functions

Produção:
- 7 migrations no ledger.
- Zero colunas setup_token_*.
- Zero tabelas de rate limit de setup/signaling.
- RPC consume_upstatus_setup_invite ausente.

Laboratório:
- 38 migrations.
- Quatro colunas setup_token_*.
- Tabelas upstatus_setup_invite_rate_limits e upstatus_signal_rate_limits.
- Duas funções de teste ACTIVE: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

O ledger de produção lista sete migrations, mas a árvore supabase/migrations em master e QA contém somente os três SQLs iniciais. Faltam os quatro arquivos correspondentes a:
- 20261023154754 create_upstatus_visual_config;
- 20261026195855 add_chat_message_file_name;
- 20261027154329 allow_chat_document_mime_types;
- 20261027155438 set_upstatus_upload_limits_20mb.

A branch gerenciada Supabase main permanece MIGRATIONS_FAILED; preview ACTIVE_HEALTHY. A causa não foi diagnosticada. Não reconstruir os SQLs a partir do ledger como se fossem originais byte a byte.

A função de laboratório upstatus-signal-test v32 não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409; o helper/RPC candidato espera esse conflito, mas o handler contém somente os códigos antigos. Não foi feita requisição HTTP real, portanto 500 é o fallback previsto pela inspeção, não resposta observada em rede.

## Workflows de publicação

Normal (#74): workflow manual, checkout do SHA dispatchado, exige branch master, confere SHA e project ID, fixa Supabase CLI 2.122.1 e exige release estável 3.4.7. Porém publica somente upstatus; o bundle Normal usa API beta10, que não é coordenada por esse workflow. O version guard ainda está preso a 3.4.7; não há incremento de versão para atualização automática.

Team Lite oficial: workflow manual, checkout sem ref SHA explícito, apenas rejeita prerelease, usa CLI latest e executa supabase functions deploy upstatus, em vez de upstatus-team-lite. Não verifica explicitamente projeto esperado nem SHA dispatchado. Não despachar.

## Issues e aceitação humana

- Issue #78: OPEN, 0/8 critérios físicos. Última atualização 08/11. Nenhum teste físico foi executado nesta auditoria: Tampermonkey, perda/retorno real de internet sem F5, microfone/display permissions e interoperabilidade instalada continuam pendentes.
- Issue #79: OPEN, corpo ainda 16/35 checkboxes concluídos. O comentário QA dedicado 6744331652 foi atualizado; comentário da Engenharia 6744711778 preservado. Há exatamente um comentário QA e um comentário da Engenharia.
- Reviews humanas: listas de reviews vazias para #74, #75, #76, #82, #152 e #154. #154 permanece Draft.

## Gates reavaliados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Bundles e triggers continuam públicos/não autenticados; tópico divergente |
| TEST-ISOLATION | BLOCKED | Guard de build corrigido, mas runtime TEST v281 segue em produção e não há projeto full-product TEST |
| MIGRATION-PROVENANCE | BLOCKED | 4 arquivos SQL ausentes; ledger 7 vs árvore 3; main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Estruturas só no laboratório |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos e buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 0/8; exige teste físico de Ricardo |
| HUMAN-REVIEW | PENDING | Sem review/aprovação humana; exige autorização explícita de Ricardo |

## Próximas ações recomendadas

1. Provisionar ambiente full-product TEST independente e retirar o runtime TEST do caminho de produção; não confundir sentinel do cliente com isolamento do backend.
2. Completar upload assinado: rate limit/quota, validação real de conteúdo, ownership, limites consistentes e teste runtime de Storage.
3. Corrigir RT-01: transporte privado/autenticado server-mediated como default em Normal e Team Lite; alinhar tópicos e remover listeners públicos sensíveis.
4. Corrigir workflow Team Lite para upstatus-team-lite, checkout SHA exato, project guard e CLI pinada.
5. Coordenar deploy Normal com beta10 e definir versão superior a 3.4.7.
6. Aplicar AUTH-03 somente após revisão/autorização, fechar grants/Default ACL e decidir Storage privado.
7. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
8. Corrigir o mapeamento HTTP 409 e validar por request real no laboratório.
9. Executar os oito testes físicos de #78 e obter aprovação humana vinculada ao SHA final.

## Veredito

**NOT READY.** #154 é uma correção candidata útil e passou no merge ref atual, mas o CI é offline/estático para upload. O guard TEST da #152 melhora o artefato futuro, porém o runtime TEST v281 instalado continua conectado ao projeto e aos canais de produção. RT-01, TEST-ISOLATION, AUTH-03, ACL-STORAGE, MIGRATION-PROVENANCE, reconexão física e aprovação humana permanecem sem fechamento.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL ou fixtures. A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
