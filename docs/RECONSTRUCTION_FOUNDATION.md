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
- Os runtimes Normal 3.4.7, Team Lite 3.4.30 e TEST 3.3.28 consultados usam USERSCRIPT_BASE64. A família legada screen-share, as variações TEST 3.0.50–3.0.52 e os backups com fonte recuperável usam USERSCRIPT_HEX. Portanto, o encoding varia por geração/família e não deve ser presumido globalmente; a fonte retornada para upstatus-backup-327-pre328 veio vazia e permanece sem classificação.
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

- função de API própria ou contrato de roteamento compartilhado explicitamente versionado;
- namespace Tampermonkey e prefixo de armazenamento próprios;
- canal de atualização próprio;
- regras de roster e convidados próprias;
- limites de mídia e senha explícitos;
- testes de compatibilidade entre versões.

**Realtime deve ser isolado por ambiente, não necessariamente por produto.** A leitura das candidatas #161 e #76 mostrou que Normal e Team Lite apontam intencionalmente para o mesmo tópico de produção `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, que também é o tópico dos triggers do banco. As duas variantes compartilham recursos de voz e aliases de sala. Separar os tópicos por produto sem um contrato de bridge poderia quebrar a interoperabilidade Normal ↔ Team Lite.

A regra segura é: PROD e TEST nunca compartilham projeto, tópico, bucket, secrets ou namespace; dentro de PROD, um tópico pode ser compartilhado pelos dois produtos quando o evento e o fluxo forem comuns. Esse canal público deve transportar apenas avisos mínimos, nunca conteúdo de chat, comandos privilegiados ou estado sensível. Sinalização de voz/tela deve usar transporte autenticado server-mediated quando a migração candidata estiver validada.

Não reutilizar um tópico público como mecanismo de isolamento entre ambientes. Não confiar em nomes de exibição para conceder papel administrativo. O servidor deve validar o papel persistido e a identidade em toda ação privilegiada.

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
3. Garantir dados fictícios, segredos próprios, funções próprias, tópicos/buckets próprios do ambiente; Normal e Team Lite podem compartilhar o tópico PROD se o contrato cross-product exigir.
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


## Addendum — split-brain de tópicos Realtime (2026-11-17 13:40 BRT)

A inspeção dos triggers ativos e dos canais inscritos pelos userscripts revelou três tópicos diferentes:

| Origem | Tópico |
|---|---|
| Triggers do banco em production (messages, users, upstatus_state) | upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0 |
| Userscripts Normal 3.4.7, Team Lite 3.4.30 e TEST 3.3.28 | upstatus-screen-share-live-3-1-1-beta10 |
| Userscript embutido no runtime beta10 (na realidade, script beta8) | upstatus-screen-share-live-3-1-1-beta8 |

O build de develop usa o tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, que coincide com os triggers do banco, mas não com os userscripts atualmente distribuídos. O build de master usa o tópico beta10, que coincide com os clientes atuais, mas não com os triggers observados.

Os triggers ativos publicam:
- messages: evento db_change com o registro OLD/NEW completo;
- users: evento user_status com campos de presença;
- upstatus_state: eventos remote_command e remote_result.

Os clientes atuais escutam esses eventos no canal beta10. Os eventos enviados diretamente pelo cliente no mesmo canal (por exemplo, call_signal, voice_room_signal, screen-share e chat_presence) são um fluxo diferente e não corrigem o destino dos broadcasts emitidos pelos triggers.

**Conclusão técnica:** existe um split-brain entre a configuração Realtime do banco e a configuração Realtime dos clientes. Isso pode explicar atualizações que dependem de broadcast do banco não chegarem em tempo real, mas o impacto funcional ainda precisa ser confirmado com testes isolados. Também é necessário revisar a exposição do evento db_change, pois ele envia o registro completo em um broadcast configurado como público.

Não trocar o tópico em produção como correção imediata. A próxima etapa deve definir uma matriz de eventos e canais por ambiente/produto e validar os consumidores antes de alterar qualquer identificador.


## Addendum — build e validator de master se contradizem

A leitura direta dos scripts confirmou uma contradição reproduzível por inspeção:

- master/scripts/build.mjs define o destino de API/atualização do cliente Normal como upstatus-screen-share-3-1-1-beta10.
- master/scripts/validate.mjs exige que o updateURL do artefato Normal contenha /upstatus/upstatus.user.js.

Assim, o build master produz uma URL que o próprio validator rejeita. O checkpoint de QA da PR #82 já registrou a falha "production updateURL mismatch" no gate herdado. Não foi executado um novo build nesta auditoria.

Além disso, master e develop mantêm apenas três arquivos em supabase/migrations, enquanto o ledger de produção tem sete entradas. A PR #176 propõe adicionar os quatro SQL ausentes, recuperados dos statements do ledger. Isso é recuperação de conteúdo, não prova de que os arquivos originais foram restaurados exatamente.


## Addendum — trabalho candidato existente que deve ser preservado e revisado

A branch chore/continuity-foundation contém uma quantidade relevante de trabalho ainda não integrado:

- 25 scripts de teste/execução, contra apenas 3 scripts em master e 2 em develop;
- módulo separado src/userscript/signaling-transport.mjs, com endpoints autenticados para criar/abrir/fechar salas, preparar chamadas, membros, convites, resolução e saída;
- função isolada upstatus-signal-test, com módulos separados para leitura de corpo e validação de envelopes legados;
- guard de mutação que só permite o projeto de sinalização bfpjtfqlnypisxljoxkb e exige UPSTATUS_SIGNAL_ALLOW_MUTATION=1, service key e preflight;
- guard do build que rejeita o projeto de produção e o projeto isolado de sinalização como destino do Full-Product TEST;
- validações de reconexão, recuperação de chamadas/salas, upload assinado, autenticação, rate limit, receipts e atualização Team Lite;
- 25 migrations candidatas, incluindo revogação de grants, restrição de execução de funções de trigger, sinalização server-mediated, receipts atômicos, salas/attempts, setup invites, minimização de broadcasts públicos e search_path seguro.

Isso é uma base importante para reaproveitar, mas não é a reconstrução completa do sistema. O backend ainda é um único template monolítico de aproximadamente 807 linhas e o userscript continua sendo um bundle grande. A extração de signaling é uma vertical slice, não uma separação completa dos domínios.

A função upstatus-signal-test e seu projeto isolado são voltados a testes de sinalização/autenticação. O próprio guard do build impede usar esse projeto como Full-Product TEST. Como o projeto está INACTIVE, a smoke test autenticada também depende de recuperar esse laboratório.

As migrations candidatas não estão no ledger de produção consultado. Não aplicar nenhuma delas em produção sem revisão individual, proveniência, ambiente ativo, backup e rollback. O objetivo é reaproveitar o trabalho comprovadamente bom, não importar o branch inteiro em bloco.


### TEST também colide na identidade Tampermonkey

O script servido por upstatus-test declara o mesmo @name ("UpStatus - Sale Smartly") e @namespace ("upseller") do Normal 3.4.7. Os dois têm updateURL diferente, mas a identidade do userscript não está separada. Isso cria risco de confusão/atualização do artefato errado quando os dois forem instalados ou administrados no mesmo navegador.

Os build scripts master e develop consultados geram namespace upseller-test para TEST, mas o artefato implantado 3.3.28 usa upseller. É mais uma prova de que o TEST implantado não corresponde aos artefatos esperados pelos templates atuais.


## Addendum — confirmação direta dos runtimes e ACLs (2026-11-17 14:35 BRT)

