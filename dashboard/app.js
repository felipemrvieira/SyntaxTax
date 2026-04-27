const ANALYSIS_CANDIDATES = ["./data/analysis.csv", "../results/analysis.csv"];
const SUMMARY_CANDIDATES = ["./data/summary.csv", "../results/summary.csv"];
const METADATA_CANDIDATES = ["./data/metadata.json"];
const DEFAULT_LOCALE = "en";
const LOCALE_STORAGE_KEY = "syntaxtax-dashboard-locale";
const TAB_STORAGE_KEY = "syntaxtax-dashboard-tab";

let currentLocale = DEFAULT_LOCALE;

// ── Stack manifest (mirrors benchmark_config.yaml) ──────────────────────────
const STACKS_MANIFEST = [
  {
    id: "fastapi", framework: "FastAPI", language: "Python", orm: "SQLAlchemy", category: "api_first",
    handwritten: {
      domain: ["models/**/*.py", "schemas/**/*.py"],
      api: ["main.py", "routers/**/*.py"],
      persistence: ["database.py", "alembic/versions/**/*.py"],
    },
    operational: ["requirements.txt", "alembic.ini", "alembic/env.py"],
  },
  {
    id: "sinatra", framework: "Sinatra", language: "Ruby", orm: "ActiveRecord", category: "api_first",
    handwritten: {
      domain: ["models/**/*.rb"],
      api: ["app.rb"],
      persistence: ["database.rb", "db/migrate/**/*.rb"],
    },
    operational: ["Gemfile", "config.ru"],
  },
  {
    id: "express", framework: "Express", language: "JavaScript", orm: "Prisma", category: "api_first",
    handwritten: {
      domain: ["src/schemas/**/*.js", "prisma/schema.prisma"],
      api: ["src/app.js", "src/routes/**/*.js", "src/controllers/**/*.js", "src/serializers/**/*.js"],
      persistence: ["src/db/**/*.js", "prisma/migrations/**/*"],
    },
    operational: ["package.json"],
  },
  {
    id: "gin", framework: "Gin", language: "Go", orm: "GORM", category: "api_first",
    handwritten: {
      domain: ["models/**/*.go", "schemas/**/*.go"],
      api: ["handlers/**/*.go", "main.go"],
      persistence: ["db/**/*.go", "db/migrations/**/*.sql"],
    },
    operational: ["go.mod", "go.sum"],
  },
  {
    id: "slim", framework: "Slim", language: "PHP", orm: "PDO SQLite", category: "api_first",
    handwritten: {
      domain: [],
      api: ["public/index.php", "config/*.php", "src/Handlers/**/*.php"],
      persistence: ["src/Db/**/*.php", "database/migrations/**/*.sql"],
    },
    operational: ["composer.json", "composer.lock"],
  },
  {
    id: "rails", framework: "Rails", language: "Ruby", orm: "ActiveRecord", category: "opinionated",
    handwritten: {
      domain: ["app/models/**/*.rb"],
      api: ["app/controllers/**/*.rb", "config/routes.rb"],
      persistence: ["db/migrate/**/*.rb"],
    },
    operational: ["Gemfile", "config/database.yml", "config/application.rb"],
  },
  {
    id: "django", framework: "Django", language: "Python", orm: "Django ORM", category: "opinionated",
    handwritten: {
      domain: ["app/models.py", "app/serializers.py"],
      api: ["app/views.py", "app/urls.py"],
      persistence: ["app/migrations/**/*.py"],
    },
    operational: ["manage.py", "requirements.txt", "config/settings.py", "config/urls.py", "config/asgi.py", "config/wsgi.py"],
  },
  {
    id: "nestjs", framework: "NestJS", language: "TypeScript", orm: "Prisma", category: "opinionated",
    handwritten: {
      domain: ["prisma/schema.prisma", "src/**/*.dto.ts"],
      api: ["src/main.ts", "src/app.module.ts", "src/{users,products,orders}/**/*.controller.ts", "src/{users,products,orders}/**/*.service.ts", "src/{users,products,orders}/**/*.module.ts"],
      persistence: ["src/prisma/**/*.ts", "prisma/migrations/**/*"],
    },
    operational: ["package.json", "package-lock.json", "tsconfig.json"],
  },
  {
    id: "springboot", framework: "Spring Boot", language: "Java", orm: "Spring Data JPA", category: "opinionated",
    handwritten: {
      domain: ["src/…/users/User.java", "src/…/users/CreateUserRequest.java", "src/…/products/Product.java", "src/…/products/CreateProductRequest.java", "src/…/orders/{Order,OrderItem}.java", "src/…/orders/dto/**/*.java"],
      api: ["src/…/Application.java", "src/…/config/**/*.java", "src/…/{users,products,orders}/*Controller.java", "src/…/orders/OrderService.java"],
      persistence: ["src/…/**/*Repository.java", "src/main/resources/schema.sql"],
    },
    operational: ["pom.xml", "src/main/resources/application.properties"],
  },
  {
    id: "laravel", framework: "Laravel", language: "PHP", orm: "Eloquent", category: "opinionated",
    handwritten: {
      domain: ["app/Models/**/*.php"],
      api: ["routes/api.php", "app/Http/Controllers/**/*.php"],
      persistence: ["database/migrations/**/*.php"],
    },
    operational: ["composer.json", "composer.lock", "bootstrap/app.php", "config/**/*.php"],
  },
];


const AUTHOR = {
  name: "Felipe Maciel Ramos Vieira",
  handle: "@felipemrvieira",
  bio: "Engineer & Researcher | Arquitetura Evolutiva \u2022 Cloud-Native \u2022 SaaS Multi-Tenant",
  location: "\uD83D\uDCCD Recife, Brasil",
  avatar: "https://avatars.githubusercontent.com/u/13780312?v=4",
  github: "https://github.com/felipemrvieira",
  linkedin: "https://www.linkedin.com/in/felipemrvieira",
};

