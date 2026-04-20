# Implementation rules

## Princípios

- implementar estritamente o que está na benchmark spec
- usar estilo idiomático da stack
- preferir recursos nativos do framework
- manter a solução pequena, clara e funcional

## Proibições

Não adicionar:

- autenticação
- paginação
- cache
- CORS customizado além do mínimo necessário
- Dockerfiles
- mensageria
- testes adicionais fora do protocolo
- clean architecture, repositórios ou abstrações extras se não forem exigidos pela stack de forma idiomática

## Idiomaticidade

O código deve soar natural para a stack escolhida.
Evite escrever Ruby com estilo de Java, Python com estilo de JavaScript, ou Node com estrutura artificialmente enterprise sem necessidade.

## Scaffolding

É permitido usar scaffolding e CLI nativa do framework, desde que os artefatos gerados sejam rastreáveis e compatíveis com as regras de medição.
