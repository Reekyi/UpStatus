# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-13T20:42:11.570Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Parecer:** **NOT READY**  
**Escopo:** Normal, Team Lite, QA, GitHub Actions, Supabase, RLS, grants, SECURITY DEFINER, Realtime, Storage, migrations e Edge Functions.

## 1. Limites e método

- GitHub e Supabase foram inspecionados em modo read-only.
- Consultas SQL executadas nesta rodada foram exclusivamente `SELECT` sobre catálogo, contagens e metadados.
- Nenhum workflow foi disparado manualmente.
- Nenhum teste físico foi executado.
- Não houve merge, deploy, release, migration, publicação de userscript, alteração de secret/flag/policy/ACL ou operação destrutiva.
- A única escrita de repositório desta rodada é este novo relatório, em caminho inédito da branch QA. O arquivo `docs/RELEASE_READINESS.md` foi preservado.

As categorias abaixo são separadas:
- **CI:** resultado de workflow já executado, no SHA indicado.
- **Inspeção de código/configuração:** leitura estática de arquivos, bundles implantados e catálogo.
- **Manual:** teste físico no navegador/dispositivo, não executado nesta rodada.
- **Pendente/bloqueado:** depende de integração, ambiente isolado, teste físico ou aprovação humana.

## 2. Heads e integridade das referências

| Referência | HEAD | Observação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Branch não protegida |
| `qa/release-readiness-2026-11-04-master` | `783510d01f54dcf10102752c80175e3d558c88e2` | HEAD coincide com PR #82 |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Branch não protegida |
| QA alternativa `qa/release-readiness-2026-11-04` | `8f8b5fb3f01750907fb3e78f425ace4ffb45afab` | Não é a branch solicitada |

A comparação de QA com master retornou **288 commits à frente e 1 atrás**. O HEAD base registrado nas PRs #74 e #82 é `a9288ccf`, anterior ao HEAD atual de master.

O endpoint de rulesets do repositório retornou lista vazia. A API de branches confirmou `protected=false` para master e team-lite-official. A proteção específica da branch QA não foi confirmada separadamente.

### PRs principais