const translations = {
  en: {
    htmlLang: "en",
    heroTitle: "A comparative view that prioritizes the most context-efficient web stacks.",
    heroBody:
      "This dashboard summarizes the benchmark methodology, separates the analysis lenses, and orders stacks by context efficiency without confusing application cost with operational inflation.",
    lensesTitle: "Official lenses",
    lensTotalTitle: "Total tokens",
    lensTotalBody:
      "Measures the full textual cost of the measured repository: application code, configuration, and minimum infrastructure.",
    lensHandwrittenTitle: "Handwritten tokens",
    lensHandwrittenBody:
      "Isolates the cost of code written to implement the application: API, domain, and directly modeled persistence.",
    lensOperationalTitle: "Operational overhead",
    lensOperationalBody:
      "Shows the structural weight of the ecosystem, especially lockfiles, configuration, and unavoidable operational artifacts.",
    globalTitle: "Global rankings",
    globalBody:
      "The rankings below prioritize lower cost and lower operational overhead, so the first positions represent the most economical stacks.",
    guidedTitle: "Guided reading",
    guidedBody:
      "Concrete examples derived from the current snapshot to show how the lenses help identify which stacks deliver more with less context.",
    categoryTitle: "Stacks by methodological category",
    categoryBody:
      "Each table ranks stacks within their natural group: API-first microframeworks and opinionated frameworks, with lower cost at the top.",
    howTitle: "How to read the numbers",
    how1:
      "<strong>Total tokens</strong> is the best lens to estimate the full context cost an LLM must absorb to operate on a complete stack. Lower is better.",
    how2:
      "<strong>Handwritten tokens</strong> is the best lens to compare the implementation cost of the same application without letting lockfiles and ecosystem dominate the reading. Lower is better.",
    how3:
      "<strong>API, domain, and persistence</strong> help locate where each stack spends tokens: HTTP layer, core modeling, or persistence modeling.",
    how4:
      "<strong>Operational ratio</strong> is not a defect. It only shows the relative weight of the minimum infrastructure required by the stack under the current methodology. Lower is better when the focus is overall efficiency.",
    scopeTitle: "What the benchmark measures, and what it does not",
    measuresTitle: "Measures",
    notMeasuresTitle: "Does not measure",
    measuresList: [
      "Total textual context per stack",
      "Relative weight between handwritten and operational code",
      "Distribution across API, domain, and persistence",
      "Impact of framework, language, and ORM on the corpus",
    ],
    notMeasuresList: [
      "Runtime performance",
      "Production scalability",
      "Absolute architectural quality",
      "Long-term team productivity",
    ],
    methodologyTitle: "Methodology summary",
    methodologyBody:
      "All stacks implement the same domain, pass through the same functional validator, and are measured with the same tokenizer (`cl100k_base`), the same stable ordering, and the same global exclusions.",
    categoryLabels: {
      api_first: "API-first / microframeworks",
      opinionated: "Opinionated / structured frameworks",
    },
    methodologyCards: [
      {
        title: "Functional equivalence",
        text: "No stack enters measurement without passing the same functional validator and implementing the same domain.",
      },
      {
        title: "Fixed tokenization",
        text: "The benchmark uses cl100k_base, stable alphabetical ordering, and the pure_content_only strategy.",
      },
      {
        title: "Two views",
        text: "handwritten isolates application code. operational_extras captures configuration and minimum infrastructure.",
      },
      {
        title: "Fair comparison",
        text: "Stacks are compared within methodological groups and also globally, using distinct lenses.",
      },
    ],
    methodologyGrid: [
      ["Fixed domain", "User, Product, Order, and OrderItem in every stack."],
      ["Same endpoints", "POST/GET users, POST/GET products, POST/GET/PATCH orders."],
      ["Same exclusions", "vendor, node_modules, test, spec, dist, build, and .venv stay out."],
      ["Granularity", "Metrics by file, category, view, and stack."],
    ],
    heroStats: {
      total: "Lowest total corpus",
      handwritten: "Lowest handwritten cost",
      operational: "Lowest operational ratio",
    },
    snapshot: {
      label: "Snapshot",
      stacks: "Measured stacks",
      warnings: "Snapshot warnings",
      unavailable: "snapshot unavailable",
    },
    rankings: {
      totalTitle: "Lowest total cost",
      totalSubtitle: "#1 represents the stack with the fewest total tokens.",
      handwrittenTitle: "Lowest handwritten cost",
      handwrittenSubtitle: "#1 represents the stack with the least measured application code.",
      operationalTitle: "Lowest operational overhead",
      operationalSubtitle: "#1 represents the stack with the lowest relative operational weight.",
    },
    categorySectionSubtitle:
      "Table sorted by lowest handwritten cost. Total cost and operational ratio reinforce the overall efficiency reading.",
    tableHeaders: {
      stack: "Stack",
      total: "Total",
      handwritten: "Handwritten",
      operational: "Operational ratio",
      api: "API",
      domain: "Domain",
      persistence: "Persistence",
      positions: "Positions",
    },
    positions: {
      total: "total efficiency",
      handwritten: "handwritten efficiency",
      operational: "operational efficiency",
    },
    guidedCards: {
      total: {
        title: "Lowest total corpus",
        text: (row) =>
          `${row.framework} leads total efficiency with ${formatInt(row.total_tokens)} tokens. This suggests the lowest full-context cost to operate the complete stack.`,
      },
      handwritten: {
        title: "Lowest application cost",
        text: (row) =>
          `${row.framework} leads handwritten efficiency with ${formatInt(row.handwritten_tokens)} tokens. This is closer to the cost of the code actually written for the application.`,
      },
      operational: {
        title: "Lowest operational pressure",
        text: (row) =>
          `${row.framework} has ${ratio(row.operational_ratio)} of operational weight. Cases like this tend to preserve total efficiency without letting infrastructure dominate the reading.`,
      },
    },
    configHeavy: {
      title: "Stacks pulled upward by operational overhead",
      subtitle:
        "These stacks have more than 50% of their corpus coming from the operational layer in the aggregate analysis. Here, higher values are worse under the efficiency lens.",
    },
    errors: {
      loadTitle: "Failed to load the dashboard",
      loadHelp:
        'Serve the repository over HTTP, for example with <code class="font-mono">python3 -m http.server 8000</code>, and open <code class="font-mono">http://localhost:8000/dashboard/</code>.',
      csvLoad: "Could not load the benchmark CSV files.",
    },
    navDashboard: "Dashboard",
    navAbout: "About the Study",
    navAuthor: "Author",
    author: {
      bioTitle: "Who's behind this?",
      bioBody:
        "Felipe is a software engineer and researcher based in Recife, Brazil. SyntaxTax was created to address a real methodological gap: no structured benchmark existed to compare the token cost of equivalent web API implementations across different stacks \u2014 a key concern in LLM-assisted development workflows.",
      tags: ["Arquitetura Evolutiva", "Cloud-Native", "SaaS Multi-Tenant", "Engineering Research"],
      locationLabel: "\uD83D\uDCCD Recife, Brasil",
      contactTitle: "Get in touch",
      contactBody:
        "Interested in the methodology, the results, or a potential collaboration? Reach out via GitHub or LinkedIn.",
      contactCards: [
        {
          label: "GitHub",
          handle: "@felipemrvieira",
          url: "https://github.com/felipemrvieira",
          color: "ember",
          desc: "Source code, issues \u0026 discussions",
        },
        {
          label: "LinkedIn",
          handle: "in/felipemrvieira",
          url: "https://www.linkedin.com/in/felipemrvieira",
          color: "aqua",
          desc: "Professional network \u0026 career",
        },
      ],
    },
    about: {
      heroTitle: "What is SyntaxTax?",
      heroBody:
        "SyntaxTax is a controlled benchmark that measures the textual cost of equivalent web API implementations across 10 different stacks. The central question is not which framework is \"better\" — it is how much token context a language model must consume to understand or modify a complete, idiomatic codebase.",
      researchQuestion:
        "How many tokens does it take to implement the same API in 10 different web stacks?",
      whyLabel: "Why does this matter?",
      whyBody:
        "Every time an AI tool (like GitHub Copilot or ChatGPT) reads your codebase, it pays a cost measured in tokens — the small fragments that LLMs (large language models) use to process text. The larger the codebase, the higher the token count, and the more likely the model hits its context window limit and loses track of earlier code. SyntaxTax measures that token cost across 10 real tech stacks implementing the same mini application, so you can see whether your stack is working for or against you in an LLM-assisted workflow.",
      constraintsTitle: "How the experiment is controlled",
      constraints: [
        "All 10 stacks implement an identical application (same features, same business rules) and pass the same functional validator — validate.py — before being measured. This ensures token count differences come from the stack's verbosity, not from scope or feature differences.",
        "The tokenizer is fixed at cl100k_base — the same algorithm ChatGPT and GitHub Copilot use to split text into tokens — with alphabetical stable ordering and the pure_content_only strategy, which counts only literal source content.",
        "Auto-generated directories (vendor/, node_modules/, build artifacts, virtual environments like .venv) and test files are always excluded. Only intentional source files are counted.",
        "Stacks are grouped in two methodological rounds: Round A (API-first microframeworks — minimal, low-convention) and Round B (opinionated frameworks — full-featured, with enforced structure). Comparison is only valid within the same round.",
        "The benchmark measures the textual result of the final repository snapshot — not the cost of generating code with an AI. It answers: how expensive is it for an LLM to read this codebase?",
      ],
      domainTitle: "The domain: a mini order system",
      domainBody:
        "Every stack implements the same four entities and the same set of HTTP endpoints. This ensures that token count differences reflect the stack's own verbosity — not differences in scope.",
      endpointsTitle: "Endpoints (V2 spec)",
      endpoints: [
        { method: "POST", path: "/users", desc: "Create user" },
        { method: "GET",  path: "/users", desc: "List users" },
        { method: "POST", path: "/products", desc: "Create product (price > 0)" },
        { method: "GET",  path: "/products?min_price=&max_price=", desc: "List products with price filters" },
        { method: "POST", path: "/orders", desc: "Create order with items" },
        { method: "GET",  path: "/orders?status=&user_id=", desc: "List orders with filters" },
        { method: "GET",  path: "/orders/:id", desc: "Get order detail" },
        { method: "PATCH", path: "/orders/:id/status", desc: "Update status (with transition rules)" },
      ],
      entitiesTitle: "Entities",
      entities: [
        { name: "User", fields: "id, name, email (unique)" },
        { name: "Product", fields: "id, name, price (> 0)" },
        { name: "Order", fields: "id, user_id, status, total, item_count, created_at" },
        { name: "OrderItem", fields: "id, order_id, product_id, product_name, quantity, unit_price" },
      ],
      stacksTitle: "The 10 stacks",
      stacksBody:
        "Five API-first microframeworks (Round A) and five opinionated frameworks (Round B). Stacks are only compared within their own round.",
      apifirstLabel: "Round A — API-first / microframeworks",
      opinionatedLabel: "Round B — Opinionated / structured frameworks",
      metricsTitle: "How the metrics work",
      metricsBody:
        "The benchmark measures source code files in three views. Each view exposes a different lens on the same corpus.",
      metrics: [
        {
          name: "Total tokens",
          color: "ember",
          desc: "All measured files combined — handwritten code plus operational extras. This is the full context cost of the stack.",
          plain: "In LLM terms: the full context window cost of loading this stack. Lower means the model retains more working memory for your actual task.",
        },
        {
          name: "Handwritten tokens",
          color: "aqua",
          desc: "Only the files implementing the application: domain models, API handlers, and persistence code. Excludes lockfiles and config.",
          plain: "The cost of what a developer actually wrote — stripped of the ecosystem noise. This is the cleanest signal for comparing framework verbosity.",
        },
        {
          name: "Operational tokens",
          color: "slateblue",
          desc: "Lockfiles (package-lock.json, Gemfile.lock), package manifests (package.json, composer.json), and framework config. Ecosystem overhead, not application logic.",
          plain: "The \"entry fee\" of the stack — files the framework or package manager forces you to have, regardless of what your app does.",
        },
        {
          name: "Operational ratio",
          color: "sand",
          desc: "operational_tokens ÷ total_tokens. High values indicate stacks where lockfiles and config dominate the corpus over application code.",
          plain: "What share of the total token budget is pure overhead. A ratio of 0.60 means 60% of the tokens an LLM reads are infrastructure, not your app.",
        },
      ],
      browserTitle: "File browser — what gets measured",
      browserBody:
        "Each stack entry shows the exact file patterns that contribute to each measurement category, as defined in benchmark_config.yaml. Click any stack to expand.",
      categoryColors: {
        domain: "bg-aqua/30 text-slateblue",
        api: "bg-ember/15 text-ember",
        persistence: "bg-slateblue/10 text-slateblue",
        operational: "bg-sand border border-black/10 text-slateblue/70",
      },
      noDomainNote: "No domain layer — raw SQL / PDO without ORM abstraction",
      glossaryTitle: "Glossary",
      glossaryBody: "New to some of these terms? Here's what they mean in plain language.",
      glossary: [
        {
          term: "Token",
          def: "A small fragment of text — roughly ¾ of a word on average. AI models read and generate text in tokens. More tokens = higher cost and slower responses.",
        },
        {
          term: "Framework / Stack",
          def: "A pre-built set of tools and conventions for building web applications. Examples: Rails (Ruby), Django (Python), NestJS (TypeScript). Different stacks have different amounts of required boilerplate.",
        },
        {
          term: "Benchmark",
          def: "A controlled test where multiple subjects perform the same task under the same conditions, so results are directly comparable.",
        },
        {
          term: "Tokenizer",
          def: "The algorithm that splits text into tokens. This benchmark uses cl100k_base — the same one used by ChatGPT and GitHub Copilot — so results reflect real-world AI costs.",
        },
        {
          term: "Handwritten vs Operational",
          def: "Handwritten = code a developer writes to solve the problem. Operational = files the framework or package manager forces you to have (like lockfiles). Both are included in the total token count.",
        },
      ],
    },
  },
  "pt-BR": {
    htmlLang: "pt-BR",
    heroTitle: "Uma leitura comparativa para priorizar as stacks mais econômicas em contexto.",
    heroBody:
      "Este painel resume a metodologia do benchmark, separa as lentes de análise e ordena as stacks a partir da economia de contexto, sem misturar custo de aplicação com inflação operacional.",
    lensesTitle: "Lentes oficiais",
    lensTotalTitle: "Tokens totais",
    lensTotalBody:
      "Mede o custo textual completo do repositório medido: código da aplicação, configuração e infraestrutura mínima.",
    lensHandwrittenTitle: "Tokens handwritten",
    lensHandwrittenBody:
      "Isola o custo do código escrito para implementar a aplicação: API, domínio e persistência diretamente modelada.",
    lensOperationalTitle: "Sobrecarga operacional",
    lensOperationalBody:
      "Mostra o peso estrutural do ecossistema, especialmente lockfiles, configuração e artefatos operacionais inevitáveis.",
    globalTitle: "Rankings globais",
    globalBody:
      "Os rankings abaixo priorizam menor custo e menor sobrecarga operacional, para que as primeiras posições representem as stacks mais econômicas.",
    guidedTitle: "Leitura guiada",
    guidedBody:
      "Exemplos concretos, derivados do snapshot atual, para mostrar como as lentes ajudam a identificar quais stacks entregam mais com menos contexto.",
    categoryTitle: "Stacks por categoria metodológica",
    categoryBody:
      "Cada tabela ranqueia as stacks dentro do seu grupo natural: microframeworks API-first e frameworks opinionated, com menor custo no topo.",
    howTitle: "Como ler os números",
    how1:
      "<strong>Tokens totais</strong> é a melhor lente para estimar o custo total de contexto que uma LLM precisa absorver ao operar sobre uma stack completa. Menor valor é melhor.",
    how2:
      "<strong>Tokens handwritten</strong> é a melhor lente para comparar o custo de implementação da mesma aplicação, sem deixar lockfiles e ecossistema dominarem a leitura. Menor valor é melhor.",
    how3:
      "<strong>API, domínio e persistência</strong> ajudam a localizar onde cada stack gasta tokens: camada HTTP, modelagem central ou modelagem persistente.",
    how4:
      "<strong>Razão operacional</strong> não é defeito. Ela só indica o peso relativo da infraestrutura mínima exigida pela stack dentro da metodologia atual. Menor valor é melhor quando o foco é economia total.",
    scopeTitle: "O que o benchmark mede, e o que ele não mede",
    measuresTitle: "Mede",
    notMeasuresTitle: "Não mede",
    measuresList: [
      "Contexto textual total por stack",
      "Peso relativo entre handwritten e operacional",
      "Distribuição entre API, domínio e persistência",
      "Impacto de framework, linguagem e ORM no corpus",
    ],
    notMeasuresList: [
      "Performance de runtime",
      "Escalabilidade de produção",
      "Qualidade arquitetural absoluta",
      "Produtividade de time ao longo do tempo",
    ],
    methodologyTitle: "Metodologia resumida",
    methodologyBody:
      "Todas as stacks implementam o mesmo domínio, passam pelo mesmo validador funcional e são medidas com o mesmo tokenizer (`cl100k_base`), mesma ordenação estável e mesmas exclusões globais.",
    categoryLabels: {
      api_first: "API-first / microframeworks",
      opinionated: "Opinionated / frameworks estruturados",
    },
    methodologyCards: [
      {
        title: "Equivalência funcional",
        text: "Nenhuma stack entra na medição sem passar no mesmo validador funcional e implementar o mesmo domínio.",
      },
      {
        title: "Tokenização fixa",
        text: "O benchmark usa cl100k_base, ordenação alfabética estável e a estratégia pure_content_only.",
      },
      {
        title: "Duas views",
        text: "handwritten separa código de aplicação. operational_extras captura configuração e infraestrutura mínima.",
      },
      {
        title: "Comparação justa",
        text: "As stacks são comparadas dentro de grupos metodológicos e também globalmente, com lentes distintas.",
      },
    ],
    methodologyGrid: [
      ["Domínio fixo", "User, Product, Order e OrderItem em todas as stacks."],
      ["Mesmos endpoints", "POST/GET users, POST/GET products, POST/GET/PATCH orders."],
      ["Mesmas exclusões", "vendor, node_modules, test, spec, dist, build e .venv ficam fora."],
      ["Granularidade", "Métricas por arquivo, categoria, view e stack."],
    ],
    heroStats: {
      total: "Menor corpus total",
      handwritten: "Menor handwritten",
      operational: "Menor razão operacional",
    },
    snapshot: {
      label: "Snapshot",
      stacks: "Stacks medidas",
      warnings: "Warnings no snapshot",
      unavailable: "snapshot indisponível",
    },
    rankings: {
      totalTitle: "Menor custo total",
      totalSubtitle: "#1 representa a stack com menos tokens totais.",
      handwrittenTitle: "Menor custo handwritten",
      handwrittenSubtitle: "#1 representa a stack com menos código de aplicação medido.",
      operationalTitle: "Menor sobrecarga operacional",
      operationalSubtitle: "#1 representa a stack com menor peso operacional relativo.",
    },
    categorySectionSubtitle:
      "Tabela ordenada por menor custo handwritten. As colunas de total e razão operacional reforçam a leitura de economia geral.",
    tableHeaders: {
      stack: "Stack",
      total: "Total",
      handwritten: "Handwritten",
      operational: "Razão operacional",
      api: "API",
      domain: "Domínio",
      persistence: "Persistência",
      positions: "Posições",
    },
    positions: {
      total: "economia total",
      handwritten: "economia handwritten",
      operational: "economia operacional",
    },
    guidedCards: {
      total: {
        title: "Menor corpus total",
        text: (row) =>
          `${row.framework} lidera em economia total com ${formatInt(row.total_tokens)} tokens. Isso sugere menor custo integral de contexto para operar a stack completa.`,
      },
      handwritten: {
        title: "Menor custo de aplicação",
        text: (row) =>
          `${row.framework} lidera em economia handwritten com ${formatInt(row.handwritten_tokens)} tokens. Aqui a leitura é mais próxima do custo do código realmente escrito para a aplicação.`,
      },
      operational: {
        title: "Menor pressão operacional",
        text: (row) =>
          `${row.framework} tem ${ratio(row.operational_ratio)} de peso operacional. Esse tipo de caso tende a preservar melhor a economia total sem deixar a infraestrutura dominar a leitura.`,
      },
    },
    configHeavy: {
      title: "Stacks puxadas por overhead operacional",
      subtitle:
        "Estas stacks têm mais de 50% do corpus vindo da camada operacional na análise agregada. Aqui, maior valor é pior sob a lente de economia.",
    },
    errors: {
      loadTitle: "Falha ao carregar o dashboard",
      loadHelp:
        'Sirva o repositório por HTTP, por exemplo com <code class="font-mono">python3 -m http.server 8000</code>, e abra <code class="font-mono">http://localhost:8000/dashboard/</code>.',
      csvLoad: "Não foi possível carregar os CSVs do benchmark.",
    },
    navDashboard: "Painel",
    navAbout: "Sobre o Estudo",
    navAuthor: "Autor",
    author: {
      bioTitle: "Quem est\u00e1 por tr\u00e1s disso?",
      bioBody:
        "Felipe \u00e9 engenheiro de software e pesquisador baseado em Recife, Brasil. O SyntaxTax foi criado para preencher uma lacuna metodol\u00f3gica real: n\u00e3o existia nenhum benchmark estruturado para comparar o custo de tokens de implementa\u00e7\u00f5es equivalentes de APIs web em diferentes stacks \u2014 um ponto cr\u00edtico em workflows de desenvolvimento assistidos por LLMs.",
      tags: ["Arquitetura Evolutiva", "Cloud-Native", "SaaS Multi-Tenant", "Pesquisa em Engenharia"],
      locationLabel: "\uD83D\uDCCD Recife, Brasil",
      contactTitle: "Entre em contato",
      contactBody:
        "Interessado na metodologia, nos resultados ou em uma poss\u00edvel colabora\u00e7\u00e3o? Entre em contato pelo GitHub ou LinkedIn.",
      contactCards: [
        {
          label: "GitHub",
          handle: "@felipemrvieira",
          url: "https://github.com/felipemrvieira",
          color: "ember",
          desc: "C\u00f3digo-fonte, issues e discuss\u00f5es",
        },
        {
          label: "LinkedIn",
          handle: "in/felipemrvieira",
          url: "https://www.linkedin.com/in/felipemrvieira",
          color: "aqua",
          desc: "Rede profissional e carreira",
        },
      ],
    },
    about: {
      heroTitle: "O que é SyntaxTax?",
      heroBody:
        "SyntaxTax é um benchmark controlado que mede o custo textual de implementações equivalentes de APIs web em 10 stacks diferentes. A questão central não é qual framework é \"melhor\" — é quanto contexto de tokens um modelo de linguagem precisa consumir para entender ou modificar uma base de código completa e idiomática.",
      researchQuestion:
        "Quantos tokens são necessários para implementar a mesma API em 10 stacks web diferentes?",
      whyLabel: "Por que isso importa?",
      whyBody:
        "Toda vez que uma ferramenta de IA (como GitHub Copilot ou ChatGPT) lê o seu código-fonte, ela paga um custo medido em tokens — os fragmentos que os LLMs (large language models) usam para processar texto. Quanto maior o token count, mais provável que o modelo atinja o limite do seu context window e perca referências de código anterior. O SyntaxTax mede esse custo em 10 stacks reais implementando o mesmo mini-aplicativo, para que você veja se a sua stack está trabalhando a seu favor — ou contra você — num fluxo assistido por LLMs.",
      constraintsTitle: "Como o experimento é controlado",
      constraints: [
        "Todas as 10 stacks implementam o mesmo aplicativo (mesmas funcionalidades, mesmas regras de negócio) e passam pelo mesmo validador funcional — validate.py — antes de serem medidas. Isso garante que as diferenças de token count venham da verbosidade da stack, não de diferenças de escopo.",
        "O tokenizer é fixado em cl100k_base — o mesmo algoritmo que ChatGPT e GitHub Copilot usam para dividir texto em tokens — com ordenação alfabética estável e estratégia pure_content_only, que contabiliza apenas o conteúdo literal do código-fonte.",
        "Diretórios gerados automaticamente (vendor/, node_modules/, artefatos de build, ambientes virtuais como .venv) e arquivos de teste são sempre excluídos. Apenas arquivos-fonte intencionais são contados.",
        "As stacks são agrupadas em duas rodadas metodológicas: Rodada A (microframeworks API-first — mínimos, sem convenções impostas) e Rodada B (frameworks opinionated — completos, com estrutura e convenções obrigatórias). A comparação é válida apenas dentro da mesma rodada.",
        "O benchmark mede o resultado textual do snapshot final do repositório — não o custo de gerar código com uma IA. A pergunta respondida é: qual o custo em tokens para um LLM ler este codebase?",
      ],
      domainTitle: "O domínio: mini sistema de pedidos",
      domainBody:
        "Cada stack implementa as mesmas quatro entidades e o mesmo conjunto de endpoints HTTP. Isso garante que as diferenças de contagem de tokens reflitam a verbosidade da stack — não diferenças de escopo.",
      endpointsTitle: "Endpoints (spec V2)",
      endpoints: [
        { method: "POST", path: "/users", desc: "Criar usuário" },
        { method: "GET",  path: "/users", desc: "Listar usuários" },
        { method: "POST", path: "/products", desc: "Criar produto (price > 0)" },
        { method: "GET",  path: "/products?min_price=&max_price=", desc: "Listar produtos com filtros de preço" },
        { method: "POST", path: "/orders", desc: "Criar pedido com itens" },
        { method: "GET",  path: "/orders?status=&user_id=", desc: "Listar pedidos com filtros" },
        { method: "GET",  path: "/orders/:id", desc: "Detalhar pedido" },
        { method: "PATCH", path: "/orders/:id/status", desc: "Atualizar status (com regras de transição)" },
      ],
      entitiesTitle: "Entidades",
      entities: [
        { name: "User", fields: "id, name, email (único)" },
        { name: "Product", fields: "id, name, price (> 0)" },
        { name: "Order", fields: "id, user_id, status, total, item_count, created_at" },
        { name: "OrderItem", fields: "id, order_id, product_id, product_name, quantity, unit_price" },
      ],
      stacksTitle: "As 10 stacks",
      stacksBody:
        "Cinco microframeworks API-first (Rodada A) e cinco frameworks opinionated (Rodada B). As stacks são comparadas apenas dentro de sua própria rodada.",
      apifirstLabel: "Rodada A — API-first / microframeworks",
      opinionatedLabel: "Rodada B — Opinionated / frameworks estruturados",
      metricsTitle: "Como as métricas funcionam",
      metricsBody:
        "O benchmark mede os arquivos fonte em três views. Cada view expõe uma lente diferente sobre o mesmo corpus.",
      metrics: [
        {
          name: "Tokens totais",
          color: "ember",
          desc: "Todos os arquivos medidos juntos — código handwritten mais extras operacionais. Este é o custo total de contexto da stack.",
          plain: "Em termos de LLM: o custo total do context window para carregar essa stack. Menor = o modelo retém mais memória de trabalho para a sua tarefa.",
        },
        {
          name: "Tokens handwritten",
          color: "aqua",
          desc: "Apenas os arquivos que implementam a aplicação: modelos de domínio, handlers de API e código de persistência. Exclui lockfiles e configs.",
          plain: "O sinal limpo: o que o desenvolvedor escreveu para resolver o problema, sem o ruído do ecossistema. É a melhor lente para comparar a verbosidade real dos frameworks.",
        },
        {
          name: "Tokens operacionais",
          color: "slateblue",
          desc: "Lockfiles (package-lock.json, Gemfile.lock), manifests de pacotes (package.json, composer.json) e config de framework. Overhead do ecossistema, não lógica da aplicação.",
          plain: "A \"taxa de entrada\" da stack — arquivos que o framework ou gerenciador de pacotes obriga a ter, independente do que a aplicação faz.",
        },
        {
          name: "Razão operacional",
          color: "sand",
          desc: "operational_tokens ÷ total_tokens. Valores altos indicam stacks onde lockfiles e config dominam o corpus em relação ao código da aplicação.",
          plain: "Qual fatia do orçamento total de tokens é puro overhead. Uma razão de 0,60 significa que 60% dos tokens que um LLM lê são infraestrutura, não a sua aplicação.",
        },
      ],
      browserTitle: "Browser de arquivos — o que é medido",
      browserBody:
        "Cada entrada de stack mostra os padrões de arquivo exatos que contribuem para cada categoria de medição, conforme definido em benchmark_config.yaml. Clique em qualquer stack para expandir.",
      categoryColors: {
        domain: "bg-aqua/30 text-slateblue",
        api: "bg-ember/15 text-ember",
        persistence: "bg-slateblue/10 text-slateblue",
        operational: "bg-sand border border-black/10 text-slateblue/70",
      },
      noDomainNote: "Sem camada de domínio — SQL puro / PDO sem abstração ORM",
      glossaryTitle: "Glossário",
      glossaryBody: "Não conhece alguns desses termos? Aqui está o que eles significam em linguagem simples.",
      glossary: [
        {
          term: "Token",
          def: "Um pequeno fragmento de texto — em média, cerca de ¾ de uma palavra. Modelos de IA leem e geram texto em tokens. Mais tokens = custo maior e respostas mais lentas.",
        },
        {
          term: "Framework / Stack",
          def: "Um conjunto pré-construído de ferramentas e convenções para desenvolver aplicações web. Exemplos: Rails (Ruby), Django (Python), NestJS (TypeScript). Diferentes stacks têm quantidades diferentes de código obrigatório.",
        },
        {
          term: "Benchmark",
          def: "Um teste controlado onde vários concorrentes executam a mesma tarefa sob as mesmas condições, para que os resultados sejam diretamente comparáveis.",
        },
        {
          term: "Tokenizer",
          def: "O algoritmo que divide texto em tokens. Este benchmark usa cl100k_base — o mesmo usado pelo ChatGPT e pelo GitHub Copilot — para que os resultados reflitam custos reais de IA.",
        },
        {
          term: "Handwritten vs Operacional",
          def: "Handwritten = código que o desenvolvedor escreveu para resolver o problema. Operacional = arquivos que o framework ou gerenciador de pacotes obriga a ter (como lockfiles). Ambos entram na contagem total de tokens.",
        },
      ],
    },
  },
};