Esta rodada consultou novamente os fontes completos das quatro Edge Functions diretamente no projeto Supabase e decodificou os userscripts embutidos. Também repetiu a auditoria de ACLs e conferiu os quatro SQL recuperados pela PR #176 contra os statements do ledger.

### Matriz de runtime confirmada

| Função que distribui | Script embutido | API usada | Realtime | Identidade Tampermonkey |
|---|---|---|---|---|
| upstatus v480 | Normal 3.4.7 | upstatus-screen-share-3-1-1-beta10 | beta10 | `UpStatus - Sale Smartly` / `upseller` |
| upstatus-test v281 | TEST 3.3.28 | upstatus-screen-share-3-1-1-beta10 | beta10 | **igual ao Normal**: `UpStatus - Sale Smartly` / `upseller` |
| upstatus-team-lite v15 | Team Lite 3.4.30 | upstatus-team-lite | beta10 | `UpStatus Team Lite - Sale Smartly` / `upseller-team-lite` |
| beta10 v6 | script 3.1.1-beta8 | beta8 | beta8 | `UpStatus Screen Share Beta 3.1.1-beta8` / `upseller-screen-share-beta8` |

O Normal e o TEST usam prefixo local `upstatus_screen_share_beta8_`; Team Lite usa `upstatus_team_lite_`. O cabeçalho do Normal aponta update/download para `upstatus`, enquanto o TEST aponta para `upstatus-test`. Isso confirma que a identidade e o backend usados pelo TEST não estão isolados, mesmo que o endpoint de distribuição seja diferente.

A função beta10 contém um script beta8 que aponta seu próprio update/API para o slug beta8. Portanto, o nome do endpoint não identifica de forma confiável a versão do cliente nele embutida.

### ACLs: confirmação e limites da conclusão

Consulta direta ao catálogo PostgreSQL confirmou:

- 10/10 tabelas `public` estão com RLS habilitado e 0 policies existem em `public`, `realtime` e `storage`.
- 9/10 tabelas `public` concedem a `anon` e `authenticated` os privilégios SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE. A exceção é `upstatus_visual_config`, cuja migração recuperada revoga os privilégios dessas duas roles.
- Existem 6 entradas de default ACL no schema `public`: para objetos futuros de owners `postgres` e `supabase_admin`, as roles `anon`, `authenticated` e `service_role` recebem privilégios amplos em tabelas, funções e sequências.
- As três funções `upstatus_broadcast_*` são `SECURITY DEFINER`, têm `search_path=public` e grants EXECUTE para PUBLIC, anon e authenticated. O Security Advisor registra alertas para anon e authenticated.
- Os dois buckets Storage observados são públicos e não há policies no schema Storage. O projeto mantém também grants amplos em objetos Storage; leitura pública dos buckets e autorização de escrita precisam ser tratadas separadamente.

RLS sem policies normalmente bloqueia operações de linha via roles comuns, portanto os grants não provam, por si só, leitura/escrita irrestrita das linhas. Porém TRUNCATE não é filtrado por RLS, default privileges amplos afetam objetos futuros e as funções SECURITY DEFINER expostas exigem revisão. Não foi executado teste de exploração nem alterado qualquer grant/policy.

Os triggers atuais continuam enviando o registro completo de `messages` no evento público `db_change`, para `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Como os clientes atuais escutam beta10, existe simultaneamente uma divergência de destino e um risco de exposição de payload que deve ser resolvido na matriz de eventos/canais, não com uma troca improvisada em produção.

### Proveniência das migrações recuperadas

A consulta ao ledger retornou uma única statement para cada uma das quatro migrações ausentes. Os quatro arquivos da PR #176 foram comparados com os respectivos statements recuperados: os comandos SQL correspondem ao conteúdo do ledger. Isso valida a recuperação do texto executado, mas não recupera os blobs Git originais, comentários ou formatação anterior. A PR #176 continua Draft e não deve ser aplicada novamente em produção.

### Estado dos ambientes

A consulta atual confirma que a branch gerenciada `main` do projeto de produção está em `MIGRATIONS_FAILED`, embora o preview associado apareça `ACTIVE_HEALTHY`. O projeto isolado `upstatus-security-test` segue `INACTIVE`. Nenhum dos dois é, neste momento, um Full-Product TEST validado e operacional.

### Resultado desta rodada

- Leitura direta dos quatro runtimes e decodificação dos scripts embutidos concluídas.
- ACLs, policies, funções SECURITY DEFINER e default privileges rechecados.
- Texto das quatro migrações recuperadas confrontado com o ledger.
- Nenhum teste local, browser E2E, migration, deploy, alteração de segredo, grant, policy, dado ou função executado.

**Próximo passo:** fechar a matriz de proveniência dos runtimes (incluindo SHA dos scripts extraídos e comparação de consumidores/rotas com os templates Git) e desenhar um contrato de Full-Product TEST que não dependa do projeto de produção nem do laboratório de sinalização. A fundação permanece em andamento.


## Addendum — candidatos de código e paridade de rotas (2026-11-17 14:45 BRT)

A reconciliação foi ampliada para as branches candidatas de Normal e Team Lite. O objetivo aqui foi descobrir se existe trabalho versionado que cubra os contratos atualmente implantados, sem assumir que uma PR Draft pode substituir produção.

### Normal: PRs #74 e #161

A branch `chore/continuity-foundation` (PR #74, base master) contém templates maiores e mais recentes que o master atual:

- backend: 807 linhas, com signed upload, rotas Lucca/Ycaro e setup invite;
- userscript: 5.562 linhas, com adaptadores de ambiente e mais permissões Tampermonkey;
- build guard para exigir um projeto TEST separado e rejeitar produção e o laboratório de sinalização como destino Full-Product TEST;
- suíte extensa de testes unitários, contratos e integração autenticada/browser.

A comparação de rotas literais entre o backend candidato e o Normal implantado encontrou todas as 34 rotas observadas na produção, mais `/api/setup-invite`. Isso é paridade de nomes de rotas, não prova de equivalência semântica.

A PR #161, empilhada sobre #74, corrige um ponto importante do build: troca o destino de API Normal de beta10 para a própria função `upstatus`. Também adiciona validações que exigem que API, updateURL e workflow de deploy apontem para a mesma função e rejeitam o endpoint beta10 no artefato Normal. A PR inclui ainda rate limit distribuído para emissão de setup invites.

**Leitura:** #74/#161 são a melhor linha candidata Normal encontrada até agora para recuperar fonte versionada e reduzir o acoplamento beta10. Ambas continuam Draft e não foram integradas nem implantadas. A mudança de API para `upstatus` precisa passar por Full-Product TEST, pois o Normal em produção hoje ainda chama beta10.

### Team Lite: PR #76

A branch `team-lite/signaling-transport-candidate` (PR #76, base `team-lite-official`) contém:

- backend próprio `src/server/team-lite-index.template.ts` (814 linhas);
- userscript Team Lite 3.4.31;
- manifesto separado `team-lite/release.json` com `buildVersion=3.4.31`;
- configuração do cliente para chamar `upstatus-team-lite` e escutar o tópico do banco `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

A comparação encontrou todas as 34 rotas observadas no backend Team Lite implantado, mais `/api/setup-invite`. Novamente, isso confirma cobertura nominal, não equivalência completa de lógica.

A PR #76 é um candidato melhor que a branch `team-lite-official` isolada para reconstruir a origem do backend Team Lite: a branch oficial contém o script 3.4.30, mas não o template de backend correspondente. A PR traz uma versão 3.4.31 e um backend versionado próprio.

