# Output schema

## Estrutura

Cada stack medida deve gerar um JSON em `results/raw/<stack_id>.json`.

Os campos obrigatórios no topo do documento são:

- `stack_id`
- `metadata`
- `tooling`
- `audit`
- `warnings`
- `manifest`
- `totals`
- `views`

## Estrutura completa

```json
{
  "stack_id": "fastapi",
  "metadata": {
    "language": "python",
    "category": "api_first",
    "framework": "fastapi",
    "orm": "sqlalchemy"
  },
  "tooling": {
    "python_version": "3.12.3",
    "tokenizer": "cl100k_base",
    "tiktoken_version": "0.9.0",
    "pyyaml_version": "6.0.2",
    "metrics": ["tokens", "loc", "file_count", "chars"],
    "tokenization_strategy": "pure_content_only",
    "file_ordering": "alphabetical_stable",
    "loc_semantics": "raw_text_lines"
  },
  "audit": {
    "generated_at": "2026-04-20T12:00:00Z",
    "config_path": "benchmark_config.yaml",
    "stack_root": "stacks/fastapi-app",
    "corpus_sha256": "9a2f0d...",
    "manifest_sha256": "59c3ab..."
  },
  "warnings": [
    "stack=fastapi view=handwritten category=api pattern=routers/**/*.py produced no matches"
  ],
  "manifest": [
    {
      "path": "main.py",
      "view": "handwritten",
      "category": "api",
      "tokens": 120,
      "loc": 18,
      "chars": 640,
      "file_count": 1,
      "file_sha256": "2b8f4c...",
      "size_bytes": 640
    }
  ],
  "totals": {
    "tokens": 1200,
    "loc": 150,
    "file_count": 8,
    "chars": 9000
  },
  "views": {
    "handwritten": {
      "totals": {
        "tokens": 900,
        "loc": 110,
        "file_count": 5,
        "chars": 6500
      },
      "categories": {
        "domain": {
          "totals": {
            "tokens": 250,
            "loc": 30,
            "file_count": 2,
            "chars": 1800
          },
          "files": [
            {
              "path": "models/user.py",
              "view": "handwritten",
              "category": "domain",
              "tokens": 120,
              "loc": 14,
              "chars": 500,
              "file_count": 1,
              "file_sha256": "aa11...",
              "size_bytes": 500
            }
          ]
        },
        "api": {
          "totals": {
            "tokens": 650,
            "loc": 80,
            "file_count": 3,
            "chars": 4700
          },
          "files": [
            {
              "path": "main.py",
              "view": "handwritten",
              "category": "api",
              "tokens": 120,
              "loc": 18,
              "chars": 640,
              "file_count": 1,
              "file_sha256": "2b8f4c...",
              "size_bytes": 640
            }
          ]
        },
        "persistence": {
          "totals": {
            "tokens": 0,
            "loc": 0,
            "file_count": 0,
            "chars": 0
          },
          "files": []
        }
      }
    },
    "operational_extras": {
      "totals": {
        "tokens": 300,
        "loc": 40,
        "file_count": 3,
        "chars": 2500
      },
      "categories": {
        "config": {
          "totals": {
            "tokens": 200,
            "loc": 20,
            "file_count": 2,
            "chars": 1400
          },
          "files": []
        },
        "migrations": {
          "totals": {
            "tokens": 100,
            "loc": 20,
            "file_count": 1,
            "chars": 1100
          },
          "files": []
        }
      }
    }
  }
}
```

## Campos do topo

### `stack_id`

Identificador da stack medida, igual à chave da stack em `benchmark_config.yaml`.

Exemplos:

- `fastapi`
- `rails`
- `express`

### `metadata`

Metadados declarativos da stack, copiados de `benchmark_config.yaml`.

Campos esperados:

- `language`
- `category`
- `framework`
- `orm`

### `tooling`

Informações do ambiente e das regras de medição usadas na geração do JSON.

Campos:

- `python_version`: versão do Python que executou `measure.py`
- `tokenizer`: nome do tokenizer configurado
- `tiktoken_version`: versão instalada de `tiktoken`, ou `null` se indisponível
- `pyyaml_version`: versão instalada de `PyYAML`, ou `null` se indisponível
- `metrics`: lista das métricas configuradas
- `tokenization_strategy`: estratégia de tokenização aplicada
- `file_ordering`: regra de ordenação aplicada aos arquivos
- `loc_semantics`: semântica de `loc`

