# Validation rules

## Regra de homologação

Nenhuma stack pode ser medida antes de passar no validador funcional.

## O validate.py deve verificar

- existência dos endpoints obrigatórios
- status HTTP corretos
- criação válida de usuários
- criação válida de produtos
- criação de pedidos com itens
- rejeição de pedido sem itens
- rejeição de quantity <= 0
- retorno de total calculado
- atualização de status do pedido
- listagem de pedidos com relacionamento

## Regra

Se qualquer validação falhar, a stack deve ser corrigida antes da medição.