**Gap de ambiente:** o build candidato gera `upstatus`, `upstatus-test` e `upstatus-team-lite`, mas não gera uma função Team Lite TEST nem um userscript Team Lite com projeto, tópico, prefixo e namespace próprios de TEST. Portanto, ainda não permite validar os dois produtos de ponta a ponta em isolamento.

O updateURL do script candidato aponta para `team-lite-official`; isso só é seguro para distribuição depois que o conteúdo 3.4.31 correspondente estiver publicado nesse canal, ou quando o destino de atualização for explicitamente versionado.

### Consequência para a arquitetura-alvo

Há duas bases candidatas que devem ser preservadas e comparadas por domínio, em vez de tentar fazer merge amplo entre master, develop e Team Lite:

1. Normal: #74/#161, com API alinhada ao `upstatus` e teste Full-Product guardado por projeto separado.
2. Team Lite: #76, com backend próprio e release 3.4.31, mas ainda sem variante Full-Product TEST.

A próxima decisão técnica não é escolher uma branch inteira como “a nova produção”. É criar uma matriz de capacidades e dependências entre runtime 3.4.7, runtime 3.4.30, Normal #74/#161 e Team Lite #76, e só então definir a composição modular comum e as diferenças de produto.

Nenhuma dessas PRs foi mesclada. Nenhum workflow foi disparado. Nenhum build, teste local, deploy ou migration foi executado nesta rodada.


## Addendum — inventário das migrações candidatas e preflight (2026-11-17 15:00 BRT)

Foi feita uma leitura estática das 23 migrações de aplicação presentes na linha candidata Normal #74/#161. Nenhuma foi aplicada nesta rodada.

### Grupos funcionais

| Grupo | Migrações/objetos principais | Dependência de rollout |
|---|---|---|
| ACL e hardening | revogar EXECUTE dos broadcasts, grants desnecessários nas tabelas públicas, defaults de privilégios, search_path vazio | revisar permissões atuais e tratar também defaults do owner `supabase_admin` |
| Realtime seguro | reduzir `db_change` a um aviso sem payload e reduzir broadcasts de presença/controle remoto | cliente correspondente deve refazer leitura pelo backend autenticado antes de reduzir o payload |
| Sinalização server-mediated | rooms, memberships, events, bindings e RPCs de abrir/sair | depende de identidade única em `users.name`; substitui parte do transporte Realtime por fila autenticada |
| Chamadas e voz resilientes | call attempts, voice attempts, índices, singleton por conta e cancelamento durável | aplicar em ordem; as duas últimas migrações substituem a mesma função de abertura de voice attempt |
| Chat | RPC `merge_chat_read_receipts` monotônica e atômica | backend candidato precisa chamar a RPC; grant previsto somente para service_role |
| Primeiro acesso | colunas de setup invite, consumo atômico, preservação/normalização de role e rate limit distribuído | backend e banco devem ser publicados juntos; a PR #161 usa a função de rate limit |

### Preflight de identidade no banco atual

A migração de sinalização cria um índice único em `public.users(name)` e aborta se houver nomes nulos ou duplicados. Consulta agregada de produção encontrou:

- 5 registros em `users`;
- 0 nomes nulos;
- 0 nomes vazios;
- 0 grupos duplicados;
- índice `users_name_unique` ainda ausente.

O preflight de dados atual não aponta bloqueio para esse índice, mas deve ser repetido no Full-Product TEST e imediatamente antes de qualquer migração aprovada.

### Confirmação de que as migrações candidatas não estão na produção

Consulta direta ao catálogo confirmou que as tabelas de sinalização, bindings, call attempts, voice attempts e rate limits ainda não existem no projeto de produção. As RPCs candidatas de receipts, sala de voz, setup invite e rate limit também não existem. O ledger não contém migrações a partir de `20261029170500`.

Isso confirma que a PR #74/#161 representa uma mudança de arquitetura de banco ainda não aplicada, não uma simples restauração de SQL já executado. Não importar a sequência inteira sem testar dependências e comportamento.

### Lacuna de segurança que continua aberta

A migração candidata `20261105150000_revoke_public_default_privileges_postgres.sql` remove defaults do owner `postgres`, mas declara explicitamente que não altera os defaults de `supabase_admin`. A auditoria atual encontrou ACLs padrão amplas para ambos os owners no schema `public`. Portanto, mesmo que essa migração seja aplicada corretamente, os defaults de `supabase_admin` continuam exigindo um plano separado e suportado. Não considerar o hardening de defaults concluído apenas com essa migration.

### Cuidados de sequência

- As migrations de minimização de broadcast têm comentário explícito exigindo deploy coordenado com clientes que tratem eventos como avisos e consultem o backend autenticado.
- `20261105190000_open_voice_room_membership` depende das tabelas `upstatus_signal_rooms`, `upstatus_signal_room_members` e `upstatus_signal_room_bindings`.
- `20261108010000_voice_attempt_singleton` e `20261108050751_voice_attempt_account_scoped_lock` substituem a mesma RPC em sequência; não reordenar nem aplicar apenas a primeira como estado final.
- O setup invite é um conjunto: colunas/constraint/índice, RPC de consumo, ajustes de role e rate limit. A API candidata #161 já espera o RPC de rate limit.

Nenhuma migração foi aplicada, nenhum grant foi revogado e nenhuma policy/função de produção foi alterada. A próxima etapa é transformar este inventário em um grafo de dependências com preflight e rollback por migração, e validar a sequência em Full-Product TEST isolado.


## Addendum — evidências de CI e bloqueio do laboratório (2026-11-17 15:15 BRT)

Foram consultados os resultados de GitHub Actions associados aos SHAs atuais das PRs candidatas, incluindo jobs e logs das falhas.

| PR | Workflow | Resultado | Interpretação |
|---|---|---|---|
| #74 | UpStatus Validate + UpStatus Signaling Smoke Tests | success / success | evidência histórica de validação da linha Normal candidata |
| #161 | UpStatus Validate + UpStatus Signaling Smoke Tests | success / success | validação mais recente da linha Normal candidata; inclui integração autenticada e navegador real |
| #76 | Team Lite Candidate Checks | failure | os testes estáticos e contratos iniciais passaram; o smoke endpoint falhou porque o projeto isolado respondeu HTTP 402 por quota de invocações Edge excedida; os testes seguintes foram ignorados |
| #178 | UpStatus Validate | failure | a validação herdada de develop falhou em client signed upload helper missing; PR #178 altera apenas documentação, portanto a falha está na base develop e não no conteúdo documental |

O log bem-sucedido de #161 registra 136/136 verificações de integração autenticada, negociação WebRTC de áudio e vídeo em navegador real, convites e malha de três participantes, recuperação de sala de voz, rate limit distribuído, receipts atômicos e setup invite. Isso é evidência forte da vertical slice de sinalização na data do workflow, mas não equivale a um teste manual do Sale Smartly nem valida todos os domínios do produto.

O mesmo projeto de laboratório usado por esses testes agora aparece como INACTIVE. A execução mais recente de #76 recebeu a mensagem do Supabase exceed_edge_functions_invocations_quota, que informa que o proprietário precisa aumentar o plano ou remover os spend caps para restaurar o serviço. Portanto, para repetir os testes integrados hoje, o proprietário precisa primeiro resolver essa restrição no Dashboard do Supabase e reativar o projeto. Não compartilhar service keys nem executar qualquer mudança em produção.

