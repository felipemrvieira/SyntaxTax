# Measurement rules

## Tokenização

- tokenizer: cl100k_base
- strategy: pure_content_only
- file ordering: alphabetical stable

## Visões

### handwritten

Código diretamente escrito para implementar a lógica.

### operational_extras

Configuração, migrations e infraestrutura mínima.

## Matriz oficial de leitura

As medições devem ser interpretadas por três métricas oficiais:

- `handwritten_tokens`
- `total_tokens`
- `operational_ratio`

### `handwritten_tokens`

É a soma dos tokens da view `handwritten`.

Interpretação:

- custo de contexto funcional
- métrica principal do benchmark
- melhor proxy para tarefas de implementação, leitura e manutenção da lógica da aplicação

### `total_tokens`

É a soma de todos os tokens medidos na stack.

Interpretação:

- custo de contexto bruto do corpus selecionado
- métrica complementar
- útil para estimar o peso total do repositório medido sobre uma LLM

Observação:

`total_tokens` inclui todo o corpus medido, mas esse corpus exclui lockfiles de dependência. O objetivo é evitar que metadados de resolução de pacote distorçam a comparação funcional entre stacks.

### `operational_ratio`

É a razão entre `operational_extras.tokens` e `total_tokens`.

Interpretação:

- indicador de overhead estrutural
- métrica explicativa
- não deve ser usada como ranking isolado da qualidade da stack

## Regra de apresentação dos resultados

Qualquer tabela, CSV analítico, dashboard ou resumo textual deve:

- destacar `handwritten_tokens` como ranking principal
- mostrar `total_tokens` como leitura complementar
- mostrar `operational_ratio` para explicar diferenças de overhead

Não tratar `total_tokens` sozinho como verdade metodológica final.

## Exclusões

- spec
- test
- node_modules
- vendor
- .venv
- dist
- build
- package-lock.json
- composer.lock
- Gemfile.lock
- go.sum

## Regra para manifests e lockfiles

Arquivos de manifesto mantidos por humanos entram no corpus medido, porque ajudam a entender a configuração real da stack.

Entram:

- `package.json`
- `composer.json`
- `Gemfile`
- `go.mod`

Lockfiles de dependência ficam fora do corpus medido.

Ficam fora:

- `package-lock.json`
- `composer.lock`
- `Gemfile.lock`
- `go.sum`

## Regras adicionais

### Glob sem match

Deve gerar warning.

### Arquivos duplicados

Se um arquivo aparecer em mais de uma categoria:

- o processo deve falhar

### Categorias vazias

Devem gerar warning.

### Delimitadores

Delimitadores não entram na contagem de tokens.

### Hashes

- corpus_sha256
- manifest_sha256

## Granularidade

Registrar métricas por:

- arquivo
- categoria
- view
- stack

## Observação sobre taxonomia

A medição continua baseada na função real dos arquivos em cada stack, conforme definido no `benchmark_config.yaml`.

Isso significa que:

- algumas migrations podem permanecer em `handwritten.persistence`
- alguns contratos estruturais podem ficar em `domain`
- alguns artefatos operacionais ainda podem pesar muito no `total_tokens`, mesmo sem lockfiles

Essa assimetria é aceitável desde que seja auditável e explicitamente interpretada pela matriz acima.

## Notas de classificação auditáveis

As escolhas abaixo existem para tornar a categorização defensável quando a estrutura da stack não se encaixa de forma perfeitamente simétrica nas demais.

### Migrations em `handwritten.persistence`

Quando migrations definem ou evoluem a estrutura real do banco da aplicação, elas contam como implementação persistente handwritten.

Justificativa:

- codificam schema, constraints e evolução estrutural da aplicação
- participam diretamente da lógica persistente entregue pelo app
- não são tratadas como mero setup operacional de framework

### `prisma/schema.prisma` em `domain`

Nas stacks com Prisma, `prisma/schema.prisma` entra em `handwritten.domain`.

Justificativa:

- concentra a modelagem estrutural central das entidades e relações
- define contratos fundamentais do domínio persistido
- exerce papel análogo ao núcleo da modelagem em stacks onde esse desenho vive em entidades ORM

Stacks afetadas:

- `express`
- `nestjs`

### `slim` com `domain` vazio

A stack `slim` mantém `handwritten.domain` vazio.

Justificativa:

- a implementação não introduz camada separada de modelagem de domínio
- a estrutura funcional vive principalmente em handlers, configuração mínima e persistência via PDO/SQL
- forçar uma camada `domain` artificial violaria a regra de não introduzir overengineering

## Interpretação da categoria `domain`

A categoria `domain` deve refletir onde a modelagem estrutural e os contratos centrais do domínio realmente vivem em cada stack.

Isso pode variar por ecossistema:

- entidades ORM podem carregar a modelagem principal
- schemas e contratos de validação podem fazer parte da definição de domínio
- em stacks com Prisma, `prisma/schema.prisma` faz parte central dessa modelagem estrutural

O objetivo da categorização é representar a função real dos arquivos, não forçar simetria visual entre stacks.