Valor atual de `loc_semantics`:

- `raw_text_lines`

### `audit`

Informações de auditoria para rastreabilidade do resultado.

Campos:

- `generated_at`: timestamp UTC em formato ISO 8601 com sufixo `Z`
- `config_path`: caminho relativo do arquivo de configuração usado
- `stack_root`: caminho relativo da raiz da stack medida
- `corpus_sha256`: hash SHA-256 do corpus medido
- `manifest_sha256`: hash SHA-256 do manifest serializado

### `warnings`

Lista de warnings gerados durante a medição.

Casos típicos:

- glob com zero matches
- categoria com patterns definidos, mas sem arquivos resultantes

É uma lista de strings. Pode ser vazia.

### `manifest`

Lista plana e auditável com granularidade por arquivo.

Cada item do `manifest` representa exatamente um arquivo medido.

Campos obrigatórios de cada item:

- `path`
- `view`
- `category`
- `tokens`
- `loc`
- `chars`
- `file_count`
- `file_sha256`
- `size_bytes`

#### Significado dos campos do manifest

- `path`: caminho relativo do arquivo dentro da raiz da stack
- `view`: visão à qual o arquivo pertence, atualmente `handwritten` ou `operational_extras`
- `category`: categoria dentro da view, como `domain`, `api`, `persistence`, `config` ou `migrations`
- `tokens`: total de tokens do conteúdo puro do arquivo
- `loc`: contagem bruta de linhas de texto do arquivo
- `chars`: total de caracteres Unicode do conteúdo decodificado em UTF-8
- `file_count`: sempre `1` em cada item do manifest
- `file_sha256`: hash SHA-256 dos bytes originais do arquivo
- `size_bytes`: tamanho bruto do arquivo em bytes

### `totals`

Totais agregados da stack inteira.

Campos:

- `tokens`
- `loc`
- `file_count`
- `chars`

Todos são inteiros.

### `views`

Agregação hierárquica por visão e por categoria.

Estrutura:

- `views.<view_name>.totals`
- `views.<view_name>.categories.<category_name>.totals`
- `views.<view_name>.categories.<category_name>.files`

As views atuais são:

- `handwritten`
- `operational_extras`

## Estrutura de `views`

### `views.<view_name>.totals`

Totais agregados de todos os arquivos daquela view.

Formato:

```json
{
  "tokens": 900,
  "loc": 110,
  "file_count": 5,
  "chars": 6500
}
```

### `views.<view_name>.categories`

Mapa de categorias da view.

Cada categoria contém:

- `totals`: totais agregados da categoria
- `files`: lista de arquivos da categoria

Formato:

```json
{
  "api": {
    "totals": {
      "tokens": 650,
      "loc": 80,
      "file_count": 3,
      "chars": 4700
    },
    "files": [
      {
        "path": "main.py",
        "view": "handwritten",
        "category": "api",
        "tokens": 120,
        "loc": 18,
        "chars": 640,
        "file_count": 1,
        "file_sha256": "2b8f4c...",
        "size_bytes": 640
      }
    ]
  }
}
```

## Convenções de métricas

### `loc`

`loc` significa `raw_text_lines`.

Isto quer dizer:

- é contagem bruta de linhas do texto do arquivo
- não é contagem semântica de linhas de código
- não distingue código, comentário ou linha em branco

### `size_bytes`

`size_bytes` é o tamanho bruto do arquivo em bytes, antes de qualquer interpretação semântica.

### `chars`

`chars` é a quantidade de caracteres do conteúdo decodificado em UTF-8.

### `file_count`

Nos agregados, `file_count` representa a quantidade de arquivos somados.

No `manifest` e em `views.*.categories.*.files`, `file_count` é sempre `1`.

## Consistência com as regras de medição

Este schema deve permanecer compatível com `docs/05-measurement-rules.md`:

- tokenização com `cl100k_base`
- estratégia `pure_content_only`
- ordenação alfabética estável
- hashes `corpus_sha256` e `manifest_sha256`
- granularidade por arquivo, categoria, view e stack
