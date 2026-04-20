# Benchmark Spec

## Domínio

Mini sistema de pedidos.

---

## Entidades

- User
- Product
- Order
- OrderItem

---

## Regras obrigatórias

- criar usuário
- listar usuários
- buscar usuário por id
- criar produto
- listar produtos
- buscar produto por id
- criar pedido com 1 ou mais itens
- listar pedidos com itens e usuário
- buscar pedido por id com detalhes
- atualizar status do pedido
- impedir criação de pedido sem itens
- impedir quantity <= 0
- calcular total do pedido
- validar campos obrigatórios

---

## Endpoints obrigatórios

### Users

- POST /users
- GET /users
- GET /users/:id

---

### Products

- POST /products
- GET /products
- GET /products/:id

---

### Orders

- POST /orders
- GET /orders
- GET /orders/:id
- PATCH /orders/:id/status

---

## Exemplos de payload

### Criar usuário

````json
{
  "name": "Felipe",
  "email": "felipe@example.com"
}```
Criar produto
```json
{
  "name": "Notebook",
  "price": 3500.00
}```
Criar pedido
```json
{
  "user_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ]
}```
Atualizar status do pedido
```json{
  "status": "paid"
}
````

Resposta esperada (pedido)

Um pedido detalhado deve conter:

id
user
items
total
status
created_at

Exemplo:

````json
{
  "id": 1,
  "user": {
    "id": 1,
    "name": "Felipe"
  },
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 3500.00
    }
  ],
  "total": 7000.00,
  "status": "created",
  "created_at": "2026-01-01T10:00:00Z"
}```
Regras de erro

As implementações devem:

retornar erro ao criar pedido sem itens
retornar erro se quantity <= 0
validar campos obrigatórios
retornar status HTTP apropriado (400, 422, etc.)
Regra de equivalência funcional

Uma stack só pode ser considerada pronta quando:

todos os endpoints obrigatórios existem
todas as regras de negócio estão implementadas
a persistência está funcional
os dados retornados são coerentes
o validate.py passa completamente
Observação importante

A implementação deve ser:

funcionalmente equivalente entre stacks
idiomática para cada linguagem/framework
mínima (sem funcionalidades extras)

Qualquer divergência funcional invalida a comparação.
````
