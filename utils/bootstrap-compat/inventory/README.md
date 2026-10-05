# Inventário estrutural conservador do spike

## Executar

```bash
node --test utils/bootstrap-compat/inventory/test-inventory.cjs
node utils/bootstrap-compat/inventory/inventory.cjs \
  utils/bootstrap-compat/inventory/baseline.css \
  utils/bootstrap-compat/candidate/app.css \
  utils/bootstrap-compat/inventory/results/candidate-diff.json
```

O código usa PostCSS fixado no toolchain isolado. `baseline.css` reúne o CSS principal congelado e o CSS adicional de bundles, somente para análise: não é servido como stylesheet. `baseline-provenance.json` registra os arquivos originais e seus hashes.

Cada ocorrência de comentário, at-rule, regra e declaração tem identidade, ordinal, posição original, condicionais, seletor, valor, important e texto. Duplicatas e fallbacks não são sobrescritos. O diff contabiliza os nós de ambos os lados; diferenças novas, removidas, alteradas ou de ordinal permanecem pendentes. AST não é o árbitro da renderização, portanto essas pendências não obrigam restaurar estrutura antiga.

O alinhamento é conservador, por assinatura contextual e posição dentro das repetições. Uma declaração removida pode aparecer como alteração seguida de remoção; o relatório preserva todas as ocorrências, não promete identificar a causa semanticamente mínima. Mudança de ordinal é só sinal de investigação: inserções anteriores também deslocam ordinais. Sintaxe CSS aceita pelo parser não significa semântica de cascade totalmente modelada. Não calcula vencedor, especificidade completa, herança ou equivalência de unidades. CSS que não é parseável bloqueia a execução.

`results/raw-bootstrap5-diff.json` compara o baseline completo do Mautic com o Bootstrap 5.3.8 oficial puro. Serve como triagem, não como resultado de migração: a ausência das customizações Mautic torna muitas diferenças esperadas. Não representa cobertura completa de consumidores nem aprovação do candidato.

Evidência TDD: logs `01/02` para inventário, `03/04` para contabilização de diff, `05/06` para CLI e falha de parsing. Todos os relatórios só podem ser consumidos se o comando terminou com exit code 0 e os hashes de entrada correspondem aos assets analisados. Não usar relatório antigo após falha de execução.
