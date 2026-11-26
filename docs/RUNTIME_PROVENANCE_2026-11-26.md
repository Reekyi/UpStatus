# UpStatus — proveniência dos runtimes ativos (2026-11-26)

**Branch de investigação:** `chore/cleanup-structure-347`  
**Método:** leitura direta do Supabase e comparação com arquivos do GitHub.  
**Escopo:** nenhum deploy, escrita no banco, migration, alteração de configuração ou segredo.

## 1. Projeto consultado

- Projeto Supabase: `upstatus-normal`
- Ref: `mvjqunhjxkbfcrxkjtgf`
- Região: `sa-east-1`
- Estado: `ACTIVE_HEALTHY`

## 2. Edge Functions ativas observadas

| Slug | Versão da implantação | Versão declarada no código | SHA-256 informado pelo Supabase |
|---|---:|---|---|
| `upstatus` | 2 | 3.4.7 | `f1f6b4aaba1a48c5f9ea92fa75d326f7fccd73194400a8c87b87d6e47a8ab44a` |
| `upstatus-screen-share-3-1-1-beta10` | 3 | 3.1.1-beta8 | `88469a3f04edab57fa7dd1c5fc3571b4c522a3450fea22d227890900045e7ff0` |
| `upstatus-storage-migrate-once` | 2 | stub 404 | `523afbe3022cbdc9e0813e8c701c63ac1f61e20865e9500d5ec64dcefbbd2c6e` |

A função `upstatus-storage-migrate-once` contém apenas uma resposta 404 e não executa migração no código atualmente implantado.

## 3. Fluxo real do cliente Normal 3.4.7

A extração do userscript embutido na função `upstatus` confirmou:

- `@version 3.4.7`.
- `@updateURL` e `@downloadURL` apontam para o projeto atual e para `/functions/v1/upstatus/upstatus.user.js`.
- O backend de API configurado no cliente é `/functions/v1/upstatus-screen-share-3-1-1-beta10`.
- O Realtime usa o projeto atual e o tópico `upstatus-screen-share-live-3-1-1-beta10`.

Portanto, a função `upstatus` distribui o userscript Normal 3.4.7, mas não é o único backend usado pelo cliente. O fluxo de API principal é separado e passa pela função beta10.

## 4. Identidade do runtime beta10

A função implantada com slug `upstatus-screen-share-3-1-1-beta10` declara internamente `VERSION = "3.1.1-beta8"` e embute um userscript de mesmo nome/versão.

Esse userscript beta8 aponta suas chamadas para o slug `upstatus-screen-share-3-1-1-beta8` e usa o tópico Realtime `upstatus-screen-share-live-3-1-1-beta8`.

Isso confirma que o slug beta10 e a identidade interna do artefato beta8 são diferentes. Não renomear, redirecionar ou consolidar esses endpoints por aparência. Eles podem ser dependências de clientes já instalados.

## 5. Divergência com GitHub

O runtime atual não pode ser reconstruído com segurança apenas copiando `master`:

- `master/src/server/index.template.ts` usa `USERSCRIPT_HEX` e um decodificador hexadecimal.
- A função `upstatus` implantada usa `USERSCRIPT_BASE64` e `atob`.
- O runtime implantado contém duas páginas HTML de convidados diretamente no handler; o template atual organiza esses trechos de outra forma.
- O HTML Ycaro embutido no runtime atual é idêntico ao arquivo `ycaro.html` consultado em `master`.
- O HTML Lucca embutido no runtime atual não é byte a byte igual ao arquivo atual `lucca-site/index.html`; esse arquivo é substancialmente maior e precisa de comparação estrutural antes de qualquer reconciliação.
- `master/scripts/build.mjs` ainda contém o project ref antigo `dlfvkawaiqduhlazsszm`, enquanto o userscript Normal extraído do runtime usa o project ref atual para distribuição, API e Realtime.

As branches `master`, `chore/continuity-foundation` e a base da PR #161 possuem templates diferentes, mas nenhuma foi comprovada como fonte byte a byte do backend implantado.

## 6. Decisão de engenharia

**Não iniciar refatoração do backend nem regenerar artefatos de produção ainda.**

A base mais segura é preservar os dois runtimes ativos como contratos independentes:

1. Normal 3.4.7: userscript distribuído por `upstatus`.
2. API/Realtime beta: atendidos por `upstatus-screen-share-3-1-1-beta10`, que mantém identidade interna beta8.
3. Convidados Lucca/Ycaro: páginas e rotas que também existem no runtime `upstatus` e precisam de proveniência própria.

Antes de qualquer extração modular, é necessário recuperar uma fonte versionada que corresponda aos dois bundles implantados, incluindo os artefatos embutidos, e mapear a dependência de cada cliente instalado. Não alterar os slugs, tópicos Realtime, URLs, contratos ou payloads.

## 7. Próximos passos sem produção

1. Fazer comparação estrutural das páginas Lucca e Ycaro e identificar a origem da versão implantada.
2. Mapear os handlers de API e seus contratos entre cliente 3.4.7 e backend beta8/beta10.
3. Inspecionar os testes e workflows existentes, sem executar deploy ou workflows de produção.
4. Definir uma estratégia de snapshot/proveniência que não publique segredos nem sobrescreva fontes históricas.
5. Só então criar a primeira extração modular, isolada e testada.

## 8. Limites da evidência

- O Supabase informou os hashes de bundle acima; não foi calculado um hash reproduzível de todos os arquivos-fonte localmente.
- A leitura do código implantado prova o conteúdo retornado pela API de Management, não prova latência em produção.
- A meta de desempenho continua sendo preservar os valores observados pelo Ricardo e Guilherme: mensagens em aproximadamente 2 segundos e troca de fila praticamente instantânea. Essas medições ainda precisam ser repetidas em um ambiente controlado antes e depois de cada mudança.
- Nenhum teste real de navegador, chamada, compartilhamento de tela ou benchmark de produção foi executado nesta etapa.


## Confirmação adicional: artefato Normal

O userscript 3.4.7 extraído do runtime foi comparado integralmente com `master/UpStatus.user.js`. Após normalizar apenas o project ref e a publishable key do ambiente, os 544.057 caracteres coincidem integralmente. Isso confirma a proveniência do **cliente** Normal, embora não confirme a proveniência do backend implantado.

O snapshot do backend e o artefato cliente foram preservados na branch:
- `recovery/runtime-2026-11-26/upstatus/index.ts`
- `recovery/runtime-2026-11-26/userscripts/upstatus-normal-3.4.7.user.js`
- `recovery/runtime-2026-11-26/upstatus-screen-share-3-1-1-beta10/index.ts`
- `recovery/runtime-2026-11-26/userscripts/upstatus-screen-share-3.1.1-beta8.user.js`

Os arquivos são snapshots de recuperação, não artefatos prontos para deploy. A matriz de diferenças e cobertura está em `docs/TEST_COVERAGE_BASELINE_2026-11-26.md`.
