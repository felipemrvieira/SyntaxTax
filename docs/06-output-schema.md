# Output schema

## Estrutura

Cada stack deve gerar um JSON em `results/raw/`.

## Campos obrigatórios

- stack_id
- metadata
- tooling
- audit
- warnings
- manifest
- totals
- views

## Convenções

- usar `totals`
- usar `file_count`

## Exemplo mínimo

```json
{
  "stack_id": "fastapi",
  "metadata": {
    "language": "python",
    "framework": "fastapi",
    "orm": "sqlalchemy"
  },
  "totals": {
    "tokens": 1200,
    "loc": 150,
    "file_count": 8,
    "chars": 9000
  }
}
```