**Ação humana necessária para desbloquear E2E:** restaurar o projeto upstatus-security-test no Supabase, resolvendo a quota de invocações (upgrade de plano ou remoção do spend cap, conforme decisão do proprietário). Enquanto isso, a análise estática, a comparação de código e o desenho da arquitetura podem continuar sem esse acesso.

Nenhum workflow foi disparado manualmente nesta rodada. Os resultados acima são históricos, lidos diretamente do GitHub Actions. Nenhum deploy, merge, alteração de plano, spend cap ou projeto foi realizado.


## Addendum — respostas HTTP 402 no runtime Normal (2026-11-17 15:20 BRT)

Uma consulta read-only aos logs unificados de produção encontrou 67.701 registros de function_edge_logs na janela de 24 horas consultada. A agregação por status/rota mostrou respostas HTTP 402 concentradas no endpoint legado beta10 usado pelo Normal 3.4.7:

| Rota beta10 | HTTP 402 nas últimas 1h consultadas |
|---|---:|
| `/api/chat` | 3.205 |
| `/api/status` | 1.364 |
| `/api/remote-status` | 1.362 |
| `/api/members` | 2 |
| `/api/me` | 2 |

Na mesma janela de uma hora, a consulta não encontrou chamadas registradas para `upstatus-team-lite`; isso não prova que Team Lite esteja saudável, apenas que não houve tráfego visível nessa janela. Também apareceram 402 em health/ready endpoints de infraestrutura do projeto. O projeto continua marcado `ACTIVE_HEALTHY` pela API de gerenciamento, então esse status não é suficiente para concluir que as invocações Edge estão funcionando.

A leitura do source atual beta10 não encontrou um caminho explícito que retorne status 402; o catch geral retorna 500. Isso sugere que a resposta pode estar sendo produzida antes do handler ou por uma camada externa, mas a causa não foi confirmada. Não atribuir automaticamente esses 402 à quota do laboratório: são projetos diferentes e o erro de produção precisa de diagnóstico próprio.

**Impacto provável:** como o Normal instalado aponta chat, status e controle remoto para beta10, esses 402 são compatíveis com a falha de atualização/presença percebida no Normal. Ainda não há prova de que todos os usuários sejam afetados nem de que a causa seja billing/quota.

**Ação humana necessária:** o proprietário deve verificar no Dashboard do projeto UpStatus a seção de uso/billing/spend caps e o estado das Edge Functions, especialmente a função beta10. Não alterar plano, spend cap, função ou segredo automaticamente. Precisamos do motivo exibido pelo Dashboard para confirmar a causa.

Nenhum request de escrita foi enviado à produção. A consulta foi somente a logs agregados e fonte implantada.


## Addendum — Team Lite channel metadata, TEST contract and validation dependency (2026-11-17 15:40 BRT)

### Team Lite update channel: root manifest is not the product manifest

A fresh read of `team-lite-official` clarified an apparent version discrepancy:

- The repository-root `release.json` remains `3.0.40-beta.22`, but the deployed Team Lite client does not use that file for its update check.
- The deployed Team Lite 3.4.30 script points its Tampermonkey update/download URLs to `team-lite/upstatus-team-lite.user.js`.
- That script's updater explicitly fetches `team-lite/release.json`; the product manifest declares `product=UpStatus Team Lite`, `coreVersion=3.4.7`, `buildVersion=3.4.30`, `channel=stable`, and the same script URL.
- The served script header is also 3.4.30, and the updater compares the served script version with `buildVersion` before allowing the update.

Therefore, **there is no observed Team Lite update-channel version mismatch**. The root manifest is for the main repository line; the separate Team Lite manifest is the active product channel. The actual source gap remains the backend: `team-lite-official` has the 3.4.30 client and product manifest, but no corresponding versioned backend template. PR #76 supplies a 3.4.31 candidate backend and must be reviewed by domain; it is not a drop-in production replacement.

### Exact client identity and runtime routing recheck

Decoded the embedded userscripts from the currently deployed functions:

