const state = {
  data: null,
  route: routeFromPath(location.pathname)
};

function routeFromPath(pathname) {
  if (pathname.endsWith("dingpen.html")) return "dingpen";
  if (pathname.endsWith("zhuangqian.html")) return "zhuangqian";
  return "home";
}

function appPath(route) {
  if (route === "dingpen") return "./dingpen.html";
  if (route === "zhuangqian") return "./zhuangqian.html";
  return "./";
}

async function boot() {
  const response = await fetch("./dashboard.json");
  state.data = await response.json();
  render();
  window.addEventListener("popstate", () => {
    state.route = routeFromPath(location.pathname);
    render();
  });
}

function navigate(route) {
  history.pushState({}, "", appPath(route));
  state.route = route;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function render() {
  const root = document.getElementById("app");
  if (!state.data) {
    root.innerHTML = `<main class="shell"><div class="loading">加载看板数据...</div></main>`;
    return;
  }
  if (state.route === "home") {
    root.innerHTML = renderHome(state.data);
  } else {
    const product = state.data.products.find((item) => item.id === state.route);
    root.innerHTML = product ? renderProduct(product, state.data) : renderHome(state.data);
  }
  bindLinks();
}

function bindLinks() {
  document.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(node.dataset.route);
    });
  });
  bindCharts();
}

function bindCharts() {
  document.querySelectorAll("[data-chart-target]").forEach((node) => {
    node.addEventListener("click", () => {
      const target = document.getElementById(node.dataset.chartTarget);
      if (!target) return;
      if (node.dataset.details) {
        const details = JSON.parse(decodeURIComponent(node.dataset.details));
        target.querySelector("[data-readout-label]").textContent = details.label;
        target.querySelector("[data-readout-value]").textContent = details.total;
        const list = target.querySelector("[data-readout-details]");
        if (list) {
          list.innerHTML = details.items.map((item) => `<span><i style="background:${item.color}"></i>${item.name}<b>${item.value}</b></span>`).join("");
        }
      } else {
        const value = node.dataset.valueLabel || node.dataset.value || "";
        const percent = node.dataset.percent ? ` · ${node.dataset.percent}%` : "";
        const label = [node.dataset.month, node.dataset.name].filter(Boolean).join(" · ");
        target.querySelector("[data-readout-label]").textContent = label;
        target.querySelector("[data-readout-value]").textContent = `${value}${percent}`;
      }
      const card = target.closest(".chart-card");
      card.querySelectorAll("[data-chart-target]").forEach((item) => item.classList.remove("is-active"));
      node.classList.add("is-active");
    });
  });
}

function renderHome(data) {
  const { home, products } = data;
  return `
    <main class="home-shell">
      <section class="home-panel">
        <header class="home-header">
          <div class="brand-mark" aria-hidden="true">${trendIcon()}</div>
          <div>
            <div class="title-sub">${home.kicker}</div>
            <h1>${home.title}</h1>
          </div>
        </header>

        <section class="select-title">
          <p>${home.subtitle}</p>
          <h2>选择产品</h2>
        </section>

        <nav class="product-grid" aria-label="产品">
          ${products
            .map(
              (product) => `
                <a class="product-card ${product.theme}" href="${product.path}" data-route="${product.id}">
                  <span class="pc-name">${product.name}</span>
                  <span class="pc-arrow" aria-hidden="true">${arrowIcon()}</span>
                </a>
              `
            )
            .join("")}
        </nav>

        <section class="overview-card" aria-label="${home.totalLabel}">
          <div class="ov-label">${home.totalLabel}</div>
          <div class="ov-total">
            <span>${home.totalText.replace(" 万", "")}</span><em>万</em>
          </div>
          <div class="ovt-label">${home.totalBreakdown}</div>
        </section>

        <footer class="home-footer">${home.footer}</footer>
      </section>
    </main>
  `;
}