function getCopy() {
  return translations[currentLocale] ?? translations[DEFAULT_LOCALE];
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

function toNumber(value) {
  return Number(value);
}

function ratio(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function formatInt(value) {
  return new Intl.NumberFormat(currentLocale).format(Number(value));
}

function formatUtc(value) {
  const copy = getCopy();
  if (!value) {
    return copy.snapshot.unavailable;
  }

  return (
    new Intl.DateTimeFormat(currentLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}

function frameworkLabel(row) {
  return `${row.framework} · ${row.language}`;
}

function sortedBy(rows, key, direction = "desc") {
  return [...rows].sort((a, b) => {
    const delta = Number(a[key]) - Number(b[key]);
    return direction === "desc" ? -delta : delta;
  });
}

function createPanel(title, subtitle = "") {
  const panel = document.createElement("section");
  panel.className = "rounded-[2rem] border border-black/5 bg-white p-6 shadow-panel";
  panel.innerHTML = `
    <div class="mb-5">
      <h3 class="text-xl font-bold tracking-tight">${title}</h3>
      ${subtitle ? `<p class="mt-2 text-sm leading-7 text-slateblue/80">${subtitle}</p>` : ""}
    </div>
  `;
  return panel;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function setHtml(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.innerHTML = value;
  }
}

function renderList(id, values) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
}

// ── About page ──────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET:    "bg-aqua/40 text-slateblue",
  POST:   "bg-ember/20 text-ember",
  PATCH:  "bg-slateblue/15 text-slateblue",
  PUT:    "bg-slateblue/15 text-slateblue",
  DELETE: "bg-red-100 text-red-700",
};

const METRIC_ACCENT = {
  ember:    { bg: "bg-ember/15", text: "text-ember",    dot: "bg-ember" },
  aqua:     { bg: "bg-aqua/30",  text: "text-slateblue", dot: "bg-emerald-400" },
  slateblue:{ bg: "bg-slateblue/10", text: "text-slateblue", dot: "bg-slateblue" },
  sand:     { bg: "bg-sand border border-black/10", text: "text-slateblue/80", dot: "bg-black/20" },
};

function renderAboutPage() {
  const copy = getCopy();
  const a = copy.about;

  // Nav labels
  setText("nav-dashboard-label", copy.navDashboard);
  setText("nav-about-label", copy.navAbout);

  // Hero
  setText("about-hero-title", a.heroTitle);
  setText("about-hero-body", a.heroBody);
  setText("about-research-question", `"${a.researchQuestion}"`);

  // Why it matters
  setText("about-why-label", a.whyLabel);
  setText("about-why-body", a.whyBody);

  // Constraints
  setText("about-constraints-title", a.constraintsTitle);
  document.getElementById("about-constraints-list").innerHTML = a.constraints
    .map(
      (c) => `
        <div class="flex items-start gap-3">
          <div class="mt-1 h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-aqua/30">
            <svg class="h-3 w-3 text-slateblue" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <p class="text-sm leading-6 text-white/80">${c}</p>
        </div>`
    )
    .join("");

  // Domain
  setText("about-domain-title", a.domainTitle);
  setText("about-domain-body", a.domainBody);
  setText("about-endpoints-title", a.endpointsTitle);
  document.getElementById("about-endpoints-list").innerHTML = a.endpoints
    .map(
      (ep) => `
        <div class="flex items-start gap-3 rounded-2xl bg-sand px-4 py-2.5">
          <span class="mt-0.5 inline-flex shrink-0 items-center rounded-xl px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${METHOD_COLORS[ep.method] ?? "bg-sand text-ink"}">${ep.method}</span>
          <div class="min-w-0 flex-1">
            <code class="break-all font-mono text-xs text-slateblue">${ep.path}</code>
            <span class="ml-2 text-xs text-slateblue/60">— ${ep.desc}</span>
          </div>
        </div>`
    )
    .join("");

  setText("about-entities-title", a.entitiesTitle);
  document.getElementById("about-entities-list").innerHTML = a.entities
    .map(
      (e) => `
        <div class="rounded-2xl border border-black/5 bg-sand px-4 py-3">
          <div class="font-semibold text-sm">${e.name}</div>
          <div class="mt-1 font-mono text-xs text-slateblue/65 break-all">${e.fields}</div>
        </div>`
    )
    .join("");

  // Stacks
  setText("about-stacks-title", a.stacksTitle);
  setText("about-stacks-body", a.stacksBody);
  setText("about-apifirst-label", a.apifirstLabel);
  setText("about-opinionated-label", a.opinionatedLabel);

  const apifirstEl = document.getElementById("about-stacks-apifirst");
  const opinionatedEl = document.getElementById("about-stacks-opinionated");
  apifirstEl.innerHTML = "";
  opinionatedEl.innerHTML = "";

  STACKS_MANIFEST.forEach((stack) => {
    const card = document.createElement("article");
    card.className = "rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-panel";
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2 flex-wrap">
        <h3 class="text-base font-bold capitalize">${stack.framework}</h3>
        <span class="inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stack.category === "api_first" ? "bg-aqua/30 text-slateblue" : "bg-ember/15 text-ember"}">${stack.category === "api_first" ? "API-first" : "Opinionated"}</span>
      </div>
      <div class="mt-3 space-y-1 text-xs text-slateblue/70">
        <div><span class="font-semibold">Lang:</span> ${stack.language}</div>
        <div><span class="font-semibold">ORM:</span> ${stack.orm}</div>
      </div>
    `;
    (stack.category === "api_first" ? apifirstEl : opinionatedEl).append(card);
  });

  // Metrics
  setText("about-metrics-title", a.metricsTitle);
  setText("about-metrics-body", a.metricsBody);
  document.getElementById("about-metrics-cards").innerHTML = a.metrics
    .map((m) => {
      const accent = METRIC_ACCENT[m.color] ?? METRIC_ACCENT.sand;
      return `
        <article class="rounded-[1.5rem] border border-black/5 bg-white p-6 shadow-panel flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full shrink-0 ${accent.dot}"></span>
            <h3 class="font-semibold text-sm ${accent.text}">${m.name}</h3>
          </div>
          <p class="text-sm leading-7 text-slateblue/80">${m.desc}</p>
          ${m.plain ? `<p class="mt-auto border-t border-black/5 pt-3 text-xs leading-6 text-slateblue/55 italic">${m.plain}</p>` : ""}
        </article>`;
    })
    .join("");

  // File browser
  setText("about-browser-title", a.browserTitle);
  setText("about-browser-body", a.browserBody);

  renderFileBrowser("about-browser-group-apifirst", "api_first", a);
  renderFileBrowser("about-browser-group-opinionated", "opinionated", a);

  // Glossary
  setText("about-glossary-title", a.glossaryTitle);
  setText("about-glossary-body", a.glossaryBody);
  document.getElementById("about-glossary-list").innerHTML = a.glossary
    .map(
      (g) => `
        <div class="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-panel">
          <div class="font-bold text-sm text-slateblue">${g.term}</div>
          <p class="mt-2 text-sm leading-7 text-slateblue/75">${g.def}</p>
        </div>`
    )
    .join("");
}

function renderFileBrowser(containerId, category, a) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const stacks = STACKS_MANIFEST.filter((s) => s.category === category);
  const groupLabel = document.createElement("div");
  groupLabel.className = "px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slateblue/50";
  groupLabel.textContent = category === "api_first" ? a.apifirstLabel : a.opinionatedLabel;
  container.append(groupLabel);

  stacks.forEach((stack, index) => {
    const isLast = index === stacks.length - 1;

    const wrapper = document.createElement("div");
    wrapper.className = "border-t border-black/5";

    // Toggle button
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-sand/60";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-semibold uppercase ${stack.category === "api_first" ? "bg-aqua/30 text-slateblue" : "bg-ember/15 text-ember"}">${stack.framework.slice(0, 2)}</span>
        <div class="min-w-0">
          <span class="font-semibold text-sm">${stack.framework}</span>
          <span class="ml-2 font-mono text-xs text-slateblue/50">${stack.language} · ${stack.orm}</span>
        </div>
      </div>
      <svg class="chevron h-4 w-4 shrink-0 text-slateblue/40 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `;

    // Content panel
    const panel = document.createElement("div");
    panel.className = "hidden px-4 pb-4";
    panel.innerHTML = buildFilePanelHtml(stack, a);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      panel.classList.toggle("hidden", expanded);
      toggle.querySelector(".chevron").classList.toggle("rotate-180", !expanded);
    });

    wrapper.append(toggle, panel);
    container.append(wrapper);
  });
}

