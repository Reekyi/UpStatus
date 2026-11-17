# UpStatus — Fundação para a reconstrução

**Estado:** levantamento técnico inicial, somente leitura  
**Verificado em:** 17/11/2026, 13:30 BRT  
**Repositório:** Reekyi/UpStatus  
**Objetivo:** reconstruir a arquitetura sem perder funcionalidades, dados, histórico ou capacidade de rollback.

> Este documento registra o que foi observado nos refs e runtimes consultados. Não autoriza merge, deploy, migração, mudança de segredo, alteração de configuração de produção ou exclusão de funções.

## 1. Resumo executivo

O UpStatus não está concentrado em uma única versão coerente. Hoje existem três fontes que precisam ser reconciliadas antes de qualquer reconstrução:

1. **GitHub:** as linhas master, develop e team-lite-official evoluíram separadamente.
2. **Supabase:** o projeto de produção contém os runtimes ativos, várias gerações beta/teste e cópias de backup.
3. **Clientes instalados:** o userscript distribuído e o endpoint usado para API nem sempre são o mesmo runtime.

A arquitetura atual é funcionalmente rica, mas tecnicamente acoplada:

- userscript muito grande, em um único arquivo;
- backend Edge Function monolítico, com roteamento de vários domínios;
- userscript embutido dentro do código da Edge Function;
- portais de convidados parcialmente embutidos no backend;
- Normal e Team Lite compartilham infraestrutura e tópico Realtime;
- configuração de TEST usa o mesmo projeto Supabase da produção;
- histórico de migrações e arquivos-fonte não estão totalmente reconciliados.

**Conclusão deste levantamento:** ainda não existe uma base única e reproduzível que represente com segurança tudo o que está implantado. A reconstrução deve começar pela reconciliação de código e runtime, não por uma reescrita às cegas.

## 2. Referências Git verificadas

| Referência | Commit | Versão em release.json |
|---|---|---|
| master | 9d40461babcec8eb868c2a04be9c675df7da381 | 3.4.7 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | 3.0.40-beta.22 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | 3.0.40-beta.22 |

A comparação master...develop retornou **divergência**: develop está 114 commits à frente e 147 atrás de master, com ancestral comum em 80787eda3d96039191d921b6150b3e4ac84e6a52.

Não fazer merge, rebase ou cherry-pick amplo entre essas linhas. A diferença não é apenas de versão: há recursos e contratos diferentes em cada lado.

### PRs relevantes observadas

