const ANALYSIS_CANDIDATES = ["./data/analysis.csv", "../results/analysis.csv"];
const SUMMARY_CANDIDATES = ["./data/summary.csv", "../results/summary.csv"];
const METADATA_CANDIDATES = ["./data/metadata.json"];
const DEFAULT_LOCALE = "en";
const LOCALE_STORAGE_KEY = "syntaxtax-dashboard-locale";

let currentLocale = DEFAULT_LOCALE;

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

function renderStaticCopy() {
  const copy = getCopy();
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