| PR | HEAD | Base | Commits / arquivos | CI observado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` | master | 887 / 90 | Validate + Smoke PASS |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` | team-lite-official | 59 / 10 | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` | team-lite-official | 386 / 57 | 110/110 autenticados e 16/16 não autenticados |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `783510d` | master | 288 / 144 | Validate FAIL |
| [#161 Normal](https://github.com/Reekyi/UpStatus/pull/161) | `557814d` | #74 | 12 / 10 | Validate + Smoke PASS no mesmo SHA |
| [#162 Voz](https://github.com/Reekyi/UpStatus/pull/162) | `fa8c9fa` | base anterior de #161 | 8 / 7 | Validate/Contract PASS, mas stack desatualizado |
| [#163 Voz](https://github.com/Reekyi/UpStatus/pull/163) | `00f357b` | #161 atual | 7 / 6 | Validate + Contract PASS |

As PRs auditadas continuam Draft e a consulta de reviews retornou zero reviews humanas para #74, #75, #76, #82, #161, #163, #154, #155 e #157.

## 3. CI e workflows

### Evidências positivas

- [#74 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [#74 Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS.
- [#76 Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): 110/110 autenticados e 16/16 não autenticados.
- [#161 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [#161 Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43479685445): SUCCESS no mesmo SHA `557814d`; 136/136 verificações autenticadas.
- [#163 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e [#163 Voice Contract](https://github.com/Reekyi/UpStatus/actions/runs/43488822237): SUCCESS.

O Smoke #161 cobriu WebRTC, áudio remoto, voz, compartilhamento de tela, mesh de três participantes, rate limit de sinalização, emissão de convites, consumo atômico de convite e cleanup das fixtures. É CI no laboratório, não teste físico nem prova de ambiente Full-Product TEST.

O teste #163 constrói objetos `Response` locais para validar o mapeamento `VOICE_ATTEMPT_ALREADY_ACTIVE => 409`. Não executa uma requisição HTTP real contra a Edge Function implantada. O runtime de laboratório continua na versão 32.

### Falhas de integração confirmadas

- [#82 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43494372082): `production updateURL mismatch`.
- [#80 Validate em develop](https://github.com/Reekyi/UpStatus/actions/runs/43498839846): `client signed upload helper missing`. O log indica divergência cliente/servidor; a assertion não deve ser removida.

### Candidatas de upload/avatar e atualidade das branches

- [#154](https://github.com/Reekyi/UpStatus/pull/154) e [#155](https://github.com/Reekyi/UpStatus/pull/155) passaram seus checks focados, mas seus heads estão, respectivamente, 24/32 e 30/32 commits à frente/atrás da QA atual. Os testes de paridade verificam strings e trechos de fonte; não enviam bytes reais ao Storage.
- [#157](https://github.com/Reekyi/UpStatus/pull/157) passou o teste de avatar, mas diverge da #76 em 9 commits à frente e 2 atrás. O teste executa helpers em VM e assertions estáticas, não um fluxo real autenticado com banco/Storage.
- [#159](https://github.com/Reekyi/UpStatus/pull/159) está 2 commits à frente e 14 atrás da QA atual. Não deve ser integrado sem reconciliação/rebase.

## 4. Bloqueio de versionamento e release Normal

A candidata #161 separa corretamente o destino de API do destino de distribuição, ambos usando a função `upstatus`. O master ainda deriva o updater de beta10 enquanto `release.json` aponta para `upstatus`, explicando o Validate da #82.

Há, porém, uma contradição no processo de release candidato:

- `release.json` e o artefato raiz `UpStatus.user.js` continuam em **3.4.7**.
- [`scripts/build.mjs` da #161](https://github.com/Reekyi/UpStatus/blob/fix/normal-api-target-aligned-rate-limit-20261113/scripts/build.mjs) exige uma versão estritamente superior à do artefato rastreado para sincronizar uma nova versão.
- [`deploy-production.yml` da #161](https://github.com/Reekyi/UpStatus/blob/fix/normal-api-target-aligned-rate-limit-20261113/.github/workflows/deploy-production.yml) aceita exclusivamente `3.4.7`.

Logo, a candidata não tem caminho demonstrado para publicar a próxima versão: o build exige incremento e o deploy rejeita qualquer versão diferente de 3.4.7. O workflow tem proteções positivas de branch master, SHA exato, projeto esperado e CLI fixa 2.122.1, mas o guard de versão precisa ser reconciliado antes de qualquer release.

## 5. Compatibilidade e autenticação dos runtimes

Inspeção dos handlers implantados:

| Produto | Runtime | Versão declarada no artefato | Mínimo de senha no login |
|---|---:|---:|---:|
| Normal | `upstatus` v480 / API beta10 | 3.4.7 | 6 |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | 4 |
| TEST | `upstatus-test` v281 | 3.3.28 | 4 |

A diferença de senha pode impedir que uma conta criada no Team Lite com quatro ou cinco caracteres entre pelo Normal.

Os handlers instalados ainda:
- Aceitam `POST /api/setup` sem `setupToken` de uso único.
- Mantêm fallback administrativo por nomes quando a role está vazia.
- Mantêm ações de limpeza do chat baseadas no nome Ricardo.
- Não apresentam rate limit de tentativas de login no código inspecionado.
- Mantêm sessões e perfis identificados por `user_name`, sem `user_id`.

A consulta agregada de produção encontrou cinco usuários, zero hashes de senha vazios, zero roles vazias e zero nomes duplicados **no estado atual**. Isso não substitui constraint UNIQUE: `users.name` não possui unicidade; a chave primária é `users.id`.

Em produção, não existem colunas `setup_token_*` nem RPC `consume_upstatus_setup_invite`. No laboratório foram encontrados quatro campos de setup-token e uma função de consumo. A candidata #161 protege o primeiro acesso com token de 256 bits, validade de 15 minutos, consumo atômico e rate limit de emissão de convites. Esse rate limit não é rate limit de login: não foi encontrada limitação distribuída de tentativas de senha na candidata.

## 6. Upload assinado e propriedade de avatar

A inspeção do runtime Team Lite implantado mostrou:
- `profileRoute` aceita URL sob o prefixo público `profile-images`, sem validar que o objeto pertence ao usuário autenticado.
- `signedUploadRoute` valida MIME e tamanho declarados pelo cliente, com limite de 20 MiB também para avatar.
- O ticket é criado com `createSignedUploadUrl`; o handler não inspeciona os bytes enviados.
- `sniffMime` no caminho legado retorna o MIME declarado quando não reconhece a assinatura do conteúdo.

A candidata #155 adiciona prefixo de avatar baseado em nome e limite declarado de 2 MiB. A #157 melhora o desenho ao derivar o prefixo de `users.id` e falhar fechado quando o nome não resolve exatamente um usuário. Entretanto:
- O perfil continua armazenado por `user_name`.
- A validação de tamanho do upload assinado continua baseada no campo declarado; não foi demonstrado limite de 2 MiB sobre os bytes efetivamente enviados.
- Os testes atuais são estáticos/VM, não testes de integração de upload.

Recomendação: validar bytes e tamanho real em fluxo de quarentena/finalização antes de tornar o objeto público; vincular avatar ao ID imutável e testar tentativas de trocar MIME, exceder limite e referenciar objeto de outro usuário. Não foi realizado teste de exploração.

## 7. Inventário Supabase e Edge Functions

Existem somente dois projetos:
- Produção: `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY.
- Laboratório signaling/auth: `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY.

Produção tem 38 Edge Functions ativas, 12 com prefixo `upstatus-test`. Runtimes relevantes: `upstatus` v480, `upstatus-team-lite` v15 e `upstatus-test` v281. O laboratório tem `upstatus-signal-test` v32 e um sentinel E2E v3. Não existe projeto Full-Product TEST independente.

As funções implantadas usam `verify_jwt=false`; isso não prova, isoladamente, acesso ao produto sem autenticação, pois os handlers usam sessão própria. Torna essencial validar cada rota antes de qualquer operação.

### Realtime

Consulta read-only encontrou **105 mensagens nos últimos 14 dias; 105/105 com `private=false`**. O pai `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado e zero policies. As sete partições diárias observadas estão com RLS desabilitado. Anon/authenticated têm SELECT, INSERT e UPDATE no transporte.