function buildFilePanelHtml(stack, a) {
  const colors = a.categoryColors;

  function categoryBlock(label, colorClass, patterns, emptyNote) {
    if (patterns.length === 0 && !emptyNote) return "";
    const items = patterns.length === 0
      ? `<span class="italic text-slateblue/45">${emptyNote}</span>`
      : patterns.map((p) => `<code class="block font-mono text-xs text-slateblue/80 break-all">${p}</code>`).join("");
    return `
      <div>
        <span class="inline-flex mb-2 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold ${colorClass}">${label}</span>
        <div class="space-y-1 rounded-2xl bg-sand/60 px-4 py-3">${items}</div>
      </div>`;
  }

  return `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${categoryBlock("domain", colors.domain, stack.handwritten.domain, a.noDomainNote)}
      ${categoryBlock("api", colors.api, stack.handwritten.api, "")}
      ${categoryBlock("persistence", colors.persistence, stack.handwritten.persistence, "")}
      ${categoryBlock("operational", colors.operational, stack.operational, "")}
    </div>`;
}

// ── Author page ─────────────────────────────────────────────────────────────

function renderAuthorPage() {
  const a = getCopy().author;

  setText("author-name", AUTHOR.name);
  setText("author-handle", AUTHOR.handle);
  setText("author-location", a.locationLabel);

  // Profile links
  document.getElementById("author-links").innerHTML = `
    <a href="${AUTHOR.github}" target="_blank" rel="noopener noreferrer"
      class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20">
      <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
      <div class="text-left">
        <div>${AUTHOR.handle}</div>
        <div class="font-mono text-[10px] text-white/50">GitHub</div>
      </div>
    </a>
    <a href="${AUTHOR.linkedin}" target="_blank" rel="noopener noreferrer"
      class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20">
      <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      <div class="text-left">
        <div>in/felipemrvieira</div>
        <div class="font-mono text-[10px] text-white/50">LinkedIn</div>
      </div>
    </a>
  `;

  setText("author-bio-title", a.bioTitle);
  setText("author-bio-body", a.bioBody);

  document.getElementById("author-tags").innerHTML = a.tags
    .map(
      (tag) =>
        `<span class="inline-flex rounded-full border border-black/8 bg-sand px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slateblue/70">${tag}</span>`
    )
    .join("");

  setText("author-contact-title", a.contactTitle);
  setText("author-contact-body", a.contactBody);

  document.getElementById("author-contact-cards").innerHTML = a.contactCards
    .map((card) => {
      const isEmber = card.color === "ember";
      const accent = isEmber
        ? { pill: "bg-ember/15 text-ember", arrow: "text-ember" }
        : { pill: "bg-aqua/30 text-slateblue", arrow: "text-slateblue/60" };
      return `
        <a href="${card.url}" target="_blank" rel="noopener noreferrer"
          class="group flex flex-col gap-3 rounded-[2rem] border border-black/5 bg-white p-6 shadow-panel transition hover:scale-[1.015]">
          <div class="flex items-center justify-between gap-2">
            <span class="text-base font-bold">${card.label}</span>
            <span class="font-mono text-xs ${accent.pill} rounded-full px-2 py-0.5">${card.handle}</span>
          </div>
          <p class="text-sm leading-6 text-slateblue/70">${card.desc}</p>
          <div class="mt-auto font-mono text-xs ${accent.arrow}">Visit \u2192</div>
        </a>`;
    })
    .join("");
}

