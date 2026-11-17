# Auditoria independente de qualidade — UpStatus

**Snapshot:** 2026-11-13 01:25 UTC  
**Repositório:** Reekyi/UpStatus  
**Projetos Supabase:** produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb  
**Veredito:** **NOT READY**

## 1. Método e limites

Inspeção read-only de GitHub e Supabase: heads, diffs, PRs, workflows, logs de jobs, issues, fontes de Edge Functions, migrations, catálogos PostgreSQL e Storage. As consultas SQL desta rodada foram SELECT-only.

Não houve checkout local, build local, execução manual de testes, navegador Tampermonkey, queda física de rede, captura real de microfone/tela, merge, deploy, migration, publicação, alteração de secrets/flags ou escrita em produção. A única escrita autorizada é este relatório novo na branch QA dedicada e a atualização do comentário QA existente na Issue #79.

## 2. Heads e integridade documental

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| qa/release-readiness-2026-11-04-master | 1ce1193b9565535087ee05bfcd9c9a32312f42f9 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

Comparação QA versus master: **266 commits à frente, 1 atrás**, status diverged. Os 125 arquivos divergentes são documentação em docs/. O commit master-only é documental. Não foi feito rebase nem incorporação automática.

PR #82 é documentation-only: 125 arquivos, 33.422 adições, zero remoções. Seu HEAD coincide com o HEAD QA acima.

### RELEASE_READINESS.md

O arquivo foi lido integralmente a partir do blob atual: 1.045.105 caracteres e 8.410 linhas. O último checkpoint técnico dentro dele é 2026-11-08 15:30 BRT / 18:30 UTC. Portanto, o documento principal está defasado em relação às revalidações e às mudanças de 09–13/11. Foi preservado sem sobrescrita; este relatório é um append documental separado.

## 3. PRs, commits e CI

Todas as PRs obrigatórias consultadas permanecem abertas, Draft e não mescladas. Não foram encontradas reviews formais em #74, #75, #76, #82 ou #157.

| PR | HEAD / base | Escopo | CI observado |
|---|---|---|---|
| #74 Normal | fb878537 / master 9d40461 | 883 commits, 90 arquivos | Validate e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90 / team-lite-official 9065bc | 59 commits, 10 arquivos | PASS histórico, 03/11 |
| #76 Team Lite signaling | c4dee8d2 / team-lite-official 9065bc | 384 commits, 57 arquivos | Candidate Checks PASS |
| #82 QA documental | 1ce1193 / master 9d40461 | 266 commits, 125 arquivos docs/ | Validate FAIL |
| #157 avatar Team Lite | b7baf3a / base f1938fa | 4 commits, 3 arquivos | avatar-contract PASS |

### #74 — Normal

- Validate: [run 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), PASS.
- Signaling Smoke: [run 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), PASS.
- O Smoke concluiu 136/136 verificações autenticadas, negociação WebRTC de chamada/voz/tela, entrega de tracks remotos, mesh de três membros, rate limit 90 aceitas + 1 rejeitada HTTP 429 com Retry-After 60s, concorrência e cleanup.
- O workflow candidato TEST usa SUPABASE_TEST_PROJECT_ID, rejeita o projeto de produção e o laboratório de sinalização, valida correspondência entre build/deploy e fixa Supabase CLI 2.122.1.
- O workflow candidato de produção valida master, SHA e projeto, fixa CLI 2.122.1, mas publica somente a função upstatus e mantém versão estável exatamente 3.4.7. Não coordena o deploy da API beta10.

### #75 — baseline Team Lite