function renderProduct(product, data) {
  const charts = buildChartData(product);
  return `
    <main class="detail-shell ${product.theme}" style="--primary:${product.primary};--secondary:${product.secondary};--soft:${product.softBg};--grad-a:${product.gradient[0]};--grad-b:${product.gradient[1]}">
      <section class="detail-container">
        <header class="detail-header">
          <a class="back-link" href="./" data-route="home">${leftIcon()}<span>返回首页</span></a>
          <div class="detail-title-row">
            <div class="detail-mark">${product.mark}</div>
            <h1>${product.name} · 全平台数据看板 <span>营销号内容数据追踪</span></h1>
          </div>
          <div class="update-pill">📅 ${data.updatedLabel}</div>
        </header>

        <section class="hero-total">
          <div>2026 年累计总播放量</div>
          <strong>${product.heroTotal}</strong>
        </section>

        <section class="target-card">
          <div>
            <h2>年度目标进度</h2>
            <strong>${product.targetPercent}</strong>
            <p>${product.targetDone}</p>
          </div>
          ${progress(productPercent(product.targetPercent))}
          ${ticks(product.targetTicks)}
        </section>

        <section class="quick-grid">
          ${quickStat("pulse", product.monthStat.label, product.monthStat.value, product.monthStat.note)}
          ${quickStat("star", product.peakStat.label, product.peakStat.value, product.peakStat.note)}
        </section>

        <section class="content-card milestone-card">
          <h2>增长里程碑</h2>
          ${product.milestones.map((item) => milestone(item)).join("")}
        </section>

        <section class="bars-grid">
          ${product.monthlyPlatforms ? platformBars(product.monthlyPlatforms, data.platformColors) : ""}
          ${platformBars(product.cumulative, data.platformColors)}
        </section>

        <section class="chart-grid">
          ${pieChart("各平台占比", product.cumulative.items, data.platformColors, `${product.id}-pie`)}
          ${areaChart("月度播放趋势", charts.months, charts.series, `${product.id}-trend`)}
          ${stackedChart("月度各平台分布", charts.months, charts.series, data.platformColors, `${product.id}-stack`)}
        </section>

        <section class="content-card table-card">
          <h2>月度明细数据</h2>
          ${dataTable(product.table)}
        </section>

        <section class="total-card">
          <div>
            <p>${product.totalCard.label}</p>
            <strong>${product.totalCard.value}</strong>
            <span>${product.totalCard.note}</span>
          </div>
          <dl>
            ${product.totalCard.stats
              .map((item) => `<div><dt>${item.value}</dt><dd>${item.label}</dd></div>`)
              .join("")}
          </dl>
        </section>

        <footer class="detail-footer">数据来源：${data.sourceLabel}</footer>
      </section>
    </main>
  `;
}

function productPercent(text) {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}

function quickStat(kind, label, value, note) {
  const icon = kind === "star" ? starIcon() : pulseIcon();
  return `
    <article class="quick-card">
      <div class="quick-icon ${kind}">${icon}</div>
      <div>
        <p>${label}</p>
        <strong>${value}</strong>
        <span>${note}</span>
      </div>
    </article>
  `;
}

function milestone(item) {
  return `
    <div class="milestone">
      <div class="milestone-head">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>
      ${progress(item.percent)}
      ${ticks(item.ticks)}
    </div>
  `;
}

function progress(percent) {
  const width = Math.max(0, Math.min(100, percent));
  return `<div class="progress"><span style="width:${width}%"></span></div>`;
}

function ticks(items) {
  return `<div class="ticks">${items.map((item) => `<span>${item}</span>`).join("")}</div>`;
}

