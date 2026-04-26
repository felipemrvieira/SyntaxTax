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

## Princípios do benchmark

- equivalência funcional é obrigatória entre stacks
- não adicionar features extras fora da spec
- o foco é custo de contexto, não performance
- fidelidade à stack é mais importante que concisão artificial

## Estrutura do repositório

- `/docs` → documentação metodológica
- `/benchmark` → scripts de medição, coleta e validação
- `/stacks` → implementações por stack, separadas por categoria metodológica
  - `/stacks/api-first`
  - `/stacks/opinionated`
- `/results` → resultados brutos e consolidados

## Stack matrix atual

### Rodada A — API-first / microframeworks

- FastAPI + SQLAlchemy
- Sinatra + ActiveRecord
- Express + Prisma
- Gin + GORM
- Slim + PDO SQLite

### Rodada B — frameworks mais estruturados / opinionados

- Rails + ActiveRecord
- Django + ORM nativo
- NestJS + Prisma
- Spring Boot + JPA
- Laravel + Eloquent

## Ordem de leitura

Leia os arquivos em `/docs` na ordem numérica antes de implementar qualquer coisa.

## Como rodar o benchmark

### Build do container

```bash
docker build -t syntaxtax-benchmark .
```

### Rodar medição

```bash
docker run --rm -v "$PWD:/app" syntaxtax-benchmark python benchmark/measure.py fastapi
```

### Rodar coleta

```bash
docker run --rm -v "$PWD:/app" syntaxtax-benchmark python benchmark/collect.py
```

### Publicar dashboard estático

#### GitHub Pages com GitHub Actions

O repositório agora inclui um workflow em `.github/workflows/pages.yml` que:

- roda `measure.py` para todas as stacks registradas
- roda `collect.py`
- sincroniza `dashboard/data/`
- publica o artefato estático em GitHub Pages

Para ativar:

1. vá em `Settings` → `Pages`
2. em `Build and deployment`, escolha `Source: GitHub Actions`

Depois disso, cada `push` na branch `master` publica o dashboard automaticamente.

#### Publicação manual da versão estática

Depois de atualizar `results/summary.csv` e `results/analysis.csv`, sincronize os dados versionados do dashboard:

```bash
python3 dashboard/sync_data.py
```

O repositório já contém uma entrada estática em `index.html` que redireciona para `dashboard/`, então ele pode ser publicado diretamente em GitHub Pages a partir da raiz do branch.

### Rodar validação

```bash
docker run --rm --network host -v "$PWD:/app" syntaxtax-benchmark python benchmark/validate.py http://localhost:8000
```

## Fluxo de uso

1. Implementar uma stack conforme a spec e a stack matrix.
2. Rodar `validate.py` contra a stack em execução.
3. Garantir `PASS` total na validação.
4. Rodar `measure.py` para gerar o JSON bruto da stack.
5. Rodar `collect.py` para consolidar os resultados.

## Para agentes (Codex, etc)

- ler [`AGENTS.md`](AGENTS.md) antes de qualquer ação
- tratar `docs/` como fonte da verdade
- não expandir escopo
- seguir as fases do projeto
- não implementar stacks fora da ordem definida

## Fases do projeto

1. Infraestrutura metodológica
2. Validação funcional
3. Piloto
4. Ajustes
5. Execução completa do benchmark

## Estado atual

Já existem stacks implementadas para:

- FastAPI
- Sinatra
- Express
- Gin
- Slim
- Rails
- Django
- NestJS
- Spring Boot
- Laravel

Para regras detalhadas, consulte `AGENTS.md`, `benchmark_config.yaml` e os arquivos em `/docs`.
