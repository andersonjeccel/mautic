# Ações mais rápidas

Este registro reúne pequenas melhorias que reduzem repetição nos fluxos do Mautic sem esconder a decisão ou a consequência da ação.

## Detalhe da campanha: manter a aba de eventos

No detalhe de uma campanha, a aba escolhida em Eventos permanece aberta quando as estatísticas e os eventos são atualizados por AJAX. Antes, a atualização sempre devolvia a tela para Preview, obrigando a pessoa a reabrir Ações, Condições ou Contatos para continuar a conferência.

Fluxo antes: selecionar a aba de eventos, alterar o período, salvar e selecionar a aba novamente (4 ações).

Fluxo depois: selecionar a aba de eventos, alterar o período e salvar; a mesma aba continua aberta (3 ações).

A melhoria usa o mecanismo compartilhado de abas do Core. Ela não altera a campanha, seus eventos ou suas permissões.