// ── Tab management ───────────────────────────────────────────────────────────

function applyTabState(tab) {
  document.getElementById("view-dashboard").classList.toggle("hidden", tab !== "dashboard");
  document.getElementById("view-about").classList.toggle("hidden", tab !== "about");
  document.getElementById("view-author").classList.toggle("hidden", tab !== "author");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("bg-slateblue", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("shadow-sm", active);
    btn.classList.toggle("text-slateblue/70", !active);
    btn.classList.toggle("hover:text-slateblue", !active);
  });
}

function initTabs() {
  setText("nav-dashboard-label", getCopy().navDashboard);
  setText("nav-about-label", getCopy().navAbout);
  setText("nav-author-label", getCopy().navAuthor);

  const stored = localStorage.getItem(TAB_STORAGE_KEY) || "dashboard";
  applyTabState(stored);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      localStorage.setItem(TAB_STORAGE_KEY, tab);
      applyTabState(tab);
    });
  });
}

function renderStaticCopy() {  const copy = getCopy();
  document.documentElement.lang = copy.htmlLang;
  setText("hero-title", copy.heroTitle);
  setText("hero-body", copy.heroBody);
  setText("lenses-title", copy.lensesTitle);
  setText("lens-total-title", copy.lensTotalTitle);
  setText("lens-total-body", copy.lensTotalBody);
  setText("lens-handwritten-title", copy.lensHandwrittenTitle);
  setText("lens-handwritten-body", copy.lensHandwrittenBody);
  setText("lens-operational-title", copy.lensOperationalTitle);
  setText("lens-operational-body", copy.lensOperationalBody);
  setText("global-title", copy.globalTitle);
  setText("global-body", copy.globalBody);
  setText("guided-title", copy.guidedTitle);
  setText("guided-body", copy.guidedBody);
  setText("category-title", copy.categoryTitle);
  setText("category-body", copy.categoryBody);
  setText("how-title", copy.howTitle);
  setHtml("how-1", copy.how1);
  setHtml("how-2", copy.how2);
  setHtml("how-3", copy.how3);
  setHtml("how-4", copy.how4);
  setText("scope-title", copy.scopeTitle);
  setText("measures-title", copy.measuresTitle);
  setText("not-measures-title", copy.notMeasuresTitle);
  renderList("measures-list", copy.measuresList);
  renderList("not-measures-list", copy.notMeasuresList);
  setText("methodology-title", copy.methodologyTitle);
  setText("methodology-body", copy.methodologyBody);
}

