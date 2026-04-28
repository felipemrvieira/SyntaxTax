# Validation rules

## Objetivo

Este documento define como a especificação funcional atual deve ser homologada.

Ele complementa:

- `docs/04-validation-rules.md`
- `docs/09-benchmark-spec-v2.md`

---

## Regra de homologação

Nenhuma stack pode ser considerada pronta antes de passar integralmente no validador funcional atual.

---

## Princípio

O validador funcional atual deve verificar:

- equivalência funcional
- estrutura mínima dos payloads novos
- comportamento de filtros
- regras de transição de status
- semântica estável de erro nos casos adicionais

---

## Regras HTTP congeladas

Para remover ambiguidade entre stacks, o benchmark passa a exigir os seguintes códigos:

### `409 Conflict`

Deve ser usado para:

- criação de usuário com e-mail duplicado
- tentativa de transição inválida de status

### `422 Unprocessable Entity`

Deve ser usado para:

- `price <= 0`
- `status` inválido no update de pedido
- `status` inválido em filtro
- `user_id` inválido em filtro
- `min_price` inválido
- `max_price` inválido

### `404 Not Found`

Deve continuar sendo usado para:

- usuário inexistente
- produto inexistente
- pedido inexistente

---

## O validador deve verificar

### Users

- criação válida de usuário
- rejeição de e-mail duplicado com `409`

### Products

- criação válida de produto com `price > 0`
- rejeição de produto com `price <= 0` usando `422`
- listagem com filtro `min_price`
- listagem com filtro `max_price`
- listagem com combinação `min_price + max_price`
- rejeição de `min_price` inválido com `422`
- rejeição de `max_price` inválido com `422`

### Orders

- criação de pedido continua retornando `status = created`
- pedido detalhado contém `item_count`
- pedido detalhado contém `product_name` em cada item
- listagem de pedidos contém `item_count`
- listagem com filtro por `status`
- listagem com filtro por `user_id`
- listagem com combinação `status + user_id`
- rejeição de `status` inválido em filtro com `422`
- rejeição de `user_id` inválido em filtro com `422`
- atualização válida `created -> paid`
- atualização válida `paid -> shipped`
- atualização válida `created -> cancelled`
- rejeição de valor de status inválido com `422`
- rejeição de transição inválida com `409`

---

## Dados mínimos que o validador deve preparar

O validador deve criar ao menos:

- 2 usuários
- 3 produtos com preços diferentes
- 3 pedidos com status diferentes ao longo do fluxo

Isso é necessário para validar filtros e transições sem falsos positivos.

---

## Regras de filtros

### `GET /products?min_price=<value>`

O validador deve confirmar que:

- todos os itens retornados têm `price >= min_price`
- nenhum item abaixo do limite aparece

### `GET /products?max_price=<value>`

O validador deve confirmar que:

- todos os itens retornados têm `price <= max_price`
- nenhum item acima do limite aparece

### `GET /products?min_price=<a>&max_price=<b>`

O validador deve confirmar que:

- todos os itens retornados estão dentro da faixa

### `GET /orders?status=<value>`

O validador deve confirmar que:

- todos os pedidos retornados têm exatamente o status filtrado

### `GET /orders?user_id=<id>`

O validador deve confirmar que:

- todos os pedidos retornados pertencem ao usuário informado

### `GET /orders?status=<value>&user_id=<id>`

O validador deve confirmar que:

- todos os pedidos retornados satisfazem os dois critérios

---

## Estrutura mínima dos payloads

### Order detail

O validador deve exigir:

- `id`
- `user`
- `items`
- `item_count`
- `total`
- `status`
- `created_at`

### Order item

O validador deve exigir:

- `product_id`
- `product_name`
- `quantity`
- `unit_price`

### Order list item

O validador deve exigir:

- `id`
- `user`
- `items`
- `item_count`
- `total`
- `status`
- `created_at`

---

## Regra de ordenação

Onde a stack já retorna listagens completas, o validador deve continuar assumindo ordenação estável por criação/id crescente.

Isso evita ambiguidade nos asserts de filtros.

---

## Regra final

Se qualquer teste falhar:

- a stack não está pronta para medição
- a implementação deve ser corrigida antes de qualquer nova coleta

Este documento congela a semântica funcional atual antes da medição.
