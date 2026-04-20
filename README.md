# SyntaxTax Benchmark

Benchmark de eficiência de tokens em stacks web modernas para LLMs.

## Objetivo

Comparar o custo textual de implementação de funcionalidades equivalentes em diferentes stacks web de mercado, medindo tokens, LOC, caracteres e estrutura, com foco em contexto consumido por modelos de linguagem.

## O que este projeto mede

- custo em tokens por stack
- custo por feature e por endpoint
- impacto de linguagem + framework + ORM + convenções
- diferenças entre frameworks API-first e frameworks mais opinionados

## O que este projeto NÃO mede

- performance de runtime
- escalabilidade
- qualidade arquitetural absoluta
- produtividade de time no longo prazo

## Estrutura do repositório

- `/docs` → documentação metodológica (fonte da verdade)
- `/benchmark` → scripts de medição e validação
- `/stacks` → implementações por stack
- `/results` → resultados brutos e consolidados

## Ordem de leitura

Leia os arquivos em `/docs` na ordem numérica antes de implementar qualquer coisa.

## Fases do projeto

1. Infraestrutura metodológica
2. Validação funcional
3. Piloto (FastAPI, Rails, Express)
4. Ajustes
5. Execução completa do benchmark

## Regra principal

Nenhuma stack deve ser implementada fora das regras documentadas.

## Instrução para agentes

Comece sempre pela infraestrutura metodológica antes de implementar qualquer stack.