function renderLocaleState() {
  document.querySelectorAll(".locale-toggle").forEach((button) => {
    const active = button.dataset.locale === currentLocale;
    button.classList.toggle("bg-slateblue", active);
    button.classList.toggle("text-white", active);
    button.classList.toggle("shadow-sm", active);
    button.classList.toggle("text-slateblue", !active);
  });
}

function setupLocaleSwitcher() {
  document.querySelectorAll(".locale-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      currentLocale = button.dataset.locale || DEFAULT_LOCALE;
      localStorage.setItem(LOCALE_STORAGE_KEY, currentLocale);
      if (window.__dashboardData) {
        renderDashboard(window.__dashboardData);
      } else {
        renderStaticCopy();
      }
      renderAboutPage();
      renderAuthorPage();
      setText("nav-dashboard-label", getCopy().navDashboard);
      setText("nav-about-label", getCopy().navAbout);
      setText("nav-author-label", getCopy().navAuthor);
      renderLocaleState();
    });
  });
  renderLocaleState();
}

function renderHeroStats(rows) {
  const copy = getCopy();
  const leanestTotal = sortedBy(rows, "total_tokens", "asc")[0];
  const leanestHandwritten = sortedBy(rows, "handwritten_tokens", "asc")[0];
  const leanestOperational = sortedBy(rows, "operational_ratio", "asc")[0];
  const cards = [
    {
      label: copy.heroStats.total,
      value: leanestTotal.framework,
      meta: `${formatInt(leanestTotal.total_tokens)} tokens`,
    },
    {
      label: copy.heroStats.handwritten,
      value: leanestHandwritten.framework,
      meta: `${formatInt(leanestHandwritten.handwritten_tokens)} tokens`,
    },
    {
      label: copy.heroStats.operational,
      value: leanestOperational.framework,
      meta: ratio(leanestOperational.operational_ratio),
    },
  ];

  document.getElementById("hero-stats").innerHTML = cards
    .map(
      (card) => `
        <div class="rounded-3xl border border-black/5 bg-sand p-4">
          <div class="font-mono text-[11px] uppercase tracking-[0.18em] text-slateblue/70">${card.label}</div>
          <div class="mt-3 text-2xl font-bold">${card.value}</div>
          <div class="mt-1 text-sm text-slateblue/75">${card.meta}</div>
        </div>
      `
    )
    .join("");
}

