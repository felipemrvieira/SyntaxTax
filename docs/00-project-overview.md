# Visão geral do projeto

Este projeto investiga como diferentes stacks web influenciam o consumo de tokens quando implementam o mesmo conjunto de funcionalidades.

A hipótese central é que o custo de contexto para LLMs não depende apenas da linguagem, mas da combinação entre linguagem, framework, ORM e convenções adotadas.

O benchmark será dividido em rodadas por categoria para evitar comparações injustas entre frameworks com níveis de abstração muito diferentes.

As medições serão automatizadas, auditáveis e reproduzíveis.

## Leitura metodológica dos resultados

O benchmark adota três leituras complementares de custo de contexto.

### `handwritten_tokens`

Representa o custo de contexto funcional da stack.

Esta é a métrica principal para comparar quanto código a LLM precisa ler para entender e alterar a lógica da aplicação.

### `total_tokens`

Representa o custo de contexto bruto do corpus medido.

Esta métrica inclui tanto a lógica funcional quanto artefatos operacionais selecionados no benchmark, como arquivos de configuração, manifests mantidos por humanos e infraestrutura mínima. Lockfiles de dependência ficam fora do corpus medido.

### `operational_ratio`

Representa a proporção do corpus medida fora da lógica handwritten.

Esta métrica existe para explicar quanto do custo total vem de overhead estrutural da stack, e não da implementação funcional em si.

## Regra de interpretação

O benchmark deve ser lido assim:

- ranking principal: `handwritten_tokens`
- ranking complementar: `total_tokens`
- métrica explicativa: `operational_ratio`

Essa separação evita confundir custo de lógica de aplicação com metadados de dependência e outros artefatos operacionais do ecossistema.
