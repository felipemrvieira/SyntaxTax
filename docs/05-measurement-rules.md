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
