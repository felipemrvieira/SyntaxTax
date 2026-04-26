const ANALYSIS_CANDIDATES = ["./data/analysis.csv", "../results/analysis.csv"];
const SUMMARY_CANDIDATES = ["./data/summary.csv", "../results/summary.csv"];

const categoryLabels = {
  api_first: "API-first / microframeworks",
  opinionated: "Opinionated / structured frameworks",
};

const methodologyCards = [
  {
    title: "Equivalência funcional",
    text: "Nenhuma stack entra na medição sem passar no mesmo validador funcional e implementar o mesmo domínio.",
  },
  {
    title: "Tokenização fixa",
    text: "O benchmark usa cl100k_base, ordenação alfabética estável e strategy pure_content_only.",
  },
  {
    title: "Duas views",
    text: "handwritten separa código de aplicação. operational_extras captura configuração e infraestrutura mínima.",
  },
  {
    title: "Comparação justa",
    text: "As stacks são comparadas dentro de grupos metodológicos e também globalmente, com lentes distintas.",
  },
];

const methodologyGrid = [
  ["Domínio fixo", "User, Product, Order e OrderItem em todas as stacks."],
  ["Mesmos endpoints", "POST/GET users, POST/GET products, POST/GET/PATCH orders."],
  ["Mesmas exclusões", "vendor, node_modules, test, spec, dist, build e .venv ficam fora."],
  ["Granularidade", "Métricas por arquivo, categoria, view e stack."],
];

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
  return new Intl.NumberFormat("pt-BR").format(Number(value));
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

function renderHeroStats(rows) {
  const analysis = sortedBy(rows, "total_tokens", "desc");
  const maxHandwritten = sortedBy(rows, "handwritten_tokens", "desc")[0];
  const leanestTotal = sortedBy(rows, "total_tokens", "asc")[0];
  const cards = [
    {
      label: "Maior corpus total",
      value: analysis[0].framework,
      meta: `${formatInt(analysis[0].total_tokens)} tokens`,
    },
    {
      label: "Maior handwritten",
      value: maxHandwritten.framework,
      meta: `${formatInt(maxHandwritten.handwritten_tokens)} tokens`,
    },
    {
      label: "Menor total",
      value: leanestTotal.framework,
      meta: `${formatInt(leanestTotal.total_tokens)} tokens`,
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

function renderMethodologyCards() {
  document.getElementById("methodology-cards").innerHTML = methodologyCards
    .map(
      (card) => `
        <article class="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-panel">
          <h3 class="text-lg font-semibold">${card.title}</h3>
          <p class="mt-3 text-sm leading-7 text-slateblue/80">${card.text}</p>
        </article>
      `
    )
    .join("");

  document.getElementById("methodology-grid").innerHTML = methodologyGrid
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

function renderRankingCard(title, key, rows, formatter, accentClass) {
  const ranked = sortedBy(rows, key, "desc");
  const panel = createPanel(title);
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
  const container = document.getElementById("global-rankings");
  container.append(
    renderRankingCard("Total tokens", "total_tokens", rows, formatInt, "bg-ember/20 text-ember"),
    renderRankingCard("Handwritten tokens", "handwritten_tokens", rows, formatInt, "bg-aqua/30 text-slateblue"),
    renderRankingCard("Operational ratio", "operational_ratio", rows, ratio, "bg-slateblue/10 text-slateblue")
  );
}

function rankWithin(rows, key) {
  const sorted = sortedBy(rows, key, "desc");
  return new Map(sorted.map((row, index) => [row.stack_id, index + 1]));
}

function renderCategorySection(categoryGroup, analysisRows) {
  const section = createPanel(categoryLabels[categoryGroup], "Ranking interno por corpus total, custo handwritten e peso operacional.");
  const categoryRows = analysisRows.filter((row) => row.category_group === categoryGroup);
  const totalRank = rankWithin(categoryRows, "total_tokens");
  const handwrittenRank = rankWithin(categoryRows, "handwritten_tokens");
  const operationalRank = rankWithin(categoryRows, "operational_ratio");

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "overflow-x-auto";
  const table = document.createElement("table");
  table.className = "min-w-full border-separate border-spacing-y-3";
  table.innerHTML = `
    <thead>
      <tr class="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slateblue/65">
        <th class="px-3 py-2">Stack</th>
        <th class="px-3 py-2">Total</th>
        <th class="px-3 py-2">Handwritten</th>
        <th class="px-3 py-2">Operational</th>
        <th class="px-3 py-2">API</th>
        <th class="px-3 py-2">Domain</th>
        <th class="px-3 py-2">Persistence</th>
        <th class="px-3 py-2">Ranks</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  sortedBy(categoryRows, "handwritten_tokens", "desc").forEach((row) => {
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
        total #${totalRank.get(row.stack_id)}<br />
        handwritten #${handwrittenRank.get(row.stack_id)}<br />
        operational #${operationalRank.get(row.stack_id)}
      </td>
    `;
    tbody.append(tr);
  });

  tableWrapper.append(table);
  section.append(tableWrapper);
  return section;
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
  const configHeavy = rows.filter((row) => row.config_heavy_stack);
  const panel = createPanel("Stacks puxadas por overhead operacional", "Estas stacks têm mais de 50% do corpus vindo da camada operacional na análise agregada.");
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";

  configHeavy.forEach((row) => {
    const card = document.createElement("div");
    card.className = "rounded-3xl border border-black/5 bg-sand px-4 py-4";
    card.innerHTML = `
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-semibold capitalize">${row.framework}</div>
          <div class="text-xs text-slateblue/70">${categoryLabels[row.category_group]}</div>
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
  const [analysisResponse, summaryResponse] = await Promise.all([
    fetchFirstAvailable(ANALYSIS_CANDIDATES),
    fetchFirstAvailable(SUMMARY_CANDIDATES),
  ]);

  const [analysisText, summaryText] = await Promise.all([
    analysisResponse.text(),
    summaryResponse.text(),
  ]);

  const analysisRows = parseCsv(analysisText);
  const summaryRows = parseCsv(summaryText);
  return enrichAnalysisRows(analysisRows, summaryRows);
}

async function fetchFirstAvailable(candidates) {
  for (const candidate of candidates) {
    const response = await fetch(candidate);
    if (response.ok) {
      return response;
    }
  }

  throw new Error("Não foi possível carregar os CSVs do benchmark.");
}

async function boot() {
  try {
    const rows = await loadData();
    renderHeroStats(rows);
    renderMethodologyCards();
    renderGlobalRankings(rows);
    renderConfigHeavyCallout(rows);

    const categoryContainer = document.getElementById("category-sections");
    categoryContainer.append(
      renderCategorySection("api_first", rows),
      renderCategorySection("opinionated", rows)
    );
  } catch (error) {
    document.body.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-20">
        <div class="rounded-[2rem] border border-red-200 bg-white p-8 shadow-panel">
          <h1 class="text-2xl font-bold">Falha ao carregar o dashboard</h1>
          <p class="mt-4 text-sm leading-7 text-slateblue/80">${error.message}</p>
          <p class="mt-4 text-sm leading-7 text-slateblue/80">
            Sirva o repositório por HTTP, por exemplo com <code class="font-mono">python3 -m http.server 8000</code>,
            e abra <code class="font-mono">http://localhost:8000/dashboard/</code>.
          </p>
        </div>
      </main>
    `;
  }
}

boot();