function platformBars(section, colors) {
  const max = Math.max(1, ...section.items.map((item) => item.value));
  const subtitle = section.subtitle ? `<p>${section.subtitle}</p>` : `<p>合计 ${section.total}</p>`;
  return `
    <section class="content-card bar-card">
      <div class="section-head">
        <h2>${section.title}</h2>
        ${subtitle}
      </div>
      <div class="bar-list">
        ${section.items
          .map((item, index) => {
            const width = item.value === 0 ? 0 : Math.max(3, (item.value / max) * 100);
            const color = colors[item.name] || "#64748b";
            return `
              <div class="bar-row">
                <span class="rank ${index < 3 ? "top" : ""}">${index + 1}</span>
                <span class="platform">${item.name}</span>
                <div class="track">
                  <span style="width:${width}%;--bar:${color}"></span>
                </div>
                <strong>${item.label}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function buildChartData(product) {
  const section = product.table.sections.find((item) => item.year === "2026 年") || product.table.sections[0];
  const headers = product.table.headers;
  const platformHeaders = headers.slice(1, -2);
  const rows = section.rows.filter((row) => !row[0].includes("累计"));
  const months = rows.map((row) => row[0]);
  const totals = rows.map((row) => toNumber(row[row.length - 2]));
  const series = platformHeaders.map((name, index) => ({
    name,
    values: rows.map((row) => toNumber(row[index + 1]))
  }));
  return { months, totals, series };
}

function toNumber(value) {
  if (!value || value === "—") return 0;
  return Number(String(value).replace(/,/g, "")) || 0;
}

function formatWanFromRaw(value) {
  return `${(value / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}万`;
}

function formatAxisWan(value) {
  const wan = value / 10000;
  if (wan >= 1000) return `${Math.round(wan)}万`;
  if (wan >= 100) return `${Math.round(wan)}万`;
  if (wan >= 10) return `${Math.round(wan)}万`;
  return `${wan.toFixed(1)}万`;
}

function niceAxis(maxValue, segments = 4) {
  const maxWan = Math.max(1, maxValue / 10000);
  const rawStep = maxWan / segments;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const base = rawStep / power;
  const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  const stepWan = niceBase * power;
  const topWan = Math.ceil(maxWan / stepWan) * stepWan;
  return Array.from({ length: segments + 1 }, (_, index) => (topWan * index * 10000) / segments);
}

function distributionColor(name) {
  const colors = {
    "快手": "#f6c28b",
    "小红书": "#f5576c",
    "B站": "#f7a8bd",
    "视频号": "#9bdab2",
    "小红书(小号)": "#f8b8c2",
    "抖音": "#9dccf5",
    "抖音(小号)": "#c9e4fb",
    "快手(小号)": "#f9d8b7",
    "视频号(小号)": "#cbeed8"
  };
  return colors[name] || "#b9c3d1";
}

function pathForSlice(cx, cy, radius, startPercent, endPercent) {
  const start = (startPercent / 100) * Math.PI * 2 - Math.PI / 2;
  const end = (endPercent / 100) * Math.PI * 2 - Math.PI / 2;
  const x1 = cx + Math.cos(start) * radius;
  const y1 = cy + Math.sin(start) * radius;
  const x2 = cx + Math.cos(end) * radius;
  const y2 = cy + Math.sin(end) * radius;
  const largeArc = endPercent - startPercent > 50 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function readout(id, label, value) {
  return `
    <div class="chart-readout" id="${id}">
      <span data-readout-label>${label}</span>
      <strong data-readout-value>${value}</strong>
    </div>
  `;
}

function trendReadout(id, details) {
  return `
    <div class="chart-readout trend-tooltip" id="${id}">
      <span data-readout-label>${details.label}</span>
      <strong data-readout-value>${details.total}</strong>
      <div data-readout-details>
        ${details.items.map((item) => `<span><i style="background:${item.color}"></i>${item.name}<b>${item.value}</b></span>`).join("")}
      </div>
    </div>
  `;
}

function pieChart(title, items, colors, readoutId) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;
  const active = items.find((item) => item.value > 0) || items[0];
  const slices = items
    .filter((item) => item.value > 0)
    .map((item, index) => {
      const start = cursor;
      cursor += (item.value / total) * 100;
      const color = colors[item.name] || "#64748b";
      const percent = ((item.value / total) * 100).toFixed(1);
      return `
        <path
          class="pie-slice ${index === 0 ? "is-active" : ""}"
          d="${pathForSlice(80, 80, 74, start, cursor)}"
          fill="${color}"
          data-chart-target="${readoutId}"
          data-name="${item.name}"
          data-value-label="${item.label}"
          data-percent="${percent}"
        ></path>
      `;
    });
  const activePercent = ((active.value / total) * 100).toFixed(1);

  return `
    <section class="content-card chart-card">
      <div class="chart-title-row">
        <h2>${title}</h2>
        ${readout(readoutId, active.name, `${active.label} · ${activePercent}%`)}
      </div>
      <div class="pie-wrap">
        <svg class="pie-svg" viewBox="0 0 160 160" role="img" aria-label="${title}">
          ${slices.join("")}
          <circle cx="80" cy="80" r="43"></circle>
        </svg>
        <ul>
          ${items
            .filter((item) => item.value > 0)
            .map((item, index) => {
              const percent = ((item.value / total) * 100).toFixed(1);
              return `<li class="legend-button ${index === 0 ? "is-active" : ""}" data-chart-target="${readoutId}" data-name="${item.name}" data-value-label="${item.label}" data-percent="${percent}"><span style="background:${colors[item.name] || "#64748b"}"></span>${item.name}<strong>${item.label}</strong></li>`;
            })
            .join("")}
        </ul>
      </div>
    </section>
  `;
}

function smoothPath(points, startCommand = "M") {
  if (!points.length) return "";
  let d = `${startCommand} ${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const cp2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function monthDetails(months, series, monthIndex) {
  const items = series
    .map((item) => ({
      name: item.name,
      raw: item.values[monthIndex],
      value: formatWanFromRaw(item.values[monthIndex]),
      color: distributionColor(item.name)
    }))
    .filter((item) => item.raw > 0);
  const total = items.reduce((sum, item) => sum + item.raw, 0);
  return {
    label: months[monthIndex],
    total: formatWanFromRaw(total),
    items
  };
}

function encodedDetails(details) {
  return encodeURIComponent(JSON.stringify(details));
}

function areaChart(title, months, series, readoutId) {
  const width = 560;
  const height = 288;
  const plot = { left: 62, right: 24, top: 34, bottom: 44 };
  const visibleSeries = series.filter((item) => item.values.some((value) => value > 0));
  const totals = months.map((_, monthIndex) => visibleSeries.reduce((sum, item) => sum + item.values[monthIndex], 0));
  const axisTicks = niceAxis(Math.max(1, ...totals), 6);
  const max = Math.max(...axisTicks);
  const activeIndex = Math.max(0, months.length - 1);
  const activeDetails = monthDetails(months, visibleSeries, activeIndex);
  const xFor = (index) => plot.left + (index / Math.max(1, months.length - 1)) * (width - plot.left - plot.right);
  const yFor = (value) => height - plot.bottom - (value / max) * (height - plot.top - plot.bottom);
  const baselines = months.map(() => 0);
  const layers = visibleSeries.map((item) => {
    const bottom = baselines.map((value, index) => [xFor(index), yFor(value)]);
    item.values.forEach((value, index) => {
      baselines[index] += value;
    });
    const top = baselines.map((value, index) => [xFor(index), yFor(value)]);
    const bottomReverse = [...bottom].reverse();
    return {
      name: item.name,
      color: distributionColor(item.name),
      d: `${smoothPath(top)} ${smoothPath(bottomReverse, "L")} Z`
    };
  });
  const topLinePoints = months.map((_, index) => [xFor(index), yFor(totals[index])]);
  return `
    <section class="content-card chart-card trend-card">
      <div class="chart-title-row">
        <h2>${title}</h2>
        ${trendReadout(readoutId, activeDetails)}
      </div>
      <div class="trend-legend">
        ${visibleSeries.map((item) => `<span><i style="background:${distributionColor(item.name)}"></i>${item.name}</span>`).join("")}
      </div>
      <svg class="trend-area-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
        ${axisTicks.map((tick) => {
          const y = height - plot.bottom - (tick / max) * (height - plot.top - plot.bottom);
          return `
            <line class="grid-line" x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"></line>
            <text class="axis-label" x="${plot.left - 12}" y="${y + 4}">${formatAxisWan(tick)}</text>
          `;
        }).join("")}
        <line class="axis-line" x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${height - plot.bottom}"></line>
        <line class="axis-line" x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}"></line>
        ${layers.map((layer) => `<path class="trend-layer" d="${layer.d}" fill="${layer.color}"></path>`).join("")}
        <path class="trend-top-line" d="${smoothPath(topLinePoints)}"></path>
        ${topLinePoints.map(([x, y], index) => {
          const details = encodedDetails(monthDetails(months, visibleSeries, index));
          return `
            <rect class="trend-hit" x="${x - 18}" y="${plot.top}" width="36" height="${height - plot.top - plot.bottom}" data-chart-target="${readoutId}" data-details="${details}"></rect>
            <circle class="trend-point ${index === activeIndex ? "is-active" : ""}" cx="${x}" cy="${y}" r="5" data-chart-target="${readoutId}" data-details="${details}"></circle>
          `;
        }).join("")}
        ${months.map((month, index) => {
          const x = plot.left + (index / Math.max(1, months.length - 1)) * (width - plot.left - plot.right);
          return `<text class="trend-label ${index === activeIndex ? "is-active" : ""}" x="${x}" y="${height - 8}" data-chart-target="${readoutId}" data-details="${encodedDetails(monthDetails(months, visibleSeries, index))}">${month}</text>`;
        }).join("")}
      </svg>
    </section>
  `;
}

function stackedChart(title, months, series, colors, readoutId) {
  let defaultItem = null;
  const visibleSeries = series.filter((item) => item.values.some((value) => value > 0));
  const monthTotals = months.map((_, monthIndex) => visibleSeries.reduce((sum, item) => sum + item.values[monthIndex], 0));
  const axisTicks = niceAxis(Math.max(1, ...monthTotals), 4);
  const maxTotal = Math.max(...axisTicks);
  const columns = months.map((month, monthIndex) => {
    const total = series.reduce((sum, item) => sum + item.values[monthIndex], 0) || 1;
    const nonZero = visibleSeries.filter((item) => item.values[monthIndex] > 0);
    if (!defaultItem && monthIndex === months.length - 1 && nonZero.length) {
      const top = nonZero.reduce((best, item) => (item.values[monthIndex] > best.values[monthIndex] ? item : best), nonZero[0]);
      defaultItem = { month, name: top.name, value: top.values[monthIndex], percent: ((top.values[monthIndex] / total) * 100).toFixed(1) };
    }
    return `
      <div class="stack-column">
        <div class="stack-column-track" style="height:${Math.max(6, (monthTotals[monthIndex] / maxTotal) * 100)}%">
          ${nonZero
            .map((item) => {
              const percentOfMonth = (item.values[monthIndex] / total) * 100;
              const isActive = defaultItem && defaultItem.month === month && defaultItem.name === item.name;
              return `<i class="${isActive ? "is-active" : ""}" title="${item.name}" style="height:${Math.max(2, percentOfMonth)}%;background:${distributionColor(item.name)}" data-chart-target="${readoutId}" data-month="${month}" data-name="${item.name}" data-value-label="${formatWanFromRaw(item.values[monthIndex])}" data-percent="${percentOfMonth.toFixed(1)}"></i>`;
            })
            .join("")}
        </div>
        <span>${month}</span>
      </div>
    `;
  });
  defaultItem = defaultItem || { month: months[0], name: series[0]?.name || "", value: series[0]?.values[0] || 0, percent: "0.0" };
  return `
    <section class="content-card chart-card stack-card">
      <div class="chart-title-row">
        <h2>${title}</h2>
        ${readout(readoutId, `${defaultItem.month} · ${defaultItem.name}`, `${formatWanFromRaw(defaultItem.value)} · ${defaultItem.percent}%`)}
      </div>
      <div class="stack-chart">
        <div class="stack-axis">
          ${axisTicks.map((tick) => `<span>${formatAxisWan(tick)}</span>`).reverse().join("")}
        </div>
        <div class="stack-plot">
          ${axisTicks.map((_, index) => `<div class="stack-grid-line" style="bottom:${(index / (axisTicks.length - 1)) * 100}%"></div>`).join("")}
          <div class="stack-columns">${columns.join("")}</div>
        </div>
      </div>
      <div class="stack-legend">
        ${visibleSeries.map((item) => `<span><i style="background:${distributionColor(item.name)}"></i>${item.name}</span>`).join("")}
      </div>
    </section>
  `;
}

function dataTable(table) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>${table.headers.map((header) => `<th>${header}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${table.sections
            .map(
              (section) => `
                <tr class="year-row"><td colspan="${table.headers.length}">${section.year}</td></tr>
                ${section.rows
                  .map((row) => {
                    const cells = table.headers.map((_, index) => row[index] || "");
                    const isTotal = row[0].includes("累计") || row[0].includes("全年");
                    return `<tr class="${isTotal ? "summary-row" : ""}">${cells.map((cell, index) => `<td class="${index === 0 ? "month-cell" : ""}">${cell}</td>`).join("")}</tr>`;
                  })
                  .join("")}
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function trendIcon() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M3 17.5l5.2-5.2 4.1 4.1L21 7.7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h6v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function arrowIcon() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function leftIcon() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function pulseIcon() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2.2-6 4.4 12 2.4-6h5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function starIcon() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.3l2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

boot();
