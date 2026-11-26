# UpStatus — baseline da reorganização mínima

**Data:** 2026-11-26  
**Objetivo:** organizar a estrutura existente sem reescrever funcionalidades, alterar comportamento ou fazer deploy.

## Regras do trabalho

- Preservar o comportamento e o desempenho conhecidos da versão 3.4.7.
- Não reescrever módulos nem mudar contratos de API por estética.
- Fazer mudanças pequenas, localizadas e reversíveis.
- Não alterar produção, Supabase, migrations, secrets, policies ou workflows de deploy.
- Não integrar PRs existentes nem fazer merge/rebase amplo sem revisão específica.
- Antes de mover código, confirmar a origem e registrar dependências/imports.
- Validar cada mudança com os scripts existentes e testes focados; se houver regressão, reverter.

## Ponto de partida Git

- Repositório: `Reekyi/UpStatus`
- Branch de trabalho: `chore/cleanup-structure-347`
- Base inicial: `master`
- SHA da base: `9d40461babcec8eb8686c2a04be9c675df7da381`
- A branch foi criada isoladamente. Nenhum arquivo de produção foi alterado.

## Runtime observado no Supabase atual (somente leitura)

- Projeto: `upstatus-normal`
- Project ref: `mvjqunhjxkbfcrxkjtgf`
- Região: `sa-east-1`
- Estado: `ACTIVE_HEALTHY`
- Edge Function `upstatus`: ACTIVE, versão de implantação 2, verify_jwt=false
- SHA-256 de bundle informado pelo Supabase: `f1f6b4aaba1a48c5f9ea92fa75d326f7fccd73194400a8c87b87d6e47a8ab44a`
- O código da função declara `VERSION = "3.4.7"`.
- Funções adicionais ativas observadas: `upstatus-screen-share-3-1-1-beta10` e `upstatus-storage-migrate-once`.

## Divergência que precisa ser resolvida antes de mover código

O runtime atual foi inspecionado diretamente no projeto Supabase, mas não é seguro afirmar que o conteúdo de `master` representa integralmente o bundle implantado:

- `master/release.json` declara 3.4.7, porém aponta para o projeto antigo `dlfvkawaiqduhlazsszm`.
- O userscript embutido no runtime atual aponta seu update/download URL para o projeto atual `mvjqunhjxkbfcrxkjtgf`.
- O userscript embutido no runtime e o artefato `master/UpStatus.user.js` têm tamanhos diferentes (545.607 vs. 544.057 caracteres) e não são idênticos.
- O build script de `master` também contém referências ao projeto antigo.
- Existe documentação anterior em `docs/RECONSTRUCTION_FOUNDATION.md` e PR #178 com um mapa mais amplo de divergências entre runtimes, branches e candidatos.

**Consequência:** esta branch é um ponto de trabalho isolado, não uma declaração de que `master` é a fonte definitiva do runtime atual. Antes da primeira mudança de código, reconciliar a origem do userscript e do backend implantados com os arquivos-fonte e identificar quais diferenças são apenas URLs/ambiente e quais são alterações funcionais.

## Arquivos-fonte identificados em master

- `src/userscript/upstatus.user.template.js` — aproximadamente 543.874 bytes.
- `src/server/index.template.ts` — aproximadamente 102.752 bytes.
- `scripts/build.mjs` — gera o userscript e a Edge Function.
- `scripts/validate.mjs` — build + verificações estáticas e regressões existentes.

O userscript e a Edge Function são grandes arquivos autocontidos. A reorganização deve ser incremental e só começar depois de mapear os pontos de entrada e dependências. Não dividir arquivos apenas por tamanho.

## Pull requests e trabalho anterior

- PR #178: documentação de reconstrução, Draft, baseada em `develop`; não é autorização para merge.
- PR #161: candidata Normal, Draft, ainda não integrada.
- PR #167: candidata de build/chat, Draft, ainda não integrada.
- Há várias outras branches e PRs em andamento. Não apagar, sobrescrever ou incorporar automaticamente.

## Próximo passo

1. Recuperar e comparar o fonte exato do runtime atual com os templates do GitHub.
2. Identificar os blocos de código que podem ser movidos sem alterar lógica ou ordem de execução.
3. Escolher um primeiro bloco pequeno e de baixo risco.
4. Registrar diff, executar validação e só então continuar.

## Continuidade entre conversas

Este arquivo é o checkpoint durável do projeto. Se a conversa atingir o limite, iniciar outro chat e pedir para continuar o projeto UpStatus usando a branch `chore/cleanup-structure-347` e este documento. O trabalho e o estado técnico ficam no GitHub; o novo chat não depende de recuperar toda a conversa anterior.