function renderSnapshotBanner(metadata) {
  const container = document.getElementById("snapshot-banner");
  if (!metadata) {
    container.innerHTML = "";
    return;
  }
  const copy = getCopy();

  container.innerHTML = `
    <div class="inline-flex flex-wrap items-center gap-3 rounded-3xl border border-black/5 bg-sand px-4 py-3 text-sm text-slateblue/80">
      <span><strong>${copy.snapshot.label}:</strong> ${formatUtc(metadata.latest_generated_at)}</span>
      <span class="hidden h-4 w-px bg-black/10 sm:block"></span>
      <span><strong>${copy.snapshot.stacks}:</strong> ${metadata.stack_count}</span>
      <span class="hidden h-4 w-px bg-black/10 sm:block"></span>
      <span><strong>${copy.snapshot.warnings}:</strong> ${metadata.warning_count}</span>
    </div>
  `;
}

function renderMethodologyCards() {
  const copy = getCopy();
  document.getElementById("methodology-cards").innerHTML = copy.methodologyCards
    .map(
      (card) => `
        <article class="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-panel">
          <h3 class="text-lg font-semibold">${card.title}</h3>
          <p class="mt-3 text-sm leading-7 text-slateblue/80">${card.text}</p>
        </article>
      `
    )
    .join("");

  document.getElementById("methodology-grid").innerHTML = copy.methodologyGrid
    .map(
      ([title, text]) => `
        <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div class="font-mono text-[11px] uppercase tracking-[0.18em] text-white/65">${title}</div>
          <p class="mt-3 text-sm leading-7 text-white/80">${text}</p>
        </div>
      `
    )
    .join("");
}

function renderRankingCard(title, key, rows, formatter, accentClass, direction = "asc", subtitle = "") {
  const ranked = sortedBy(rows, key, direction);
  const panel = createPanel(title);
  if (subtitle) {
    const copy = document.createElement("p");
    copy.className = "mb-5 -mt-2 text-sm leading-7 text-slateblue/80";
    copy.textContent = subtitle;
    panel.append(copy);
  }
  const list = document.createElement("div");
  list.className = "space-y-3";

  ranked.forEach((row, index) => {
    const entry = document.createElement("div");
    entry.className = "flex items-center justify-between gap-4 rounded-3xl border border-black/5 bg-sand px-4 py-3";
    entry.innerHTML = `
      <div class="flex min-w-0 items-center gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accentClass} font-mono text-sm font-medium">${index + 1}</div>
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold capitalize">${row.framework}</div>
          <div class="truncate text-xs text-slateblue/70">${frameworkLabel(row)}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-semibold">${formatter(row[key])}</div>
      </div>
    `;
    list.append(entry);
  });

  panel.append(list);
  return panel;
}

function renderGlobalRankings(rows) {
  const copy = getCopy();
  const container = document.getElementById("global-rankings");
  container.innerHTML = "";
  container.append(
    renderRankingCard(
      copy.rankings.totalTitle,
      "total_tokens",
      rows,
      formatInt,
      "bg-ember/20 text-ember",
      "asc",
      copy.rankings.totalSubtitle
    ),
    renderRankingCard(
      copy.rankings.handwrittenTitle,
      "handwritten_tokens",
      rows,
      formatInt,
      "bg-aqua/30 text-slateblue",
      "asc",
      copy.rankings.handwrittenSubtitle
    ),
    renderRankingCard(
      copy.rankings.operationalTitle,
      "operational_ratio",
      rows,
      ratio,
      "bg-slateblue/10 text-slateblue",
      "asc",
      copy.rankings.operationalSubtitle
    )
  );
}