As três funções públicas de broadcast são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE para anon/authenticated. Todas retornam `trigger`; não foi demonstrada chamada direta como RPC PostgREST comum. O risco confirmado é a combinação de privilégios desnecessários, contexto SECURITY DEFINER e broadcast público. O evento de mensagens envia a linha completa via `to_jsonb(OLD/NEW)`.

### RLS, grants e ACL

Produção:
- Dez tabelas do schema public com RLS habilitado e zero policies.
- Nove tabelas concedem a anon e authenticated os sete privilégios de tabela, incluindo DELETE, TRUNCATE e UPDATE.
- São 18 concessões TRUNCATE diretas nessas tabelas.
- 120 entradas Default ACL para papéis clientes em schemas public, storage e GraphQL.
- Security Advisor: seis WARN e dez INFO.

Laboratório:
- Zero grants diretos a anon/authenticated nas tabelas public consultadas.
- Dezoito INFO de RLS sem policy.
- 96 entradas Default ACL amplas para anon/authenticated em public, storage e GraphQL.
- Security Advisor: zero WARN e dezoito INFO.

### Storage

Os buckets `chat-images` e `profile-images` são públicos, ambos com limite de 20 MiB. Existem 168 objetos de chat e 20 de perfil. Não há policies próprias em `storage.objects`. A configuração versionada diverge dos limites implantados.

## 8. Migrations e branches gerenciadas

- Ledger de produção: sete migrations.
- Ledger do laboratório: 38 migrations.
- Master contém somente três SQLs canônicos em `supabase/migrations`.
- Quatro fontes SQL históricas continuam ausentes do diretório canônico; o ledger não comprova a proveniência byte a byte.
- A branch gerenciada Supabase `main` aparece como `MIGRATIONS_FAILED`; o preview está saudável e o projeto de produção está ACTIVE_HEALTHY. O status da branch gerenciada não deve ser descrito como indisponibilidade do banco de produção.

## 9. Aceitação física e issues

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Reconexão Normal/Team Lite sem F5, reentrada na sala, chamadas após reconexão, ausência de peers/áudio/polling órfãos e teste manual continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados; 19 permanecem desmarcados.

Os resultados Chromium citados são CI automatizado. Não houve teste físico Tampermonkey, navegador com microfone/permissões reais, compartilhamento de tela instalado ou reconexão manual nesta rodada.

## 10. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Transporte observado permanece público e sem autorização privada |
| TEST-ISOLATION | blocked | Não existe Full-Product TEST independente |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais ausentes; branch Supabase main com migration failure |
| AUTH-03 | blocked | Setup-token e rate limit de login ausentes em produção; identidade segue por nome |
| ACL-STORAGE | blocked | Grants/Default ACL amplos, SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | pending | Issue #78 sem critérios físicos aprovados |
| HUMAN-REVIEW | pending | Nenhuma review humana e nenhuma autorização de release |

## 11. Próximos passos recomendados

1. Corrigir a paridade cliente/servidor do upload e acrescentar testes reais de bytes, tamanho, MIME e propriedade.
2. Reconciliar o guard de versão do build com o workflow de produção antes de incrementar a versão.
3. Revalidar #163 no fluxo HTTP real da Edge Function e manter o runtime v32 como bloqueado até atualização em ambiente isolado.
4. Reconciliar/rebasear #154/#155/#157/#159 antes de revisão; não integrar branches 14–32 commits atrás como estão.
5. Provisionar Full-Product TEST somente após cotação e autorização de Ricardo.
6. Implementar AUTH-03, rate limit de login e identidade por `users.id`.
7. Tornar Realtime privado/autenticado e restringir funções SECURITY DEFINER, RLS, grants e Default ACL.
8. Recuperar os quatro SQLs originais e reconciliar o estado da branch gerenciada.
9. Executar os oito testes físicos da Issue #78 e obter review/aprovação humana do SHA final.

## 12. Conclusão

**NOT READY.** A #161 passou Validate e Smoke no mesmo SHA e a #163 passou o contrato offline, mas a produção ainda não recebeu as proteções de autenticação, Realtime, ACL e Storage. O caminho de release também tem uma contradição de versão. Nenhuma aprovação humana ou teste físico foi apresentado.

Este relatório registra inspeção estática e CI existente; não declara correções de produto nem testes manuais.
