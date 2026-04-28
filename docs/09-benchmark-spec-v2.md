# Benchmark Spec

## Objetivo

Este documento define a especificação funcional atual do benchmark.

O objetivo é aproximar as stacks de uma API pequena mais realista, sem descaracterizar a metodologia e sem introduzir escopo indevido.

Este documento deve ser tratado como a referência funcional atual do benchmark, em conjunto com `docs/01-benchmark-spec.md`.

---

## Regra de conformidade

Uma stack só está em conformidade quando:

- implementa todos os requisitos deste documento
- passa integralmente no validador funcional atual

---

## Restrições preservadas

Continuam proibidos:

- autenticação
- autorização
- paginação
- cache
- mensageria
- jobs
- notificações
- busca full-text
- upload de arquivos
- integrações externas

Esta especificação deve aumentar realismo funcional, não alterar a natureza do benchmark.

---

## Regras obrigatórias

Todas as stacks devem implementar:

- filtro de listagem de pedidos por `status`
- filtro de listagem de pedidos por `user_id`
- filtro de listagem de produtos por `min_price`
- filtro de listagem de produtos por `max_price`
- validação de `price > 0`
- restrição de `status` a um conjunto fixo de valores válidos
- rejeição de transições inválidas de status
- retorno de `product_name` em cada item do pedido detalhado
- retorno de `item_count` em pedidos detalhados e em listagem de pedidos
- conflito explícito para e-mail duplicado

---

## Status válidos do pedido

Os status válidos passam a ser:

- `created`
- `paid`
- `shipped`
- `cancelled`

---

## Regras de transição de status

As stacks devem adotar exatamente estas transições:

- `created` -> `paid`
- `created` -> `cancelled`
- `paid` -> `shipped`
- `paid` -> `cancelled`

Transições inválidas devem retornar erro.

Exemplos de transições inválidas:

- `shipped` -> `created`
- `shipped` -> `paid`
- `cancelled` -> qualquer outro estado
- qualquer valor fora da lista de status válidos

---

## Endpoints adicionais

Nenhum novo endpoint é introduzido.

A expansão acontece sobre os endpoints já existentes.

### GET /products

Deve aceitar opcionalmente:

- `min_price`
- `max_price`

### GET /orders

Deve aceitar opcionalmente:

- `status`
- `user_id`

---

## Regras dos filtros

### Products

- `min_price` deve filtrar produtos com preço maior ou igual ao valor informado
- `max_price` deve filtrar produtos com preço menor ou igual ao valor informado
- quando ambos forem enviados, o filtro deve combinar os dois limites

### Orders

- `status` deve filtrar por status exato
- `user_id` deve filtrar por dono do pedido
- quando ambos forem enviados, o filtro deve combinar os dois critérios

### Regra geral

- filtros inválidos devem retornar erro HTTP apropriado
- ausência de filtro deve manter o comportamento atual de listagem completa

---

## Regras de validação adicionais

### User

- `email` deve ser único
- tentativa de criar usuário com e-mail já existente deve retornar conflito explícito

### Product

- `price` deve ser numérico
- `price` deve ser maior que zero

### Order

- `status` inicial do pedido continua sendo `created`
- atualização de status deve rejeitar valores inválidos
- atualização de status deve rejeitar transições inválidas

---

## Payloads esperados

### Listagem de produtos

O formato base continua livre para campos extras, mas cada item deve conter no mínimo:

- `id`
- `name`
- `price`

### Pedido detalhado

O pedido detalhado deve conter:

- `item_count`

Cada item deve conter:

- `product_id`
- `product_name`
- `quantity`
- `unit_price`

Exemplo:

```json
{
  "id": 1,
  "user": {
    "id": 1,
    "name": "Felipe"
  },
  "items": [
    {
      "product_id": 1,
      "product_name": "Notebook",
      "quantity": 2,
      "unit_price": 3500.0
    }
  ],
  "item_count": 1,
  "total": 7000.0,
  "status": "created",
  "created_at": "2026-01-01T10:00:00Z"
}
```

### Listagem de pedidos

Cada item da listagem de pedidos deve conter no mínimo:

- `id`
- `user`
- `items`
- `item_count`
- `total`
- `status`
- `created_at`

---

## Regras de erro adicionais

As implementações devem retornar erro ao menos nestes casos:

- criação de usuário com e-mail duplicado
- criação de produto com `price <= 0`
- uso de `status` inválido em filtro
- uso de `status` inválido em update
- tentativa de transição inválida de status
- uso de filtros com tipo inválido

Os códigos HTTP específicos podem variar entre `400`, `409` e `422`, desde que sejam coerentes e estáveis na metodologia.

---

## Critério metodológico

Esta especificação foi desenhada para:

- aumentar o corpus funcional sem introduzir features externas ao domínio
- exigir mais leitura, modelagem e validação
- preservar comparabilidade entre stacks
- continuar compatível com implementações idiomáticas pequenas

---

## O que esta spec evita deliberadamente

Esta spec NÃO adiciona:

- autenticação
- paginação
- admin
- observabilidade distribuída
- filas
- webhooks
- integrações externas
- módulos artificiais sem impacto no domínio

O benchmark continua medindo um app pequeno, não um sistema corporativo.
