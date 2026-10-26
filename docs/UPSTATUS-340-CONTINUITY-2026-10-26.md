PR #73: Estado de validação

- A PR continua draft; CI de build/validate passou no commit merge a1f7ac8.
- Produção `upstatus`: deploy 459, versão 3.3.1, hash conhecido 12e0237c98957b203e5f0bdb3cd81aebf04916ae419836abd98446faabca390a.
- Teste `upstatus-test`: deploy 238, versão 3.2.6-beta7, hash ff95a6884a04ab9d6dfaa07c44c6ad7b56107c6e7e99514a6f94a393c2464eee. A função serve template antigo e marcador de rota `/upstatus` além da rota de teste.
- Branch `release/3.4.0-chat-composer`: o template tem as novas funções de anexo pendente/link preview, mas possui ~421k chars; o userscript embutido em produção é ~498k chars e inclui recursos que não estão no template.
- Não fazer deploy do build atual ainda: `scripts/build.mjs` recria `supabase/functions/upstatus/index.ts` e `upstatus-test/index.ts` a partir do template, o que arriscaria substituir um backend de produção com funcionalidades perdidas.
- Próxima etapa segura: integrar seletivamente o patch do PR sobre o userscript embutido 3.3.1 recuperado/validado, mantendo o servidor/template de produção como base, depois gerar apenas a função `upstatus-test` e validar hash, versionamento e rotas antes de deploy.
