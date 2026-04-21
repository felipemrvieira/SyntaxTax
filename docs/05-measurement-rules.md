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

## Exclusões

- spec
- test
- node_modules
- vendor
- .venv
- dist
- build

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

## Interpretação da categoria `domain`

A categoria `domain` deve refletir onde a modelagem estrutural e os contratos centrais do domínio realmente vivem em cada stack.

Isso pode variar por ecossistema:

- entidades ORM podem carregar a modelagem principal
- schemas e contratos de validação podem fazer parte da definição de domínio
- em stacks com Prisma, `prisma/schema.prisma` faz parte central dessa modelagem estrutural

O objetivo da categorização é representar a função real dos arquivos, não forçar simetria visual entre stacks.
