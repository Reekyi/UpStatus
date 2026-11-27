# UpStatus — auditoria final dos ambientes e gates operacionais

**Data:** 2026-11-27  
**Branch:** `chore/cleanup-structure-347`  
**Objetivo:** registrar a validação adicional dos ambientes Revived e Staging depois da conclusão da reorganização offline do Normal 3.4.7.

## 1. Resultado da branch

- PR: [#179](https://github.com/Reekyi/UpStatus/pull/179), ainda Draft.
- Base: `master` em `9d40461babcec8eb8686c2a04be9c675df7da381`.
- HEAD verificado antes deste documento: `ffea7ea643ee2406e0d010c970ce1a1a32219e29`.
- Diff contra `master`: 79 arquivos adicionados, sem arquivos removidos ou alterados na base.
- Workflow `Verify Recovered Normal Runtime`, run #281: 27 etapas concluídas com sucesso, incluindo reconstrução byte a byte, 17 testes unitários de módulos, quatro testes integrados, execução Deno isolada do candidato, comparação HTTP diferencial e parse/bundle com esbuild.

A validação do código de reorganização está concluída em ambiente offline. O candidato modular continua isolado em `dist/`; não foi copiado para `supabase/functions` nem implantado.

## 2. Ambientes Revived

A organização Revived contém dois projetos ativos e saudáveis:

| Projeto | Project ref | Estado | Versões verificadas via endpoint público |
|---|---|---|---|
| `upstatus-normal` | `mvjqunhjxkbfcrxkjtgf` | ACTIVE_HEALTHY | Normal `3.4.7`; Screen Share `3.1.1-beta8` |
| `UpStatus Staging` | `akbgmmpnnpwcwgcfrltw` | ACTIVE_HEALTHY | Normal `3.4.8-beta.1`; Screen Share `3.1.1-staging.1` |

Os endpoints `/api/update-info` dos dois runtimes do projeto `upstatus-normal` responderam com as versões Normal 3.4.7 e Screen Share 3.1.1-beta8. Os mesmos endpoints no projeto `UpStatus Staging` responderam com 3.4.8-beta.1 e 3.1.1-staging.1.

**Importante:** `UpStatus Staging` não está executando o candidato modular Normal 3.4.7. É um ambiente distinto, com builds de staging mais novos. A resposta positiva do endpoint de versão comprova que as Edge Functions respondem, mas não comprova compatibilidade do candidato modular com o banco real ou com o Managed Edge Runtime.

## 3. Realtime em UpStatus Staging

As duas Edge Functions de Staging estão ACTIVE, versão de implantação 1 e `verify_jwt=false`.

Os userscripts embarcados nas funções Normal e Screen Share declaram o mesmo tópico:

`upstatus-screen-share-staging-live-v1`

A inspeção do cliente encontrou uso de Broadcast/Presence e nenhuma inscrição `postgres_changes`. A publicação `supabase_realtime` não contém tabelas. Portanto, a publicação vazia é compatível com o padrão de Realtime observado; não adicionar tabelas à publicação apenas para eliminar esse indicador.

## 4. Banco e controle de acesso em UpStatus Staging

Migrations registradas no banco:

- `20261126201124 upstatus_staging_baseline_20261126`
- `20261126201326 align_staging_realtime_topic_20261126`

O schema público contém dez tabelas. Todas têm RLS habilitado. Não foram encontradas policies no schema `public`. A auditoria de privilégios confirmou que `anon` e `authenticated` não têm acesso às tabelas públicas usadas pela aplicação; o acesso CRUD observado está concentrado em `service_role`.

Isso é coerente com a arquitetura atual, na qual o cliente fala com as Edge Functions e elas usam o cliente Supabase privilegiado. Como `verify_jwt=false`, a proteção de rotas depende da autenticação e autorização implementadas pela própria aplicação. Os testes offline cobrem diversos casos positivos e negativos, mas a autorização completa ainda não foi exercitada contra o banco real.

### Smoke test de autorização no Managed Edge Runtime

Foi feito um teste GET anônimo, sem cookies ou token de aplicação, nas duas funções de Staging:

- `GET /api/me`: ambas responderam HTTP 200 com `authenticated:false`, `name:null`, `role:null` e `canViewHistory:false`.
- `GET /api/chat`: ambas responderam HTTP 401.
- `GET /api/remote-status`: ambas responderam HTTP 401.

Isso confirma que, apesar de `verify_jwt=false` no gateway, os dois endpoints protegidos testados aplicam o gate de autenticação da própria aplicação no runtime gerenciado. Não substitui teste autenticado, testes de papel/permissão ou a validação do candidato modular 3.4.7.

## 5. Storage em UpStatus Staging

Buckets encontrados:

| Bucket | Público | Limite | Tipos principais |
|---|---:|---:|---|
| `chat-images` | Sim | 20 MiB | imagens, vídeos, áudio e documentos |
| `profile-images` | Sim | 20 MiB | imagens |

Não há policies em `storage`. A tabela `storage.objects` tem RLS habilitado e estava vazia na consulta. Os privilégios padrão de `anon` e `authenticated` sobre `storage.objects` existem, mas, sem policies de RLS, não liberam operações por si só. `service_role` mantém os privilégios usados pelas Edge Functions.

Os buckets são públicos: qualquer objeto gravado neles pode ser lido por URL pública. Isso deve ser tratado como uma decisão explícita de produto, especialmente para arquivos enviados ao chat, e não como armazenamento privado. O código das funções usa upload server-side e também gera URLs de upload assinadas; os fluxos reais de autorização e upload ainda precisam de teste controlado no ambiente de staging.

## 6. Diferença de precedência de credenciais

A função Normal de Staging prioriza `SUPABASE_SECRET_KEYS.default` e depois `SUPABASE_SERVICE_ROLE_KEY`. A função Screen Share prioriza `SUPABASE_SERVICE_ROLE_KEY` e depois `SUPABASE_SECRET_KEYS.default`.

Essa diferença existe no código atualmente implantado. Não foi normalizada nem alterada durante esta auditoria. Antes de unificar a configuração, confirmar qual secret deve prevalecer em cada runtime e se há dependência operacional dessa ordem.

Nenhum valor de segredo foi lido ou registrado neste documento.

## 7. Falha independente do workflow legado

O workflow `UpStatus Validate` continua falhando na etapa `Validate build` por:

`VALIDATION FAILED: production updateURL mismatch`

A causa localizada é a divergência entre `scripts/build.mjs`, que configura o userscript de produção para o endpoint Screen Share Beta10, e `scripts/validate.mjs`, que exige o caminho `/upstatus/upstatus.user.js`. Essa verificação pertence ao build legado e é independente da reconstrução modular Normal 3.4.7.

A falha não foi escondida nem alterada nesta branch. Corrigi-la exige decidir qual endpoint de distribuição deve ser considerado o contrato de produção; mudar apenas a asserção poderia mascarar uma configuração errada.

## 8. Gates ainda abertos

1. **Projeto original:** o acesso administrativo ao projeto original `dlfvkawaiqduhlazsszm` não foi obtido pelo conector Supabase nesta sessão. A tentativa de leitura pública dos endpoints também não forneceu resposta verificável. Não concluir que o projeto foi desligado ou removido.
2. **Cutover:** não há confirmação independente de que `upstatus-normal` substituiu o projeto original. A ausência de runtimes TEST, Team Lite e do slug Beta8 em Revived impede afirmar equivalência integral do ambiente antigo.
3. **Validação gerenciada:** o candidato modular 3.4.7 ainda não foi implantado em ambiente isolado para uma rodada de teste real contra Supabase/Managed Edge Runtime.
4. **Storage e autorização:** executar testes controlados de upload assinado, leitura pública, falhas de permissão e rotas administrativas, sem usar dados ou credenciais de produção.
5. **Desempenho:** obter uma caracterização de carga/latência antes de qualquer troca de runtime.

## 10. Nova confirmação sobre o projeto original

A conexão Supabase **Primary** permitiu consultar o projeto original `UpStatus` (`dlfvkawaiqduhlazsszm`), que não estava acessível pela conexão Supabase usada anteriormente.

Estado observado em 2026-11-27:
- O projeto original está com status **INACTIVE** no Supabase.
- O inventário ainda lista 38 Edge Functions como `ACTIVE` no metadata de implantação.
- Entre elas permanecem os slugs `upstatus` (versão 480), `upstatus-test` (281), `upstatus-team-lite` (15), `upstatus-screen-share-3-1-1-beta8` (2) e `upstatus-screen-share-3-1-1-beta10` (6).
- As consultas ao banco do projeto original falharam por indisponibilidade/timeout, compatível com o estado INACTIVE.
- O endpoint público do projeto original não pôde ser verificado nesta auditoria.

**Interpretação:** o projeto antigo está pausado/inativo neste momento, enquanto `upstatus-normal` e `UpStatus Staging` estão ACTIVE_HEALTHY. Isso reduz a incerteza sobre o estado atual dos ambientes, mas ainda não prova o cutover funcional completo: os metadados não mostram tráfego, clientes conectados, DNS/URLs distribuídas ou dependências externas. Não restaurar o projeto original nem desativar funções adicionais sem uma decisão explícita.

## 9. Alterações realizadas nesta auditoria

Somente leituras de GitHub/Supabase e GETs públicos de `/api/update-info`. Não foram realizadas alterações em banco, migrations, RLS, policies, grants, buckets, secrets, configurações, Edge Functions ou deployments. Nenhum merge, cutover ou desativação de runtime foi executado.

**Conclusão:** a reorganização e a equivalência offline do Normal 3.4.7 estão concluídas. O PR deve permanecer Draft até que os gates operacionais acima sejam resolvidos e o destino do cutover seja confirmado.