# UpStatus — Prompt de continuidade para novos chats

Antes de executar qualquer alteração, leia integralmente `docs/UPSTATUS_RELEASE_PROTOCOL.md` no repositório GitHub e cumpra o protocolo.

Você está continuando o desenvolvimento do UpStatus. Não comece do zero e não confie apenas no contexto do chat anterior. Faça onboarding técnico real:

1. Consulte o GitHub: repositório `Reekyi/UpStatus`, branch padrão `master`, commits recentes, branches, release manifest, changelog, README, scripts de build/validação, workflows de deploy e o código-fonte relevante à tarefa.
2. Consulte o Supabase na organização `UpStatus Revived`:
   - Produção: projeto `upstatus-normal`, ref `mvjqunhjxkbfcrxkjtgf`.
   - Staging: projeto `UpStatus Staging`, ref `akbgmmpnnpwcwgcfrltw`.
   Confirme saúde, Edge Functions, migrations e estrutura relevante. Use logs/advisors quando apropriado.
3. Compare as evidências atuais com o protocolo de continuidade. Se houver divergência, informe-a claramente e prefira o estado efetivamente observado no ambiente para dizer o que está rodando. Atualize o protocolo e o changelog quando o estado de release mudar.
4. Só então resuma o estado do projeto e proponha o próximo passo, preservando arquitetura, dados e funcionalidades existentes.

## Regra de versões obrigatória

No checkpoint de 27/11/2026:
- Oficial: **3.4.9**
- Beta ativa: **nenhuma**
- Próxima beta: **3.5.0-beta.1**

Toda mudança solicitada deve primeiro virar uma versão beta isolada e testável, nunca uma atualização direta em produção. O ciclo é:

`3.4.9 (oficial) → 3.5.0-beta.1 → 3.5.0-beta.2 ... → aprovação explícita do Ricardo → 3.5.0 oficial`

Nunca promova automaticamente. Só publique uma versão oficial quando Ricardo disser claramente que testou e aprovou ou autorizar explicitamente o lançamento. Se uma beta falhar, registre o resultado e incremente o número beta, sem reutilizá-lo.

## Segurança e qualidade

- Nunca teste alterações diretamente na produção.
- Nunca faça deploy beta no projeto Supabase de produção ou na URL oficial do userscript.
- Use o projeto Staging para betas e confirme que dados, storage, Realtime, canais, namespace e URLs de atualização estão isolados.
- Antes de alterar código, examine a implementação atual e o impacto em outras funcionalidades.
- Execute build, validações e testes de regressão. Inspecione os diffs e artefatos gerados.
- Preserve dados e compatibilidade. Mudanças destrutivas exigem explicação e autorização explícita.
- Não faça alterações em banco sem inspecionar tabelas, RLS e migrations.
- Não crie projetos/branches do Supabase que possam gerar custos sem consultar o custo real e obter autorização.
- Nunca grave secrets, tokens, senhas ou chaves privadas no código ou no GitHub.
- Não diga que algo foi testado, publicado, corrigido ou implantado sem evidência verificável.
- Antes de qualquer ação com impacto em produção, explique precisamente o que mudará e peça aprovação explícita.

## Ao final do onboarding

Apresente um quadro curto com:
- versão oficial;
- versão beta (ou “nenhuma”);
- branch e último commit;
- estado do Staging;
- estado da Produção;
- validações observadas;
- alertas ou divergências;
- próximo passo seguro.

Depois, aguarde/execute a demanda do Ricardo sem recomeçar a arquitetura do projeto.
