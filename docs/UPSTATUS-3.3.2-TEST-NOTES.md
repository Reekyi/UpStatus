# UpStatus 3.3.2 - build de teste

Base: backup exato da produção 3.3.1 (SHA-256 original: 12e0237c98957b203e5f0bdb3cd81aebf04916ae419836abd98446faabca390a).

## Alterações neste build
- Versão do userscript e do endpoint: 3.3.2.
- Metadados de horário/ticks reforçados para formar um rodapé de balão alinhado à direita, com o texto em bloco e quebras de linha.
- Imagens recebidas mostram estado borrado durante o carregamento e removem o efeito quando a imagem termina de carregar.
- Gravação: clicar novamente no microfone cancela; o botão azul encerra e envia; ícones, placeholder e rótulos mudam durante a gravação; o limite de 30 segundos já existente continua ativo.
- Seletor de emojis ampliado e dividido em categorias com navegação por categoria.
- Texto `.session-detail__empty-text` da tela de espera recebe edição inline com lápis/confirmação e persistência local; texto vazio restaura o padrão.

## Deliberadamente fora deste build
- Integração com Tenor/GIFs não foi implementada, para não aumentar o risco nas correções prioritárias.
- Pré-visualização de anexos antes do envio não foi implementada.
- O balão intermediário de envio de imagem não foi alterado diretamente porque a mensagem é gerada pelo fluxo de upload; este build melhora a exibição da imagem recebida enquanto carrega, mas precisa ser avaliado no uso real.

## Verificações
- Deploy do endpoint de teste concluído e ativo.
- Endpoint de teste serve `@version 3.3.2` e aponta suas próprias URLs de update/download para `upstatus-test`.
- Endpoint de produção permanece em `3.3.1`, deployment 463, com o hash original preservado.
- A validação visual dentro do Sale Smartly ainda depende de teste no navegador; este build não deve ser tratado como versão estável.