- [run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS histórico.
- O job valida scripts, versão 3.4.31, manifestos, sintaxe, portais e cenários do updater.
- Não é evidência de aceitação física nem substitui a linha ativa #76.

### #76 — Team Lite signaling

- [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080), PASS no HEAD atual.
- 16/16 verificações não autenticadas e 110/110 autenticadas.
- Chromium/Playwright validou negociação WebRTC de chamada, voz e tela, entrega de áudio/vídeo remoto, mesh de três participantes e teardown.
- Também passaram rate limit distribuído 90+1/429, recibos de leitura atômicos, consumo de convite, rate limit de emissão de convite, guards de migrations e gatilhos do workflow.
- Os testes mutáveis usam o projeto isolado bfpjtfqlnypisxljoxkb. São testes automatizados isolados, não teste físico do userscript com permissões reais do Tampermonkey.

### #82 — QA documental

- [Validate 43338624299](https://github.com/Reekyi/UpStatus/actions/runs/43338624299), FAIL.
- O log confirma VALIDATION FAILED: production updateURL mismatch em scripts/validate.mjs:26.
- A PR altera somente documentação; a falha é do contrato herdado do build de master, não de uma mudança de runtime no conteúdo Markdown. Não foi feito rerun nem removida assertion.

### #157 — identidade de avatar (complementar)

- [Pull Request Validate 43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082), PASS.
- O prefixo de avatar passou a derivar de users.id e o handler falha fechado quando a resolução não retorna exatamente um usuário.
- A inspeção e o checkpoint posterior da Engenharia confirmam que createSession/userFromToken ainda persistem e devolvem apenas user_name; upstatus_sessions e upstatus_profiles continuam sem user_id e a tabela de perfil permanece chaveada por user_name. O ID é resolvido novamente pelo nome a cada operação, não vinculado ao token.
- Sessão antiga após renomeação/reutilização de nome continua sendo um risco de identidade. A #157 permanece Draft. O laboratório tem UNIQUE(name), mas produção não.
- O teste é contratual/estático; não houve PUT real no Storage, concorrência, nem teste físico de rename/reuso.

## 4. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos aprovados, 28 comentários. Última atualização 08/11. Sem evidência nova de reconexão física sem F5, reentrada em sala, microfone/tela reais ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, corpo com **16/35** itens marcados e 19 pendentes, 150 comentários. Comentário QA dedicado existente preservado e atualizado; comentário da Engenharia não foi alterado.

## 5. Supabase: projetos, Edge Functions e migrations

Ambos os projetos estão ACTIVE_HEALTHY:
- Produção UpStatus dlfvkawaiqduhlazsszm, região us-west-2.
- Laboratório upstatus-security-test bfpjtfqlnypisxljoxkb, região sa-east-1.

Produção possui 38 Edge Functions ACTIVE, todas reportando verify_jwt=false. Doze slugs têm prefixo upstatus-test. Entre as funções principais:
- upstatus v480, userscript embutido 3.4.7.
- upstatus-team-lite v15, userscript embutido 3.4.30.
- upstatus-test v281, userscript embutido 3.3.28.

O TEST v281 está instalado no projeto de produção. Seu userscript embutido tem o mesmo @name, @namespace upseller e GM storage key upstatus_screen_share_beta8_ do Normal; também usa o tópico beta10 de produção. Isso cria colisão de identidade/armazenamento local entre TEST e Normal, além do compartilhamento da infraestrutura Supabase. O backend da função usa a chave de serviço do próprio projeto em operações server-side; nenhum segredo foi exposto no relatório.

O laboratório possui somente duas funções: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não possui buckets nem objetos Storage, portanto não é ambiente full-product para validar chat/avatar/upload de ponta a ponta.

### Migrations e AUTH-03

| Ambiente | Migrations |
|---|---:|
| Produção | 7 |
| Laboratório | 39 |

A branch gerenciada main de produção está MIGRATIONS_FAILED. Quatro arquivos aplicados no histórico de produção não foram localizados nos caminhos esperados em master; os quatro fetches exatos retornaram HTTP 404. Não se deve reconstruir SQL histórico por inferência.

Produção não possui colunas setup_token_*, tabelas de convite nem rotinas de consumo/limite. O laboratório possui quatro colunas setup_token_*, a tabela upstatus_setup_invite_rate_limits e as rotinas consume_upstatus_setup_invite / consume_upstatus_setup_invite_rate_limit.

A Edge Function de sinalização do laboratório v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE. Esse código cai no fallback 500. A verificação foi estática; não foi feita requisição HTTP nesta auditoria.

## 6. Realtime, RLS, grants e SECURITY DEFINER

Consulta SELECT-only em produção:

- 125 linhas em realtime.messages, todas private=false, no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0:
  - 46 db_change
  - 67 user_status
  - 6 remote_command
  - 6 remote_result
- O tópico dos clientes instalados é upstatus-screen-share-live-3-1-1-beta10, diferente do tópico dos triggers.
- Os bundles Normal, TEST e Team Lite criam channel(UP_REALTIME_TOPIC) sem private:true e sem realtime.setAuth().
- Normal e TEST encaminham remote_command recebido para executeRemoteCommand quando target coincide com o membro local. Também recebem call_signal, voice-room e screen-share broadcasts. Team Lite verifica a própria sessão/geração de autenticação, mas não autentica independentemente a identidade do emissor.
- Isso confirma um caminho de confiança estruturalmente público; não é prova de exploração externa ou de entrega efetiva a um assinante malicioso.

PostgreSQL de produção:
- 10 tabelas public com RLS habilitado e zero policies.
- 9 tabelas concedem privilégios de tabela a anon e authenticated; há 18 grants TRUNCATE somados entre os dois papéis.
- 3 funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public e EXECUTE está concedido a anon/authenticated/service_role.
- realtime.messages tem zero policies.
- pg_default_acl contém 24 entradas.

Laboratório:
- 18 tabelas public com RLS e zero policies, mas zero grants diretos equivalentes para anon/authenticated nas tabelas public consultadas.
- As três funções broadcast usam search_path vazio e EXECUTE somente para service_role.
- realtime.messages não tem linhas e tem zero policies.
- pg_default_acl contém 25 entradas.

## 7. Storage

Produção:
- chat-images e profile-images são públicos.
- Limite de 20 MiB por bucket.
- 168 objetos em chat-images e 20 em profile-images.
- Zero policies próprias em storage.objects.

Laboratório:
- Zero buckets e zero objetos.
- Zero policies próprias em storage.objects.

Os limites declarados nos tickets de avatar e o limite do bucket não são uma garantia de validação dos bytes efetivamente enviados. A CI da #157 não fez PUT real. A propriedade do avatar também continua ligada a user_name na sessão/perfil, apesar do prefixo de objeto derivar de users.id.

## 8. Workflows e compatibilidade Normal/Team Lite

Na base team-lite-official:
- deploy-production.yml continua usando supabase functions deploy upstatus, que é o slug Normal, e CLI latest.
- deploy-test.yml antigo aceita push em develop e usa SUPABASE_PROJECT_ID compartilhado para upstatus-test.
- A #76 candidata substitui deploy-test por workflow manual com SUPABASE_TEST_PROJECT_ID, guard contra produção/laboratório e CLI fixada. Como #76 não foi integrada, a base oficial ainda mantém o workflow antigo.
- A #76 não altera deploy-production.yml; portanto o destino errado do workflow oficial Team Lite continua sem correção nessa candidata.

Na #74, o workflow candidato Normal é mais restritivo, mas só publica upstatus e não coordena a função API beta10. O rollout de clientes e API continua exigindo plano separado.

## 9. Gates desta rodada

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 125 broadcasts private=false e clientes sem autenticação Realtime |
| TEST-ISOLATION | blocked | upstatus-test v281 e 12 slugs de teste ACTIVE em produção; dois projetos Supabase no inventário |
| MIGRATION-PROVENANCE | blocked | 7 migrations em produção, 39 no laboratório e quatro SQLs não localizados em master |
| AUTH-03 | blocked | estruturas de convite ausentes em produção; presentes no laboratório |
| ACL-STORAGE | blocked | grants amplos, funções SECURITY DEFINER, buckets públicos e zero policies em storage.objects |
| RECONNECT | pending | Issue #78 continua 0/8, sem confirmação física |
| HUMAN-REVIEW | pending | PRs Draft e sem reviews formais; nenhuma autorização de release |

## 10. Próximos passos recomendados

1. Provisionar um projeto full-product TEST separado e planejar a retirada do runtime legado TEST da produção; não desativar função em produção sem plano e autorização.
2. Tornar Realtime privado/server-mediated com identidade do emissor e membership verificadas no servidor, em Normal e Team Lite.
3. Alinhar tópico dos triggers e dos clientes durante rollout coordenado.
4. Corrigir deploy-production.yml Team Lite para upstatus-team-lite, fixar CLI e exigir SHA/projeto/approval; integrar o guard TEST da #76 antes de qualquer dispatch.
5. Vincular sessão e perfil a users.id, migrar/backfill com tratamento de nomes ambíguos e invalidar sessões antigas.
6. Validar bytes, MIME e tamanho real de uploads; decidir política de buckets e ownership; executar PUT real em ambiente isolado.
7. Recuperar os quatro SQLs originais de fonte confiável, reconciliar ledger e resolver MIGRATIONS_FAILED.
8. Completar AUTH-03 em produção somente com revisão e autorização separadas.
9. Corrigir o contrato HTTP 409 e validar por requisição real no laboratório.
10. Executar os oito critérios físicos da #78 e obter aprovação humana vinculada ao SHA final.

**Conclusão:** NOT READY. CI automatizado de Normal e Team Lite passou nos HEADs consultados, mas não substitui aceitação física nem comprova que produção recebeu as correções. Os bloqueadores de isolamento, Realtime, workflow Team Lite, AUTH-03, migrations e Storage continuam ativos.
