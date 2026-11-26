# UpStatus — reconciliação dos dois projetos Supabase (2026-11-26)

Esta investigação corrigiu uma suposição anterior: existem **dois projetos Supabase conectados**, em duas organizações diferentes. O projeto `upstatus-normal` da organização `UpStatus Revived` não é o único ambiente disponível e não deve ser chamado de produção principal sem confirmar o cutover.

## 1. Projetos identificados

| Projeto | Organização | Criado em | Região | Estado |
|---|---|---|---|---|
| `UpStatus` — `dlfvkawaiqduhlazsszm` | organização original | 2026-10-02 | us-west-2 | ACTIVE_HEALTHY |
| `upstatus-normal` — `mvjqunhjxkbfcrxkjtgf` | UpStatus Revived | 2026-11-25 | sa-east-1 | ACTIVE_HEALTHY |
| `upstatus-security-test` — `bfpjtfqlnypisxljoxkb` | organização original | 2026-10-29 | sa-east-1 | INACTIVE |

## 2. Edge Functions centrais

| Projeto | Slug | Implantação | Versão declarada | SHA-256 do bundle |
|---|---|---:|---|---|
| Original | `upstatus` | 480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| Original | `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| Revived | `upstatus` | 2 | 3.4.7 | `f1f6b4aaba1a48c5f9ea92fa75d326f7fccd73194400a8c87b87d6e47a8ab44a` |
| Revived | `upstatus-screen-share-3-1-1-beta10` | 3 | 3.1.1-beta8 | `88469a3f04edab57fa7dd1c5fc3571b4c522a3450fea22d227890900045e7ff0` |

## 3. Comparação original vs Revived

### Normal 3.4.7

- O código do handler é idêntico depois de substituir o project ref e o bloco de userscript embutido por marcadores.
- O userscript extraído é idêntico depois de normalizar o project ref e a publishable key pública.
- Portanto, os bundles são funcionalmente equivalentes na comparação estática feita, com configuração de ambiente diferente.

### API beta10 / identidade beta8

- O userscript embutido é idêntico depois de normalizar o project ref.
- O backend difere em uma linha de precedência de credenciais: no projeto original, `secretKeys.default` tem prioridade; no Revived, a variável `SUPABASE_SERVICE_ROLE_KEY` tem prioridade.
- Nenhum valor de segredo foi encontrado embutido nos bundles. As credenciais são obtidas por variáveis de ambiente.
- Não presumir que a diferença de precedência seja irrelevante: verificar configuração e comportamento de autenticação antes de unificar.

## 4. Diferença de inventário

O projeto original possui um inventário muito maior de Edge Functions, incluindo:
- `upstatus` (v480);
- `upstatus-test` (v281);
- `upstatus-team-lite` (v15);
- `upstatus-screen-share-3-1-1-beta10` (v6);
- versões beta antigas, funções TEST legadas e funções de backup.

O projeto Revived tem apenas três funções:
- `upstatus` (v2);
- `upstatus-screen-share-3-1-1-beta10` (v3);
- `upstatus-storage-migrate-once` (v2), cujo código atual é um stub 404.

Isso sugere que Revived é uma cópia reduzida dos dois runtimes centrais, não uma réplica completa do ambiente original. A ausência de Team Lite, TEST e demais funções pode ser intencional, mas ainda não foi comprovada como parte de um cutover concluído.

## 5. Snapshots preservados

Os bundles e userscripts dos dois projetos foram preservados separadamente em:
- `recovery/runtime-2026-11-26/` — snapshots do projeto Revived;
- `recovery/runtime-2026-11-26/original-project-*/` — snapshots do projeto original;
- `recovery/runtime-2026-11-26/userscripts/` — clientes extraídos de ambos.

Os snapshots foram inspecionados por padrões comuns de tokens JWT, chaves secret Supabase, chaves privadas e valores hardcoded de service-role; nenhum foi encontrado. Isso não substitui um scanner completo de segredos, mas evita registrar credenciais óbvias conhecidas.

## 6. Implicação para a reorganização

**Não escolher um único projeto como fonte de verdade ainda.**

O código da aplicação central parece ter sido copiado para Revived com configuração diferente. Mas o projeto original mantém outros runtimes que podem atender clientes ou fluxos legados.

Antes de qualquer alteração:
1. Confirmar com evidência de uso qual project ref os clientes atualmente instalados chamam.
2. Confirmar se Team Lite e TEST foram migrados, descontinuados ou continuam ativos no projeto original.
3. Comparar variáveis de ambiente/configuração entre os dois projetos sem expor valores de segredo.
4. Confirmar se o novo projeto é o destino oficial do cutover ou apenas cópia de recuperação.
5. Manter snapshots dos dois lados e não remover funções do projeto original.

Nenhum deploy, escrita no banco, alteração de configuração, alteração de segredo ou migração foi executado.


## 7. Funções adicionais e dependência beta8

A inspeção do inventário original confirmou também:
- `upstatus-test`: implantação v281, código declara 3.3.28.
- `upstatus-team-lite`: implantação v15, código declara 3.4.30.
- `upstatus-screen-share-3-1-1-beta8`: implantação v2, código declara 3.1.1-beta8.

Esses três bundles foram preservados em `recovery/runtime-2026-11-26/original-project-test/`, `original-project-team-lite/` e `original-project-beta8/`.

O userscript embutido na função `upstatus-screen-share-3-1-1-beta10` declara beta8 e aponta sua API para `/functions/v1/upstatus-screen-share-3-1-1-beta8`. Esse slug existe no projeto original, mas não existe no projeto Revived. Portanto, a cópia Revived não replica integralmente o grafo de dependências dos runtimes beta distribuídos. Antes de considerar o cutover completo, é necessário decidir se beta8 continua sendo um fluxo suportado e, em caso afirmativo, migrar seu backend de forma controlada.

O projeto original também tem `upstatus-test` e `upstatus-team-lite`, que não aparecem no inventário Revived. A branch `team-lite/3.4.31-candidate` não é idêntica ao Team Lite 3.4.30 ativo; a comparação encontrou diferenças funcionais em autenticação, lista de usuários, permissões administrativas, chat e convidados. Não usar essa candidata como substituta automática.

## 8. Inventário de runtimes centrais preservados

Além dos dois runtimes Normal/beta10, foram preservados os bundles originais TEST 3.3.28, Team Lite 3.4.30 e beta8 3.1.1. Nenhum foi modificado ou redeployado.
