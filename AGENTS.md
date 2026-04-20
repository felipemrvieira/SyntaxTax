# AGENTS.md

## Propósito deste arquivo

Este arquivo define como agentes de IA (como Codex) devem operar dentro deste repositório.

Ele tem prioridade sobre instruções implícitas.  
Siga este documento rigorosamente antes de executar qualquer tarefa.

---

## Contexto do projeto

Este repositório contém o projeto **StackSpeak Benchmark**, cujo objetivo é:

> Comparar o custo de tokens para LLMs ao implementar funcionalidades equivalentes em diferentes stacks web modernas.

Este é um benchmark metodológico, não um projeto de aplicação tradicional.

---

## Regra principal

Você NÃO está aqui para criar uma aplicação livre.

Você está aqui para executar um experimento controlado.

---

## Fonte da verdade

Antes de modificar qualquer arquivo:

1. Leia TODOS os arquivos dentro da pasta `/docs`
2. Leia o `benchmark_config.yaml`
3. Trate esses arquivos como fonte única da verdade

Se houver conflito entre código e documentação:

- a documentação prevalece

---

## Papel do agente

Você atua como:

- executor disciplinado
- implementador técnico
- seguidor de protocolo

Você NÃO atua como:

- arquiteto criativo
- designer de produto
- autor livre de código

---

## Regras obrigatórias

### 1. Não expandir escopo

Implemente apenas o que está explicitamente definido.

É proibido adicionar:

- autenticação
- paginação
- cache
- mensageria
- CORS customizado desnecessário
- Dockerfiles
- pipelines CI/CD
- testes fora do protocolo
- qualquer funcionalidade não especificada

---

### 2. Idiomaticidade é obrigatória

O código deve ser idiomático para a stack.

Evite:

- Ruby com estilo Java
- Python com estilo JavaScript
- Node com estrutura enterprise artificial

Use:

- convenções nativas
- padrões comuns da comunidade
- recursos do framework

---

### 3. Proibir overengineering

Não introduza:

- camadas extras desnecessárias
- clean architecture forçada
- repositórios abstratos sem necessidade
- services artificiais
- DTOs redundantes

A implementação deve ser:

- mínima
- clara
- funcional
- idiomática

---

### 4. Respeitar a stack matrix

Não altere:

- linguagem
- framework
- ORM

Essas escolhas estão congeladas em `docs/02-stack-matrix.md`.

---

### 5. Scaffolding permitido com cautela

Você pode usar CLI nativa do framework (ex: Rails, Django, NestJS).

Mas:

- mantenha rastreabilidade
- não ignore arquivos gerados
- respeite regras de medição

---

### 6. Não alterar metodologia

É proibido:

- alterar regras de medição
- alterar regras de validação
- alterar estrutura de output
- alterar categorias do benchmark

Sem instrução explícita.

---

### 7. Ambiguidade deve ser registrada

Se encontrar algo ambíguo:

- NÃO assuma silenciosamente
- registre claramente a dúvida
- faça a escolha mais conservadora possível

---

## Ordem obrigatória de execução

Você deve seguir esta sequência:

### Fase 1 — infraestrutura

- benchmark_config.yaml (já existente)
- measure.py
- collect.py

### Fase 2 — validação

- validate.py

### Fase 3 — piloto

- implementar:
  - FastAPI
  - Rails
  - Express

### Fase 4 — revisão

- ajustar com base no piloto

### Fase 5 — expansão

- implementar demais stacks

---

## Regra de validação

Nenhuma stack pode ser considerada pronta sem:

- passar em TODOS os testes de `validate.py`

Se falhar:

- corrigir antes de medir

---

## Regra de medição

Antes de rodar medição:

- garantir equivalência funcional
- garantir que arquivos seguem categorias do YAML
- garantir ausência de arquivos proibidos

A medição deve:

- seguir `pure_content_only`
- usar ordenação estável
- gerar hashes
- gerar JSON auditável

---

## Critério de conclusão de tarefa

Uma tarefa só está concluída quando:

- respeita a spec funcional
- respeita regras de implementação
- respeita regras de validação
- respeita regras de medição
- produz artefatos no formato correto

---

## Comportamentos proibidos

- criar arquivos fora da estrutura definida sem necessidade
- ignorar documentação
- simplificar regras metodológicas
- “melhorar” o benchmark por conta própria
- otimizar código apenas para reduzir tokens
- alterar stack para facilitar implementação

---

## Princípio final

Este projeto mede stacks reais, não versões artificiais otimizadas.

Portanto:

> fidelidade à stack é mais importante que concisão artificial