- [#74 — candidata Normal](https://github.com/Reekyi/UpStatus/pull/74): aberta, Draft, 90 arquivos alterados, baseada em um SHA anterior ao master atual. É uma linha candidata importante, mas não é produção.
- [#75 — baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75): aberta e Draft.
- [#76 — sinalização autenticada Team Lite](https://github.com/Reekyi/UpStatus/pull/76): aberta, Draft, 59 arquivos alterados, baseada em team-lite-official.
- [#161 — alinhamento do destino da API Normal](https://github.com/Reekyi/UpStatus/pull/161): candidata empilhada sobre #74.
- [#167 — anexos, autorização e metadados de atualização](https://github.com/Reekyi/UpStatus/pull/167): candidata baseada em master.
- [#171 — autorização administrativa Team Lite](https://github.com/Reekyi/UpStatus/pull/171): candidata isolada.
- [#174 e #175](https://github.com/Reekyi/UpStatus/pull/174): backports de upload e autorização para develop.
- [#176 — recuperação de SQL de migrações](https://github.com/Reekyi/UpStatus/pull/176): arquivos recuperados do ledger de produção, ainda Draft.
- [#177 — proposta de versão Normal 3.4.8](https://github.com/Reekyi/UpStatus/pull/177): proposta candidata, não publicada.
- [#80 e #82](https://github.com/Reekyi/UpStatus/pull/80): documentação de continuidade e prontidão.

As consultas de reviews feitas nesta auditoria retornaram **zero reviews submetidas** para #74, #76, #161, #167, #171, #174, #175, #176 e #177. Todas permanecem candidatas não integradas. Não tratar CI histórico como aprovação humana.

## 3. Arquitetura atual observada

### 3.1 Cliente Tampermonkey

O ponto de entrada principal é o userscript que injeta o UpStatus no Sale Smartly.

| Linha | Arquivo-fonte | Tamanho observado |
|---|---|---:|
| master | src/userscript/upstatus.user.template.js | 543.874 bytes / 4.406 linhas |
| develop | src/userscript/upstatus.user.template.js | 301.690 bytes / 3.423 linhas |

O arquivo é um grande script autocontido, com funções de:

- autenticação e sessão;
- presença e status;
- chat, histórico, leitura, digitação, reações, respostas e mídia;
- notificações e perfis;
- chamadas individuais;
- salas de voz e ciclo de vida WebRTC;
- compartilhamento de tela;
- controle remoto;
- adaptação da interface do Sale Smartly;
- fila de atendimentos e recursos visuais auxiliares.

O cabeçalho observado usa Supabase JS UMD por CDN e permissões Tampermonkey como GM_xmlhttpRequest, GM_getValue, GM_setValue e GM_openInTab. O cliente também depende de APIs e estruturas internas do Sale Smartly. Essa integração deve ser isolada em um adaptador próprio, pois mudanças no DOM ou no estado interno do Sale Smartly podem quebrar recursos que não têm relação com a lógica do UpStatus.

### 3.2 Backend Supabase

O backend principal está concentrado em src/server/index.template.ts e é compilado para Edge Functions.

| Linha | Arquivo-fonte | Tamanho observado |
|---|---|---:|
| master | src/server/index.template.ts | 102.752 bytes / 704 linhas |
| develop | src/server/index.template.ts | 99.101 bytes / 643 linhas |

O backend usa Supabase JS v2, Deno Edge Runtime, Node buffer e crypto. O código centraliza:

- autenticação, hash de senha e sessão;
- leitura de contas e papéis;
- presença e histórico;
- chat, leituras, digitação, reações, edição e exclusão;
- perfis e mídia;
- estado de controle remoto;
- rotas de Lucca e Ycaro;
- distribuição do userscript;
- resposta HTTP e CORS.

A maior parte desses domínios está no mesmo arquivo e no mesmo dispatcher HTTP. Isso dificulta testar, revisar e evoluir um domínio sem afetar os demais.

### 3.3 Portais de convidados

- Lucca possui frontend em lucca-site/index.html.
- Ycaro possui frontend em ycaro.html.
- A linha master lê ycaro.html durante o build e o incorpora ao backend como HTML embutido.
- A linha develop consultada não contém o mesmo conjunto de rotas Ycaro.

Os portais devem ser superfícies separadas, com autenticação e contratos próprios, sem compartilhar sessões de convidado por acidente. O histórico de chat compartilhado deve continuar preservado.

### 3.4 Build e artefatos

O build usa release.json, os templates de userscript/backend e, na linha master, ycaro.html. Ele gera:

- dist/upstatus.user.js;
- dist/upstatus-test.user.js;
- supabase/functions/upstatus;
- supabase/functions/upstatus-test.

O build remove e recria os diretórios gerados de funções e dist. Portanto, não deve ser executado em um checkout compartilhado que contenha alterações locais nesses diretórios. A reconstrução deve trabalhar em checkout/branch isolado e manter templates como fonte.

O validator chama o build antes de validar artefatos, versões, namespaces, URLs, tópicos, prefixos, sintaxe e contratos. Nesta auditoria não houve checkout local nem execução de build/validate.

## 4. Divergências concretas entre fonte e produção

### 4.1 Normal

Runtime ativo observado:

- função: upstatus;
- versão do deploy da Edge Function: 480;
- versão declarada no código e userscript embutido: 3.4.7;
- hash: bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.

O userscript servido por essa função anuncia updateURL/downloadURL em /upstatus/upstatus.user.js, mas o endpoint de API embutido no cliente aponta para:

**upstatus-screen-share-3-1-1-beta10**

Esse runtime legado está ativo na mesma conta, versão de aplicação 3.1.1-beta8, deploy interno v6.

Portanto, o Normal atual é um arranjo de dois runtimes: distribuição pelo upstatus e API pelo beta10. Não substituir apenas um lado.

### 4.2 Team Lite

Runtime ativo observado:

- função: upstatus-team-lite;
- versão do deploy da Edge Function: 15;
- versão declarada no código e userscript embutido: 3.4.30;
- hash: 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.

O cliente Team Lite usa a própria função upstatus-team-lite para API e usa a branch team-lite-official como origem de atualização do userscript.

O backend Team Lite não é apenas uma cópia binária do Normal. As diferenças verificadas incluem:

- limite mínimo de senha diferente;
- allowlist de membros oficiais;
- limite de histórico para convidados a partir do momento de entrada;
- tratamento compatível com o fluxo legado de avatar;
- limite de tamanho de mídia diferente;
- marcador de rota próprio.

Essas diferenças devem ser preservadas explicitamente como política de produto, e não apagadas durante a extração de um núcleo compartilhado.

### 4.3 TEST e funções antigas

Também estão ativos no projeto de produção:

- upstatus-test: deploy interno v281, código 3.3.28;
- upstatus-screen-share-3-1-1-beta10: deploy interno v6, código 3.1.1-beta8.

O inventário do projeto retornou **38 Edge Functions ativas**:

| Grupo | Quantidade |
|---|---:|
| Funções oficiais Normal e Team Lite | 2 |
| Funções de TEST e variações históricas | 12 |
| Funções beta de screen share | 13 |
| Backups nomeados | 11 |
| Total | 38 |

Nenhuma função antiga deve ser excluída apenas pelo nome. Primeiro é necessário descobrir quem ainda chama cada endpoint, quais versões de clientes dependem deles e quais cópias são necessárias para rollback.

### 4.4 Templates não reproduzem integralmente os runtimes

Foram encontradas diferenças relevantes:

- O runtime Normal implantado contém signedUploadRoute; o template master consultado não contém essa função.
- O template develop contém signedUploadRoute, mas não contém as rotas e o portal Ycaro que aparecem no runtime Normal.
- Os runtimes implantados usam USERSCRIPT_BASE64; os templates consultados usam USERSCRIPT_HEX.
- master e develop geram tópicos Realtime, prefixos de armazenamento e destinos de API diferentes.
- O script Normal implantado aponta a API para beta10, embora a distribuição seja servida por upstatus.
- O userscript Team Lite e o Normal implantados usam o mesmo tópico Realtime, apesar de possuírem prefixos de armazenamento diferentes.

Isso prova que nenhum dos dois templates, isoladamente, é hoje uma representação completa e reproduzível de todos os recursos implantados.

## 5. Modelo de dados e infraestrutura observados

### 5.1 Tabelas públicas

O projeto de produção contém dez tabelas de aplicação no schema public:

| Tabela | Responsabilidade aparente |
|---|---|
| users | contas, papéis, senha e presença |
| upstatus_sessions | sessões com token armazenado por hash |
| status_history | histórico de status |
| upstatus_state | estado compartilhado e controle remoto |
| messages | histórico de chat |
| chat_reads | estado de leitura |
| reactions | reações |
| upstatus_typing | presença de digitação |
| upstatus_profiles | avatares e perfil |
| upstatus_visual_config | configuração visual publicada |

RLS está habilitado nas dez tabelas, mas a auditoria do Supabase encontrou zero policies nessas tabelas. A consulta de grants também encontrou permissões amplas para anon e authenticated em nove tabelas, incluindo 18 concessões de TRUNCATE no total. Há seis entradas de default ACL no schema public.

Isso é um alerta estrutural, não uma conclusão automática de que qualquer usuário consegue ler ou escrever linhas. O backend usa uma chave privilegiada e o comportamento efetivo depende de RLS, grants, funções e caminhos de acesso. A reconstrução precisa definir acesso mínimo por domínio e provar cada fluxo em ambiente isolado.

### 5.2 Realtime

A tabela realtime.messages tinha 106 registros na consulta e todos estavam com private=false. Não foram encontradas policies de acesso à tabela.

Três funções public SECURITY DEFINER foram identificadas:

- upstatus_broadcast_messages;
- upstatus_broadcast_users;
- upstatus_broadcast_remote_state.

As três podem ser executadas por anon e authenticated e usam search_path=public. O Security Advisor mantém alertas para essas permissões.

Os scripts Normal e Team Lite implantados usam o mesmo tópico de broadcast: upstatus-screen-share-live-3-1-1-beta10. Isso significa que a separação de prefixos de localStorage não equivale a isolamento de Realtime.

### 5.3 Storage

Buckets observados:

- chat-images: público;
- profile-images: público.

A consulta retornou 188 objetos e zero Storage policies. Os buckets têm limites e allowlists de MIME configurados.

A arquitetura futura deve usar uploads assinados e validar origem, bucket, caminho, token, MIME e tamanho no servidor. A política de leitura pública ou privada deve ser decidida com base no uso real dos links já persistidos, sem quebrar imagens e anexos antigos.

### 5.4 Migrações

O ledger de produção contém sete migrações:

- 20261005160000 — upstatus_cloud;
- 20261005173000 — remote_realtime;
- 20261005180000 — client_presence;
- 20261023154754 — create_upstatus_visual_config;
- 20261026195855 — add_chat_message_file_name;
- 20261027154329 — allow_chat_document_mime_types;
- 20261027155438 — set_upstatus_upload_limits_20mb.

Os quatro últimos arquivos originais não foram encontrados nas linhas de repositório consultadas. A PR #176 recupera o texto de statements do ledger, mas isso não recupera comentários, formatação nem o blob original do Git. Ela continua Draft.

A branch gerenciada main do Supabase está em MIGRATIONS_FAILED; o preview aparece ACTIVE_HEALTHY. Não executar reset, rebase, migration ou merge para tentar corrigir isso sem um plano específico de backup, proveniência e rollback.

## 6. Ambientes e publicação

Existem dois projetos Supabase:

| Projeto | ID | Estado observado | Uso |
|---|---|---|---|
| UpStatus | dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | produção |
| upstatus-security-test | bfpjtfqlnypisxljoxkb | INACTIVE | laboratório isolado |

O projeto de laboratório não é um ambiente Full-Product TEST e estava INACTIVE na consulta desta auditoria. Um checkpoint anterior registrou bloqueio por quota de invocações Edge; a causa e a possibilidade de reativação precisam ser verificadas pelo proprietário antes de depender dele para testes integrados.

Os scripts build consultados usam o mesmo project ref de produção para os artefatos PROD e TEST. Há identificadores separados para alguns tópicos e prefixos, mas isso não cria isolamento de projeto, dados, segredos ou permissões.

Workflows observados:

- master deploy-production.yml é manual e bloqueia deploy fora da versão estável 3.4.7, mas usa o segredo genérico SUPABASE_PROJECT_ID.
- develop deploy-test.yml também usa SUPABASE_PROJECT_ID e possui gatilho automático por push.
- team-lite-official deploy-production.yml é manual, mas o comando observado publica a função upstatus, não upstatus-team-lite.
- Os workflows usam Supabase CLI latest, em vez de uma versão fixa.

Nenhum workflow foi executado nesta auditoria. Nenhuma função, segredo ou configuração foi alterada.

## 7. Arquitetura-alvo proposta

A proposta é separar o núcleo compartilhado das variações Normal e Team Lite, sem perder a capacidade de gerar um único userscript instalável e uma Edge Function implantável.

### 7.1 Organização lógica

**Cliente**

- bootstrap e adaptador Sale Smartly;
- autenticação e sessão;
- presença e status;
- chat, leituras, reações e notificações;
- mídia e perfis;
- chamadas individuais;
- salas de voz;
- WebRTC e compartilhamento de tela;
- controle remoto;
- atualização e compatibilidade de versão.

**Backend**

- router HTTP fino;
- módulo de autenticação e sessão;
- módulo de presença e histórico;
- módulo de chat;
- módulo de mídia e Storage;
- módulo de chamadas e sinalização;
- módulo de controle remoto;
- módulo de convidados;
- contratos e validações compartilhados.

**Portais**

- Lucca e Ycaro como aplicações separadas;
- autenticação de convidado isolada;
- contratos explícitos com o backend;
- sem exclusão automática de histórico compartilhado ao entrar, sair ou expirar sessão.

**Infraestrutura**

- configuração por ambiente em um único manifesto tipado;
- projeto, função, tópico Realtime, prefixos de Storage, namespace de cliente e URL de atualização definidos por ambiente;
- secrets somente no ambiente de execução;
- migrations versionadas e testadas;
- workflows de produção e TEST separados.

### 7.2 Variações de produto

Normal e Team Lite devem compartilhar módulos de domínio, contratos e testes, mas receber configuração e políticas explícitas:

- função de API própria;
- canal Realtime próprio;
- prefixos de armazenamento próprios;
- canal de atualização próprio;
- regras de roster e convidados próprias;
- limites de mídia e senha explícitos;
- testes de compatibilidade entre versões.

Não reutilizar o mesmo tópico público como mecanismo de isolamento. Não confiar em nomes de exibição para conceder papel administrativo. O servidor deve validar o papel persistido e a identidade em toda ação privilegiada.

## 8. Sequência segura de reconstrução

### Etapa A — Reconciliação e preservação

1. Capturar os fontes completos dos quatro runtimes usados ou ainda referenciados: upstatus, upstatus-team-lite, beta10 e upstatus-test.
2. Decodificar os userscripts embutidos e registrar SHA-256 dos arquivos extraídos.
3. Comparar cada runtime com todos os templates e branches candidatos.
4. Mapear consumidores, URLs de atualização, endpoints de API, tópicos, storage keys e segredos necessários.
5. Manter backups e funções antigas até provar que nenhum cliente depende delas.

**Saída:** inventário de proveniência e mapa de dependências runtime → cliente → banco.

### Etapa B — Ambiente isolado

1. Resolver o estado do laboratório atual.
2. Obter um ambiente Full-Product TEST separado da produção.
3. Garantir dados fictícios, segredos próprios, função própria, tópicos próprios e buckets próprios.
4. Impedir que o build TEST use qualquer identificador de produção.
5. Executar contratos e integração sem tocar em dados reais.

**Saída:** ambiente em que seja possível testar login, presença, chat, upload, chamadas e convidados de ponta a ponta.

### Etapa C — Fundação modular

1. Escolher uma base de código somente depois da reconciliação da Etapa A.
2. Extrair contratos e validações compartilhados.
3. Modularizar o backend por domínio mantendo os endpoints atuais como camada de compatibilidade.
4. Modularizar o userscript sem alterar o comportamento visível em cada extração.
5. Separar adaptadores Normal e Team Lite.
6. Manter build reproduzível que gere os mesmos artefatos a partir dos fontes versionados.

**Saída:** núcleo compartilhado, módulos testáveis e variantes explícitas.

### Etapa D — Banco e segurança

1. Recuperar proveniência de todas as migrações.
2. Criar matriz de acesso por tabela, função, Storage e canal Realtime.
3. Definir policies RLS e grants mínimos.
4. Revisar SECURITY DEFINER, search_path e EXECUTE.
5. Projetar migrações reversíveis e testar restauração.
6. Migrar dados somente após teste isolado e plano de rollback.

**Saída:** modelo de dados reproduzível e permissões justificadas.

### Etapa E — Validação funcional

1. Testes unitários e de contrato offline.
2. Integração autenticada no Full-Product TEST.
3. Testes de Storage com bytes reais, não apenas mocks.
4. E2E de chat, presença, voz, chamadas, screen share e convidados.
5. Compatibilidade Normal ↔ Team Lite.
6. Teste manual de reconexão sem F5, microfone e captura de tela.

**Saída:** evidência por feature e por ambiente, com limites claros do que não foi testado.

### Etapa F — Corte controlado

1. PRs pequenos e revisados.
2. Versões novas, sem publicar código alterado sob versão antiga.
3. Deploy de backend e distribuição em ordem coordenada.
4. Feature flags fechadas por padrão.
5. Rollback testado e documentado.
6. Produção somente após aprovação humana explícita.

**Saída:** migração controlada, sem substituição abrupta do runtime atual.

## 9. Bloqueios e decisões futuras

| Item | Estado | Dependência |
|---|---|---|
| Fonte única que reproduz produção | BLOCKED | concluir extração e comparação dos runtimes |
| Full-Product TEST | BLOCKED | laboratório está INACTIVE; precisa de ambiente separado e operacional |
| Migrações originais | PARTIAL | PR #176 contém recuperação do ledger, não os originais byte a byte |
| Realtime e ACL | BLOCKED | revisar permissões, broadcasts e isolamento |
| AUTH-03 e papel administrativo | IN PROGRESS | candidatos existem, runtimes implantados ainda precisam de correção coordenada |
| Reconexão de voz sem F5 | PENDING | issue #78 permanece aberta, 0/8 critérios físicos |
| Revisão humana | PENDING | PRs relevantes sem reviews submetidas |
| Publicação | NOT AUTHORIZED | exige aprovação explícita do proprietário |

## 10. Critérios para declarar a fundação pronta

A etapa de reestruturação só deve ser encerrada quando todos os pontos abaixo tiverem evidência:

- [ ] Cada runtime ativo e legado relevante tem fonte extraída, hash e consumidores conhecidos.
- [ ] Normal e Team Lite têm inventário funcional completo e diferenças documentadas.
- [ ] A arquitetura-alvo está dividida em módulos, contratos, ambientes e responsabilidades.
- [ ] A estratégia de banco, RLS, Realtime e Storage tem plano de migração e rollback.
- [ ] Existe Full-Product TEST isolado e operacional.
- [ ] O build reproduz artefatos e não mistura identificadores de produção e teste.
- [ ] Os testes necessários estão definidos, executáveis e associados a cada domínio.
- [ ] Os riscos de corte e as dependências manuais estão explicitados.
- [ ] O próximo passo pode começar sem adivinhar qual código é o oficial.

**Estado atual: fundação em andamento.** Este documento é um mapa inicial, não uma declaração de prontidão. As principais pendências são a reconciliação exata dos runtimes, a restauração de um ambiente Full-Product TEST e a definição do plano de migração do banco.

## 11. Integridade desta auditoria

- Consultas GitHub e Supabase somente leitura.
- Nenhum deploy, merge, migration, alteração de secrets, flags, policies, grants ou dados.
- Nenhuma Edge Function foi substituída ou excluída.
- Nenhum teste local foi executado nesta etapa.
- Resultados de CI citados em PRs são evidências históricas dos respectivos commits, não testes executados nesta auditoria.
- Produção permanece intocada.


## Addendum — descoberta de isolamento do cliente TEST (2026-11-17 13:35 BRT)

Foi feita uma decodificação dos userscripts embutidos nos quatro runtimes. O resultado deixa o problema de isolamento mais concreto:

| Função que serve o script | Versão do script | updateURL | API usada pelo cliente | Tópico Realtime | Prefixo local |
|---|---|---|---|---|---|
| upstatus | 3.4.7 | upstatus | beta10 | upstatus-screen-share-live-3-1-1-beta10 | upstatus_screen_share_beta8_ |
| upstatus-test | 3.3.28 | upstatus-test | beta10 | upstatus-screen-share-live-3-1-1-beta10 | upstatus_screen_share_beta8_ |
| upstatus-team-lite | 3.4.30 | team-lite-official | upstatus-team-lite | upstatus-screen-share-live-3-1-1-beta10 | upstatus_team_lite_ |
| upstatus-screen-share-3-1-1-beta10 | 3.1.1-beta8 | beta8 | beta8 | upstatus-screen-share-live-3-1-1-beta8 | upstatus_screen_share_beta8_ |

O ponto mais importante: o userscript servido por upstatus-test não usa a própria função upstatus-test para API. Ele chama beta10, usa o mesmo tópico Realtime do Normal e usa o mesmo prefixo local do Normal. Como a função upstatus-test também está hospedada no projeto de produção, ela não representa um ambiente isolado de teste.

Também existe uma diferença entre o nome do runtime beta10 e o conteúdo que ele próprio distribui: a função implantada tem slug beta10, mas seu userscript embutido é beta8 e aponta update/API para a função beta8.

**Impacto:** não considerar o TEST atual seguro para validação com dados reais. A próxima arquitetura deve impor isolamento de projeto, endpoint, tópico, storage e namespace, e deve validar esses valores automaticamente no build e no CI.

Esse addendum é uma descoberta de configuração e proveniência, não uma mudança de runtime. Nenhuma função foi modificada.


### Addendum — Team Lite também não tem a versão implantada representada na branch oficial

A branch team-lite-official foi verificada diretamente em 9065bc1536fde64f437f6f12b7abb9b072cb8281 e seu release.json declara 3.0.40-beta.22. O runtime implantado upstatus-team-lite declara 3.4.30.

A PR #76 é baseada exatamente nessa branch e continua Draft. Portanto, ela é uma candidata de transporte/sinalização, não uma cópia da versão Team Lite 3.4.30 atualmente implantada. Não usar essa PR como substituição direta do runtime atual sem reconciliar as funcionalidades e as diferenças de backend/clientes.