function rankWithin(rows, key, direction = "asc") {
  const sorted = sortedBy(rows, key, direction);
  return new Map(sorted.map((row, index) => [row.stack_id, index + 1]));
}

function renderCategorySection(categoryGroup, analysisRows) {
  const copy = getCopy();
  const section = createPanel(copy.categoryLabels[categoryGroup], copy.categorySectionSubtitle);
  const categoryRows = analysisRows.filter((row) => row.category_group === categoryGroup);
  const totalRank = rankWithin(categoryRows, "total_tokens", "asc");
  const handwrittenRank = rankWithin(categoryRows, "handwritten_tokens", "asc");
  const operationalRank = rankWithin(categoryRows, "operational_ratio", "asc");

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "overflow-x-auto";
  const table = document.createElement("table");
  table.className = "min-w-full border-separate border-spacing-y-3";
  table.innerHTML = `
    <thead>
      <tr class="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slateblue/65">
        <th class="px-3 py-2">${copy.tableHeaders.stack}</th>
        <th class="px-3 py-2">${copy.tableHeaders.total}</th>
        <th class="px-3 py-2">${copy.tableHeaders.handwritten}</th>
        <th class="px-3 py-2">${copy.tableHeaders.operational}</th>
        <th class="px-3 py-2">${copy.tableHeaders.api}</th>
        <th class="px-3 py-2">${copy.tableHeaders.domain}</th>
        <th class="px-3 py-2">${copy.tableHeaders.persistence}</th>
        <th class="px-3 py-2">${copy.tableHeaders.positions}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  sortedBy(categoryRows, "handwritten_tokens", "asc").forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "rounded-3xl bg-sand";
    tr.innerHTML = `
      <td class="rounded-l-3xl px-3 py-4 align-top">
        <div class="font-semibold capitalize">${row.framework}</div>
        <div class="text-xs text-slateblue/70">${row.language} · ${row.orm}</div>
      </td>
      <td class="px-3 py-4 align-top">${formatInt(row.total_tokens)}</td>
      <td class="px-3 py-4 align-top">${formatInt(row.handwritten_tokens)}</td>
      <td class="px-3 py-4 align-top">${ratio(row.operational_ratio)}</td>
      <td class="px-3 py-4 align-top">${formatInt(row.api_tokens)}</td>
      <td class="px-3 py-4 align-top">${formatInt(row.domain_tokens)}</td>
      <td class="px-3 py-4 align-top">${formatInt(row.persistence_tokens)}</td>
      <td class="rounded-r-3xl px-3 py-4 align-top text-xs leading-6 text-slateblue/80">
        ${copy.positions.total} #${totalRank.get(row.stack_id)}<br />
        ${copy.positions.handwritten} #${handwrittenRank.get(row.stack_id)}<br />
        ${copy.positions.operational} #${operationalRank.get(row.stack_id)}
      </td>
    `;
    tbody.append(tr);
  });

  tableWrapper.append(table);
  section.append(tableWrapper);
  return section;
}

function renderGuidedInsights(rows) {
  const copy = getCopy();
  const byTotal = sortedBy(rows, "total_tokens", "asc");
  const byHandwritten = sortedBy(rows, "handwritten_tokens", "asc");
  const byOperational = sortedBy(rows, "operational_ratio", "asc");
  const cards = [
    {
      title: copy.guidedCards.total.title,
      text: copy.guidedCards.total.text(byTotal[0]),
    },
    {
      title: copy.guidedCards.handwritten.title,
      text: copy.guidedCards.handwritten.text(byHandwritten[0]),
    },
    {
      title: copy.guidedCards.operational.title,
      text: copy.guidedCards.operational.text(byOperational[0]),
    },
  ];

  document.getElementById("guided-insights").innerHTML = cards
    .map(
      (card) => `
        <article class="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-panel">
          <h3 class="text-lg font-semibold">${card.title}</h3>
          <p class="mt-3 text-sm leading-7 text-slateblue/80">${card.text}</p>
        </article>
      `
    )
    .join("");
}

function enrichAnalysisRows(analysisRows, summaryRows) {
  const byStack = new Map();

  summaryRows.forEach((row) => {
    const current = byStack.get(row.stack_id) ?? { category_group: row.category_group };
    current[row.measurement_category] = Number(row.tokens);
    byStack.set(row.stack_id, current);
  });

  return analysisRows.map((row) => ({
    ...row,
    total_tokens: toNumber(row.total_tokens),
    handwritten_tokens: toNumber(row.handwritten_tokens),
    operational_tokens: toNumber(row.operational_tokens),
    handwritten_ratio: Number(row.handwritten_ratio),
    operational_ratio: Number(row.operational_ratio),
    normalized_tokens: toNumber(row.normalized_tokens),
    config_heavy_stack: row.config_heavy_stack === "True",
    api_tokens: toNumber(row.api_tokens),
    domain_tokens: toNumber(row.domain_tokens),
    persistence_tokens: toNumber(row.persistence_tokens),
    category_group: byStack.get(row.stack_id)?.category_group ?? "unknown",
  }));
}

function renderConfigHeavyCallout(rows) {
  const copy = getCopy();
  const configHeavy = rows.filter((row) => row.config_heavy_stack);
  const panel = createPanel(copy.configHeavy.title, copy.configHeavy.subtitle);
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";

  configHeavy.forEach((row) => {
    const card = document.createElement("div");
    card.className = "rounded-3xl border border-black/5 bg-sand px-4 py-4";
    card.innerHTML = `
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-semibold capitalize">${row.framework}</div>
          <div class="text-xs text-slateblue/70">${copy.categoryLabels[row.category_group]}</div>
        </div>
        <div class="text-sm font-semibold">${ratio(row.operational_ratio)}</div>
      </div>
    `;
    wrap.append(card);
  });

  panel.append(wrap);
  document.getElementById("global-rankings").append(panel);
}

async function loadData() {
  const [analysisResponse, summaryResponse, metadata] = await Promise.all([
    fetchFirstAvailable(ANALYSIS_CANDIDATES),
    fetchFirstAvailable(SUMMARY_CANDIDATES),
    fetchOptionalJson(METADATA_CANDIDATES),
  ]);

  const [analysisText, summaryText] = await Promise.all([
    analysisResponse.text(),
    summaryResponse.text(),
  ]);

  const analysisRows = parseCsv(analysisText);
  const summaryRows = parseCsv(summaryText);
  return {
    rows: enrichAnalysisRows(analysisRows, summaryRows),
    metadata,
  };
}

async function fetchFirstAvailable(candidates) {
  for (const candidate of candidates) {
    const response = await fetch(candidate);
    if (response.ok) {
      return response;
    }
  }

  throw new Error(getCopy().errors.csvLoad);
}

async function fetchOptionalJson(candidates) {
  for (const candidate of candidates) {
    const response = await fetch(candidate);
    if (response.ok) {
      return response.json();
    }
  }

  return null;
}

function renderDashboard(data) {
  const { rows, metadata } = data;
  renderStaticCopy();
  renderSnapshotBanner(metadata);
  renderHeroStats(rows);
  renderMethodologyCards();
  renderGlobalRankings(rows);
  renderConfigHeavyCallout(rows);
  renderGuidedInsights(rows);

  const categoryContainer = document.getElementById("category-sections");
  categoryContainer.innerHTML = "";
  categoryContainer.append(
    renderCategorySection("api_first", rows),
    renderCategorySection("opinionated", rows)
  );
}

async function boot() {
  currentLocale = localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;
  renderStaticCopy();
  renderAboutPage();
  renderAuthorPage();
  initTabs();
  setupLocaleSwitcher();

  try {
    const data = await loadData();
    window.__dashboardData = data;
    renderDashboard(data);
    renderLocaleState();
  } catch (error) {
    const copy = getCopy();
    document.body.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-20">
        <div class="rounded-[2rem] border border-red-200 bg-white p-8 shadow-panel">
          <h1 class="text-2xl font-bold">${copy.errors.loadTitle}</h1>
          <p class="mt-4 text-sm leading-7 text-slateblue/80">${error.message}</p>
          <p class="mt-4 text-sm leading-7 text-slateblue/80">${copy.errors.loadHelp}</p>
        </div>
      </main>
    `;
  }
}

boot();