| Runtime | Client version | Tampermonkey namespace | API target | Realtime topic |
|---|---|---|---|---|
| `upstatus` | 3.4.7 | `upseller` | legacy beta10 | beta10 |
| `upstatus-test` | 3.3.28 | `upseller` | legacy beta10 | beta10 |
| `upstatus-team-lite` | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` | beta10 |
| `upstatus-screen-share-3-1-1-beta10` | 3.1.1-beta8 embedded client | `upseller-screen-share-beta8` | beta8 | beta8 |

The Normal and TEST scripts therefore still collide on Tampermonkey identity and API/Realtime routing. Team Lite has its own client identity and API, but shares the beta10 Realtime topic with Normal. The beta10 function's embedded client itself points to beta8. These are routing/provenance facts, not proof that each legacy slug is still required by an active human client.

### Full-Product TEST contract — proposed, not provisioned

A valid test environment must be a **separate active Supabase project**, not the production project and not the inactive `upstatus-security-test` lab. The project reference, database, Storage, Realtime, publishable key, Edge Function secrets and quotas must all be independent.

| Surface | Required TEST contract |
|---|---|
| Normal API | Dedicated function `upstatus-test` inside the TEST project |
| Team Lite API | Dedicated function `upstatus-team-lite-test` inside the TEST project |
| Normal client | Unique test name/namespace (e.g. `UpStatus TEST` / `upseller-test`); update/download URLs and API URL must resolve only to TEST |
| Team Lite client | Unique test name/namespace (e.g. `UpStatus Team Lite TEST` / `upseller-team-lite-test`); its own manifest and update channel |
| Local state | Unique Normal and Team Lite TEST storage prefixes; never reuse `upstatus_` or `upstatus_team_lite_` production keys |
| Realtime | New TEST topic, different from every production topic; it may be shared by the two TEST products only if cross-product voice/presence interoperability is part of the acceptance suite |
| Storage | Buckets in the TEST project only, with signed uploads and explicit MIME/size/path checks; no production object URL in a test artifact |
| Secrets | TEST-only server secrets; never copy a production service-role key into client code, CI artifacts or the test project |
| Data | Synthetic users/messages/files only; do not clone production credentials or customer data |
| Build/deploy | Explicit TEST project ref and explicit two-function mapping; fail closed if project ref equals production or a TEST artifact contains a production URL, topic, key, namespace or storage prefix |

The currently deployed `upstatus-test` function is in the production project and its embedded script points back to beta10. It does **not** satisfy this contract.

### Proposed validation and migration order

1. Provision/activate the dedicated TEST project and confirm Edge Functions, Realtime and Storage are usable without quota errors.
2. Establish the baseline schema from the seven production ledger migrations in order. PR #176 recovers the four absent SQL statements from the ledger; the text matches those statements, but original Git blobs/comments are unavailable.
3. Verify the baseline catalog, Storage buckets, triggers and function grants in TEST before adding candidate architecture.
4. Apply the 23 candidate application migrations only in TEST, following their dependency graph: ACL hardening and broadcast minimization; signaling rooms/memberships/events; call/voice attempt lifecycle; chat receipt RPC; setup-invite and rate-limit chain. Add a separate supported plan for the `supabase_admin` default ACL gap; the existing candidate migration only addresses owner `postgres`.
5. Deploy both TEST backends and both TEST clients from one explicit environment manifest. Verify that no built artifact points to production.
6. Run authenticated API contracts, login/session expiry, role checks, presence, chat/history/read receipts, signed image/document/avatar uploads, remote state, individual calls, voice rooms, screen share, group mesh, Normal ↔ Team Lite interoperability, update-channel identity and reconnect without F5.
7. Only after TEST passes, perform manual Sale Smartly/Tampermonkey acceptance and prepare a reviewed cutover/rollback plan. No production action is implied by a green TEST run.

No project was created, no migration was replayed, and no deployment was performed.

### PR #178 validator dependency recheck

The new documentation commit triggered Validate run 44149802579, which failed at `scripts/validate.mjs:55` with `client signed upload helper missing`. The PR diff remains limited to the two documentation files, so this is an inherited `develop` baseline dependency, not a change introduced by the documentation.

The dependency is already isolated in PR #174: its exact-head Validate run 43802407509 succeeded and includes the signed-upload client helper plus client/server contract tests. PR #175's dedicated persisted-admin-role regression also succeeded (43808590208), while its full Validate failed at the same missing-helper assertion (43808590131). These PRs remain unmerged and unreviewed. Do not weaken the validator to make the documentation PR green; review/integrate the #174 dependency through the normal human review path first.

### Production HTTP 402 recheck — 2026-11-17 15:40 BRT

Read-only logs over the previous 24 hours showed 73,672 HTTP 402 responses from `upstatus-screen-share-3-1-1-beta10` and 6 from `upstatus`. All six `upstatus` responses were requests for `/upstatus.user.js`. In the latest one-hour window, beta10 returned 9,327 HTTP 402 responses (5,038 chat, 2,144 remote-status, 2,141 status, 2 members, 2 me). No Team Lite function requests appeared in the queried log slice; this is not evidence that Team Lite is healthy.

Some 402 entries show execution times between 0 and single-digit milliseconds. The logs do not expose the gateway's explanatory response body, and no explicit 402 branch was found in the inspected beta10 source. **The cause remains unconfirmed.** Do not call it billing/quota, and do not change billing, spend caps, function configuration or production routing without the owner inspecting the Dashboard and explicitly approving a change.


## Addendum: domain dependency matrix and build-output gap (2026-11-17 15:45 BRT)

### Domain-level dependency matrix

This matrix combines deployed backend table references, current client routing, and the candidate Normal/Team Lite branches. It is a dependency map, not a claim of behavioral parity.

| Domain | Current deployed dependencies | Candidate reconstruction direction | Cutover risk / required proof |
|---|---|---|---|
| Authentication and sessions | users, upstatus_sessions; custom hashed session tokens and role checks in the Edge Function | Preserve session contract while adding atomic setup-invite consumption/rate-limit RPCs; enforce persisted roles (PR #175) | Test existing account login, expiry, logout, recovery and role semantics before changing session/token format |
| Presence and history | users, status_history; public Realtime broadcasts | Publish minimal status hints; authenticated client fetches authoritative state | Coordinate DB trigger and all Normal/Team Lite clients; never change the topic or payload on only one side |
| Chat and receipts | messages, chat_reads, upstatus_typing; reactions are represented in message JSON as well as a separate legacy table | Atomic merge_chat_read_receipts RPC; minimize public message broadcasts; keep history shared | Preserve read/unread semantics, edit/delete/reaction/reply/media history; candidate migration must be tested with old and new clients |
| Media and profiles | chat-images Storage bucket and profile/avatar endpoints; upstatus_profiles | Signed upload ticket + client helper, strict origin/path/token/size/MIME validation (PR #174) | Both client and backend must ship together; current buckets are public and Storage has no policies, so private/quarantine design remains a separate decision |
| Voice, calls and screen share | WebRTC in userscript; signaling currently coupled to public Realtime topic | Separate authenticated signaling transport, room/membership/event/binding records, call/voice attempt recovery | Validate old-client compatibility, ICE lifecycle, audio permissions, reconnect without F5, group mesh and Normal ↔ Team Lite interoperability |
| Remote state/control | upstatus_state plus public remote-command/result broadcasts | Keep sensitive commands server-mediated; broadcast only non-sensitive change hints | Prove role/identity authorization and idempotent command/result handling |
| Guest portals | Lucca/Ycaro login, me, heartbeat and logout routes; shared chat context | Separate portal clients and explicit guest sessions while preserving shared history | Candidate develop base lacks Ycaro parity; test join/leave/expiry without deleting shared chat or leaking guest sessions |
| Distribution and identity | Normal script distributed by upstatus but calls beta10; Team Lite has its own API and separate product update manifest; TEST identity collides with Normal | One explicit environment manifest generates API, distribution, namespace, storage prefix, Realtime topic and ringtone channels together | Verify the exact installed artifact, update feed and API target for every product/environment before publishing |

Static backend inspection across deployed Normal, Team Lite, TEST and beta10 found direct references to the same core public tables: users, upstatus_sessions, status_history, upstatus_state, messages, chat_reads, upstatus_typing and upstatus_profiles, plus the chat-images Storage bucket. The deployed backend sources did not contain direct .from("reactions") or .rpc(...) calls. The separate public.reactions table currently has zero rows; do not classify it as safe to remove until client code, triggers and SQL references are checked. Candidate Normal/Team Lite backends add RPC calls for consume_upstatus_setup_invite, consume_upstatus_setup_invite_rate_limit and merge_chat_read_receipts; these require their candidate migrations and backend rollout as one dependency chain.

### Build-level Full-Product TEST gap

Read-only inspection of the exact candidate build and workflow files confirms:

- Normal candidate #74 has an explicit UPSTATUS_TEST_PROJECT_ID guard, rejects the production ref and the isolated signaling fixture, uses a non-deployable sentinel when no test project is configured, and generates a distinct Normal upstatus-test artifact with upseller-test, a TEST topic and a TEST storage prefix.
- Team Lite candidate #76 adds the Team Lite production backend/function and Team Lite release manifest, but its build still defines only one TEST function: upstatus-test. It does not generate upstatus-team-lite-test, a Team Lite TEST userscript identity, or a Team Lite TEST release manifest.
- The deploy-test.yml copied into the Team Lite candidate still deploys only upstatus-test. Therefore the current candidate build can test Normal in isolation, but it cannot test both products end-to-end or prove cross-product compatibility in a fully isolated project.

Required follow-up is a coordinated build/workflow extension that generates both product variants for TEST from one environment manifest and deploys both TEST function slugs to the same dedicated TEST project. Do not repurpose the production-project upstatus-test function as this environment.

No source code or workflow was changed by this inspection. No build, migration, deploy or browser test was executed.


## Addendum — candidate signaling and migration dependency graph (2026-11-17 15:50 BRT)

### Authenticated signaling vertical slice

The candidate signaling implementation is a separate Edge Function, not a route hidden inside the legacy monolithic backend:

- Candidate function: supabase/functions/upstatus-signal-test/index.ts.
- Candidate client adapter: src/userscript/signaling-transport.mjs.
- Server endpoints include room status/members/invitations/create, prepare/cancel call, open/cancel voice room, bind/resolve, invite/request-invite/accept/decline/leave/close, and signal delivery.
- The function uses the custom UpStatus session token and service-role database access on the server. Its database dependencies include upstatus_sessions, users, upstatus_signal_rooms, upstatus_signal_room_members, upstatus_signal_events, upstatus_signal_room_bindings, upstatus_signal_call_attempts and upstatus_signal_voice_room_attempts.
- The adapter persists retry/recovery state and supports polling/acknowledgement, Retry-After and explicit call/voice lifecycle operations.
- Crucially, the Normal and Team Lite candidate userscripts read the signaling feature flag from GM storage with a default of false. The transport is therefore opt-in and disabled for existing users until a coordinated rollout explicitly enables it. Passing the candidate CI does not activate it.

### Candidate migration dependency order

The 23 candidate application migrations in the Normal #74/#161 line should be treated as an ordered dependency chain, not as 23 independent SQL files:

1. **Initial privilege containment:** 20261029170500 restricts trigger-function EXECUTE; 20261029183000 revokes unused public-table grants.
2. **Signaling foundation:** 20261029205000 creates rooms, memberships and event queue, and preflights users.name for NULL/duplicates before adding the unique identity index.
3. **Membership and envelope compatibility:** 20261030120000 adds invitation consent; 20261030150000 sets legacy membership defaults; 20261030190000 permits the supported legacy envelopes.
4. **Room bindings:** 20261030192000 creates bindings referencing the signaling rooms and users. 20261103171000 adds the created_by index and therefore follows the binding table.
5. **Public Realtime minimization:** 20261103160000 changes the chat broadcast function; 20261103170000 changes user/remote-state broadcasts. Both SQL headers explicitly require matching clients to treat events as refresh hints and refetch canonical data through the authenticated API. 20261107170000 later pins the broadcast functions' search_path to empty.
6. **Read receipts and voice membership:** 20261105160000 adds merge_chat_read_receipts; 20261105190000 adds open/leave voice-room membership RPCs and relies on the signaling rooms/memberships/bindings.
7. **Call recovery:** 20261106080200 creates call-attempt records and prepare/cancel RPCs; 20261106111000 adds indexes for the call-attempt foreign keys.
8. **Voice-open recovery:** 20261106120500 creates durable voice-room attempts and open/cancel RPCs. 20261108010000 replaces the open-attempt RPC with a per-account singleton guard; 20261108050751 replaces it again with the account-scoped lock design. Both later replacements are required in timestamp order to reach the final candidate behavior.
9. **First-access invites:** 20261107010000 adds setup-invite columns and the initial consume RPC; 20261107060000 replaces the RPC with role normalization; 20261107062000 replaces it again while preserving existing role values. 20261109230000 then adds distributed per-admin invite rate limiting and its RPC, which PR #161's backend calls.
10. **Default ACL hardening:** 20261105150000 revokes default privileges for owner postgres, but the current production catalog also has broad public-schema defaults for supabase_admin. This candidate file alone does not close the full default-ACL finding.

This ordering is based on timestamps plus inspected table/function references. Before any TEST replay, run the candidate migration-layout tests, confirm the exact SQL sequence against the branch, and inspect rollback behavior for each data/constraint change. No candidate migration has been applied to production.

### Legacy reactions table: evidence for review, not deletion

A focused cross-layer check now shows:

- public.reactions has zero rows and only its primary-key index.
- It has no user-defined trigger and no foreign-key relationship in either direction.
- No public SQL function definition references reactions.
- The deployed backend sources do not directly query a reactions table; the Normal and Team Lite userscripts read and render the reactions JSON object embedded in each message record (messages.reactions).
- No inspected deployed userscript contains a direct Supabase .from("reactions") call.

This makes public.reactions a strong candidate for a legacy/unused table, but it is **not authorized for deletion**. Before cleanup, search all historical clients, archived branches, workflows, external scripts and any direct REST consumers, then confirm in isolated TEST that the table is not part of an undocumented compatibility contract.


## Handoff checkpoint — reconstruction foundation ready (2026-11-17 15:55 BRT)

The read-only discovery and architecture-foundation phase has reached a documented handoff point. The next phase can begin once the owner supplies the two environment/operations prerequisites below.

### Foundation outputs now documented

- Exact deployed runtime inventory and decoded client identity/API/update/Realtime routing for Normal 3.4.7, Team Lite 3.4.30, TEST 3.3.28 and legacy beta10/beta8.
- Git branch divergence and candidate provenance across master, develop, Normal #74/#161, Team Lite #76 and migration recovery #176.
- Domain dependency matrix for auth/session, presence, chat/receipts, media, voice/calls/screen share, remote control, guest portals and distribution.
- Supabase public schema, RLS/policies, table grants, default ACLs, SECURITY DEFINER functions, Realtime triggers/topics, Storage buckets and migration ledger.
- Ordered candidate migration dependencies, including the sequential RPC replacements and the unresolved supabase_admin default-ACL gap.
- Proposed target structure and a dual-product Full-Product TEST contract covering both products, function slugs, client identities, local prefixes, Realtime, Storage, secrets, data and build/deploy guards.
- Candidate validation evidence and limitations, including the Normal authenticated signaling smoke and the Team Lite TEST build gap.

### Known blockers and limits are explicit

1. Production Normal API and distribution logs continue to show HTTP 402. The Dashboard's explanatory reason is not visible in the read-only logs, so the cause is unconfirmed.
2. The separate upstatus-security-test project is INACTIVE and does not meet the Full-Product TEST contract.
3. Candidate Team Lite build #76 still lacks a Team Lite TEST function/client/manifest; both products cannot yet be tested end-to-end in one isolated project.
4. Production catalog still has the documented RLS/policy/grant/default-ACL and SECURITY DEFINER findings. No security remediation has been applied.
5. The managed Supabase main branch reports MIGRATIONS_FAILED.
6. PR #178 is a documentation-only Draft PR. Its Validate workflow fails on the inherited develop assertion "client signed upload helper missing"; the separate candidate PR #174 contains that helper and passed its exact-head Validate. No PR has been merged.
7. No local build, complete Full-Product TEST, manual Sale Smartly/Tampermonkey acceptance or production cutover has been performed.

### Required owner actions to enter the implementation phase

- Inspect the UpStatus Supabase Dashboard's Usage/Billing/Spend Caps and Edge Function status, especially the beta10 function, and provide the exact 402 explanation shown. Do not change plan, spend caps, function settings or secrets as part of this inspection.
- Provision or restore a dedicated, active Full-Product TEST Supabase project with working Edge Functions, Realtime and Storage, and provide only its Project Ref. Do not share service-role keys or other secrets.

### Recommended next phase

After those prerequisites, create the missing Team Lite TEST build/deploy path, reconcile the TEST baseline migrations in that isolated project, then run domain-level API/browser acceptance for both products. Only after that should a reviewed module extraction and production cutover/rollback plan be prepared.

**Phase 1 handoff status: READY.** This does not mean the production system is repaired, that candidate code is approved, or that any production change is authorized. Production remains untouched.


## Addendum — verificação de 402, inventário de hashes e estado do handoff (2026-11-17)

### Respostas HTTP 402 observadas nos logs

Uma nova consulta somente leitura ao fluxo `function_edge_logs`, limitada às últimas 24 horas, retornou:

| Endpoint | Respostas 402 | Tempo médio registrado |
|---|---:|---:|
| beta10 `/api/chat` | 40.523 | 2,5 ms |
| beta10 `/api/status` | 17.204 | 2,5 ms |
| beta10 `/api/remote-status` | 17.202 | 2,4 ms |
| beta10 `/api/members` | 17 | 4,1 ms |
| beta10 `/api/me` | 17 | 19,2 ms |
| beta10 `/api/account` | 17 | 1,4 ms |
| Normal `/upstatus/upstatus.user.js` | 6 | 2,3 ms |
| **Total** | **74.986** | — |

Os registros mostram rejeições 402 em chamadas de API e também no endpoint de distribuição do userscript. Uma consulta separada não encontrou linhas em `edge_logs` nos últimos 60 minutos, enquanto os registros de função mostram tempos médios muito baixos. Isso é compatível com uma rejeição anterior ao processamento normal do handler, mas **não identifica a causa**. Não atribuir o erro a billing, quota ou configuração específica sem a mensagem exibida no Dashboard. A inspeção do proprietário continua necessária; nenhuma configuração foi alterada.

### Inventário dos 38 entrypoints ativos

A listagem foi repetida e confirmou 38 funções em estado ACTIVE:

- 1 Normal oficial;
- 1 Team Lite oficial;
- 12 funções TEST/históricas;
- 13 funções beta de screen share;
- 11 backups nomeados.

Os 38 valores `ezbr_sha256` dos entrypoints são distintos. Portanto, os nomes de backup não representam cópias idênticas do entrypoint atual. Isso **não** prova que todos sejam consumidos, nem que sejam seguros para remoção: ainda é necessário mapear chamadas externas, clientes antigos e dependências de rollback. Nenhuma função foi alterada ou removida.

### Estado atual da PR #178

A PR #178 permanece aberta e Draft, com alteração somente de documentação. O check `validate` no HEAD `6ac510c3b9334adb3d9a3e6247f47e9c992943e0` falhou em `scripts/validate.mjs:55` com:

`VALIDATION FAILED: client signed upload helper missing`

O workflow chegou a executar o build (PROD 3.0.40 / TEST 3.0.40-beta.22), mas falhou na asserção do validator herdado de `develop`. O check Supabase Preview foi ignorado porque a branch não está associada a uma Supabase Branch. A PR #174 contém a implementação candidata do helper e declara CI bem-sucedido no HEAD `277dd7bbfe87a4e40c0ca62395a83c3fe01c7849`, mas continua aberta e não integrada. Não tratar a validação da PR #178 como aprovada.

### Reconciliação do estado de conclusão

O checkpoint de `CURRENT_STATE.md` que descreve a fase como “ready for owner handoff” é um handoff parcial para solicitar os pré-requisitos do proprietário. Ele não substitui os critérios ainda pendentes na seção 10 deste documento. A fundação **não está concluída**: falta Full-Product TEST operacional, build reproduzível sem mistura de identificadores, validação integrada por domínio e proveniência/consumidores completos dos runtimes legados.

### Próximo trabalho

1. Continuar a matriz de consumidores: pesquisar referências a cada família de função e separar chamadas atuais, chamadas apenas em código histórico e dependências desconhecidas.
2. Reconciliar os artefatos e os contratos do build Normal/Team Lite/TEST sem alterar os workflows de produção.
3. Manter a PR #178 Draft e registrar apenas evidências novas.
4. Aguardar a causa exata do 402 no Dashboard e o Project Ref de um Full-Product TEST isolado antes de qualquer teste integrado.

Nenhum deploy, merge, migration, alteração de segredo, grant, policy, dado ou função ocorreu nesta verificação.


## Addendum — mapa de consumidores embutidos nas famílias beta, TEST e backup (2026-11-17)

A inspeção foi ampliada para decodificar o userscript embutido nas 13 funções screen-share, nas 12 funções TEST e nas 11 funções nomeadas como backup. Foram extraídos apenas metadados de identidade, versão, destino de atualização, API, tópico Realtime e prefixo local; nenhum token público/segredo foi registrado.

### Família screen-share beta

As 13 funções não formam uma sequência de aliases intercambiáveis:

- beta1 a beta8 e beta9 simples têm, em geral, versão do backend/cliente e destinos de API, update, tópico e prefixo coerentes com o próprio sufixo.
- beta9-1 declara cliente 3.1.1-beta9.1 e chama a própria API, mas já usa tópico e prefixo beta8.
- beta9-2 declara 3.1.1-beta9.2, mas API, tópico e prefixo apontam para beta8.
- beta9-3 declara 3.1.1-beta9.6, mas API, tópico e prefixo apontam para beta8.
- beta10 não contém cliente beta10: backend e userscript embutido declaram 3.1.1-beta8; o script servido atualiza e chama a função beta8, usa tópico beta8 e prefixo beta8.

Isso confirma que o slug da Edge Function não é uma fonte confiável para inferir a versão do cliente ou seu backend real. A função beta10 continua relevante porque os clientes Normal e TEST atuais chamam seu endpoint de API, mesmo que o userscript distribuído por ela seja beta8.

### Família TEST

| Grupo implantado | Identidade/isolamento observado |
|---|---|
| `upstatus-test` 3.3.28 | Mesmo @name e @namespace do Normal; API beta10; tópico beta10; prefixo local beta8. Não isolado do Normal. |
| TEST 3.0.52 beta1–beta6 e TEST beta11 | Namespace, tópico e prefixo específicos por variante. Ainda estão no projeto Supabase de produção, portanto não são Full-Product TEST isolados. |
| TEST 3.0.51 beta1/beta3 | Namespace/prefixo de teste, mas tópico Realtime de produção; a beta3 atualiza pela beta1. |
| TEST 3.0.51 beta2 | API/tópico beta2, mas updateURL e namespace apontam para beta1. |
| `upstatus-test-backup-032` 3.0.32-test | Namespace de teste, porém usa tópico de produção e prefixo local `upstatus_`; API e update apontam para `upstatus-test`. |

O histórico mostra que algumas versões TEST antigas tinham separação lógica melhor do que o TEST 3.3.28 atualmente implantado. Mesmo as variantes com tópico/prefixo próprios continuam compartilhando projeto, banco, Storage e ambiente de execução com produção. Nenhuma delas deve ser tratada como ambiente Full-Product TEST seguro.

### Família backup

Os 11 backups nomeados também guardam snapshots com contratos diferentes:

- 3.1.0, 3.1.1 e 3.1.2: os scripts recuperáveis usam API/tópico/prefixo beta8; os nomes de namespace variam entre `upseller` e `upseller-screen-share-beta8`.
- 3.2.5, 3.2.6, 3.2.7, 3.2.8, 3.2.9 e 3.3.0: scripts recuperáveis atualizam por `upstatus`, mas continuam chamando API/tópico/prefixo beta8.
- `upstatus-test-backup-032`: segue o contrato legado TEST descrito acima.
- `upstatus-backup-327-pre328`: a API de inspeção retornou `index.ts` com zero bytes, apesar de informar um SHA-256 não vazio. Não classificar o conteúdo como vazio de origem nem descartar a função; é necessário recuperar/validar a fonte por outra evidência.

Os 38 entrypoints ativos continuam com hashes distintos. A ausência de hash duplicado, somada a esses destinos cruzados, reforça que os backups são snapshots históricos diferentes, não réplicas descartáveis. Não remover nenhum deles até concluir o mapa de consumidores e a política de rollback.

### Encoding dos userscripts

A afirmação genérica de que todos os runtimes implantados usam o mesmo encoding foi refinada: Normal 3.4.7, Team Lite 3.4.30 e TEST 3.3.28 usam `USERSCRIPT_BASE64`; as famílias beta screen-share, TEST 3.0.50–3.0.52 e backups com fonte recuperável usam `USERSCRIPT_HEX`. O encoding é específico da geração. A fonte vazia de backup-327-pre328 permanece sem classificação.

### Observabilidade de uso recente

Na janela fixa de 24 horas entre 2026-11-16 19:32 UTC e 2026-11-17 19:32 UTC, a consulta agregada de `function_edge_logs` encontrou apenas dois slugs:

- `upstatus-screen-share-3-1-1-beta10`: 74.302 respostas HTTP 402;
- `upstatus`: 6 respostas HTTP 402, todas no endpoint de distribuição observado.

As outras 36 funções não tiveram linhas nesse recorte. Isso é apenas ausência de registros no intervalo consultado, não prova de que estejam sem consumidores; retenção, telemetria e clientes fora da janela precisam ser considerados. A causa do 402 continua desconhecida e depende da mensagem exibida no Dashboard do proprietário.

### Consequência para a reconstrução

A próxima matriz de proveniência deve identificar três coisas separadamente para cada runtime: (1) quem distribui o script, (2) qual função o script chama para API, e (3) qual tópico/prefixo/namespace ele usa. O slug da função distribuidora, isoladamente, não responde às outras duas perguntas. A estratégia Full-Product TEST precisa usar projeto separado e manifesto que valide todos esses destinos, não apenas sufixos diferentes.

Nenhum deploy, merge, migration, alteração de segredo, grant, policy, dado ou função ocorreu nesta inspeção.


## Addendum — paridade de rotas e rechecagem do laboratório (2026-11-17)

### Paridade literal de endpoints

A comparação dos caminhos `/api/*` encontrados diretamente nos fontes dos seis runtimes retornou:

| Runtime | Versão declarada | Rotas literais |
|---|---:|---:|
| `upstatus` | 3.4.7 | 34 |
| `upstatus-team-lite` | 3.4.30 | 34 |
| `upstatus-test` | 3.3.28 | 34 |
| beta10 | 3.1.1-beta8 | 34 |
| beta8 | 3.1.1-beta8 | 32 |
| backup 330 | 3.3.0 | 32 |

Os quatro runtimes atuais têm os mesmos 34 caminhos literais. beta8 e backup 330 não têm:

- `/api/chat/upload-url`;
- `/api/profile/avatar-upload-url`.

Isso mostra que os endpoints de upload assinado chegaram aos quatro runtimes atuais, mas não aos snapshots beta8/3.3.0. Paridade de caminho não prova paridade semântica: regras de papel, limites, autorização, sessão, payload e efeitos no banco ainda precisam ser comparados por handler e testados no ambiente isolado.

### Estado dos projetos Supabase

Rechecagem direta de `get_project`:

- Produção `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`.
- Laboratório `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`): `INACTIVE`.

O laboratório continua indisponível para SQL e testes integrados. Não foi tentada restauração nem criação de projeto, pois isso pode envolver custo/compute e requer ação/decisão do proprietário. O projeto de sinalização também não atende ao contrato Full-Product TEST.

### Consequência

A próxima revisão de paridade deve comparar o corpo dos 34 handlers entre Normal, Team Lite, TEST e beta10, destacando diferenças de política Normal/Team Lite e dependências RPC/Storage. Não considerar a igualdade dos nomes das rotas como prova de que os runtimes são substitutos seguros.

Nenhuma restauração de projeto, alteração de billing, migration, deploy ou modificação de produção ocorreu.


## Addendum — divergência semântica entre API distribuída e API ativa (2026-11-17)

A comparação de funções internas confirmou que os 34 nomes de rotas não significam o mesmo comportamento em todos os runtimes.

### O Normal servido não é o backend usado pelo Normal

O userscript Normal 3.4.7 servido por `upstatus` aponta sua API para beta10. O endpoint `/api/members` em beta10 chama `members()`, que lê todos os nomes de `public.users` sem a allowlist. O `statusRoute(GET)` de beta10 também consulta todos os usuários.

Já o backend `upstatus` 3.4.7, quando comparado diretamente, restringe `members()` à allowlist `Ricardo`, `Guilherme` e `Lohan`. Portanto, o código da função que distribui o Normal não representa o comportamento efetivo de suas chamadas de API nesses endpoints. A resposta real vem do beta10 legado.

### Políticas de senha e identidade

- Normal 3.4.7 source e beta10 exigem senha com pelo menos 6 caracteres.
- Team Lite 3.4.30 exige pelo menos 4 caracteres e responde com erro específico quando a conta não pertence ao Team Lite.
- TEST 3.3.28 source também exige 4 caracteres e contém allowlist, mas o userscript TEST atualmente chama beta10; logo, na prática, o login do cliente TEST é validado pela regra de 6 caracteres do beta10, não pela regra do próprio `upstatus-test`.

### Histórico de convidados

Team Lite possui um caminho explícito de `guestJoinedAt` em `chatRoute` e `chatRows`, aplicando corte temporal às mensagens retornadas. Normal e beta10 não recebem esse limite. O TEST 3.3.28 tem um parâmetro parcial de `guestJoinedAt` em `chatRoute`, mas seu `chatRows` não possui o mesmo argumento; além disso, o cliente atual não chama esse backend.

### Implicação

A compatibilidade deve ser medida por fluxo e runtime efetivamente chamado, não só pelo arquivo que distribui o userscript nem pela lista de rotas. Antes de trocar Normal para sua própria API ou redirecionar TEST para `upstatus-test`, validar login, membros/status, histórico de convidados, permissões e compatibilidade com contas existentes em Full-Product TEST.

Nenhuma configuração ou código de produção foi alterado.


## Addendum — contrato de upload assinado e risco do destino beta10 (2026-11-17)

A comparação direta de `signedUploadRoute` em produção encontrou três níveis de validação:

| Runtime | Valida token não vazio | Confere caminho assinado | Valida origem HTTPS e URL pública |
|---|---|---|---|
| `upstatus` 3.4.7 | Sim | Sim | Não |
| `upstatus-team-lite` 3.4.30 | Sim | Sim | Não |
| `upstatus-test` 3.3.28 | Sim | Sim | Não |
| beta10 3.1.1-beta8 | Não | Não | Não |
| PR #161 candidata | Sim | Sim | Sim |

O userscript Normal atual chama beta10 para API. Portanto, seu fluxo de ticket de upload é atendido pelo handler legado que apenas cria a URL assinada e devolve URL/token/public URL, sem as verificações de consistência de token/caminho/origem presentes nos fontes Normal/Team Lite. A PR #161 candidata adiciona verificações da origem do projeto, rota de upload, caminho, token e URL pública antes de devolver o ticket.

O HEAD atual da PR #161 é `557814dc31bed779b84a2094358dc6b2a7e67689`; os dois workflows associados (Validate e Signaling Smoke Tests) estão concluídos com sucesso nesse SHA. A PR permanece Draft, baseada em `chore/continuity-foundation`, e não foi integrada nem implantada. Isso é evidência de CI da candidata, não teste no ambiente Full-Product TEST nem aprovação para produção.

Observação: `/api/chat/audio` é um fluxo separado via `mediaRoute`, com limite de 5 MB. A diferença de allowlist em `signedUploadRoute` não prova, sozinha, quebra de áudio; os dois caminhos precisam permanecer separados na matriz de compatibilidade.

**Regra de reconstrução:** não redirecionar o Normal de beta10 para `upstatus` até testar no Full-Product TEST os fluxos de upload de imagem, vídeo, documento, avatar e áudio, além de validar URLs antigas já persistidas.

Nenhum upload, objeto Storage, runtime, migration, deploy ou configuração de produção foi alterado nesta comparação.


## Referência consolidada

A matriz comparativa de distribuição, API efetiva, identidade Tampermonkey, Realtime, políticas de produto, upload e dependências de ambiente foi separada em [RUNTIME_COMPATIBILITY_MATRIX.md](./RUNTIME_COMPATIBILITY_MATRIX.md). Use a matriz como referência rápida e este documento como histórico detalhado da investigação e da sequência de reconstrução.
