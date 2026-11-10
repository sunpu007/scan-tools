/**
 * 混合方案：API查百度+移动，HTML解析查谷歌
 * API: https://apistore.aizhan.com/baidurank/siteinfos/[私钥]?domains=a.com|b.com
 * HTML: https://www.aizhan.com/cha/[域名]/
 *
 * 判定规则：百度>=1 或 移动>=1 或 谷歌>=3，任意一项满足，该主域名权重记为 1
 * 主域名或 www 任一满足即可
 * 运行环境：Node.js 18+（零依赖）
 */

// ================= 配置区 =================
const AIZHAN_PRIVATE_KEY = ""; // 替换为你的爱站 API 私钥

// 主域名列表
const DOMAINS = [];

const API_BATCH_SIZE = 50;
const HTML_DELAY_MIN = 3000;
const HTML_DELAY_MAX = 6000;
// ==========================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () =>
  sleep(HTML_DELAY_MIN + Math.random() * (HTML_DELAY_MAX - HTML_DELAY_MIN));

/** 生成查询列表：主域名 + www.主域名 */
function buildQueryList(mainDomains) {
  const set = new Set();
  for (const d of mainDomains) {
    const base = d.trim().toLowerCase();
    if (!base) continue;
    set.add(base);
    set.add(`www.${base}`);
  }
  return [...set];
}

function toMainDomain(host) {
  return host.replace(/^www\./i, "");
}

// ========== 第一步：API 查询百度+移动 ==========
async function queryApiBatch(domains) {
  const domainsStr = domains.join("|");
  const url = `https://apistore.aizhan.com/baidurank/siteinfos/${AIZHAN_PRIVATE_KEY}?domains=${encodeURIComponent(domainsStr)}`;
  const resp = await fetch(url, { timeout: 30000 });
  if (!resp.ok) throw new Error(`API HTTP ${resp.status}`);
  return resp.json();
}

async function fetchBaiduMobile(queryList) {
  const apiResults = [];
  const failed = [];

  for (let i = 0; i < queryList.length; i += API_BATCH_SIZE) {
    const batch = queryList.slice(i, i + API_BATCH_SIZE);
    console.log(`[API] 批次 ${i / API_BATCH_SIZE + 1}，${batch.length} 个域名...`);
    try {
      const data = await queryApiBatch(batch);
      if (data.code !== 200000) {
        console.warn(`  API 返回异常: ${data.msg || data.code}`);
        batch.forEach((d) => failed.push(d));
        continue;
      }
      const successList = data?.data?.success || [];
      for (const item of successList) {
        apiResults.push({
          查询域名: item.domain,
          百度权重: item.pc_br ?? 0,
          移动权重: item.m_br ?? 0,
        });
      }
      const returned = new Set(successList.map((s) => s.domain));
      batch.forEach((d) => {
        if (!returned.has(d)) failed.push(d);
      });
    } catch (e) {
      console.error(`  API 批次失败: ${e.message}`);
      batch.forEach((d) => failed.push(d));
    }
    await sleep(500);
  }

  return { apiResults, failed };
}

// ========== 第二步：HTML 解析谷歌 PR ==========
function parseGooglePr(html) {
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/\bsrc\s*=\s*"([^"]*)"/i);
    if (!srcMatch) continue;
    if (!/\/pr\//i.test(srcMatch[1])) continue;
    const altMatch = tag.match(/\balt\s*=\s*"([^"]*)"/i);
    if (altMatch) {
      const n = parseInt(altMatch[1].trim(), 10);
      return isNaN(n) ? 0 : n;
    }
  }
  return 0;
}

async function fetchGooglePr(domain) {
  const url = `https://www.aizhan.com/cha/${encodeURIComponent(domain)}/`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  });
  if (!resp.ok) throw new Error(`HTML HTTP ${resp.status}`);
  const html = await resp.text();
  return parseGooglePr(html);
}

// ========== 主流程 ==========
async function main() {
  if (AIZHAN_PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
    console.error("请先填入爱站 API 私钥（AIZHAN_PRIVATE_KEY）");
    return;
  }

  const queryList = buildQueryList(DOMAINS);
  console.log(`主域名 ${DOMAINS.length} 个，展开 www 后共 ${queryList.length} 个查询项\n`);

  // 第一步：API 查百度+移动
  console.log("=".repeat(50));
  console.log("第一步：API 查询百度权重 + 移动权重");
  const { apiResults, failed } = await fetchBaiduMobile(queryList);
  console.log(`API 返回 ${apiResults.length} 条，失败 ${failed.length} 条\n`);

  // 第二步：全部查询项查谷歌
  console.log("=".repeat(50));
  console.log("第二步：HTML 解析全部查询项的谷歌PR");
  const googleMap = {};

  for (let i = 0; i < queryList.length; i++) {
    const domain = queryList[i];
    console.log(`[${i + 1}/${queryList.length}] 查谷歌 ${domain} ...`);
    try {
      const pr = await fetchGooglePr(domain);
      googleMap[domain] = pr;
      console.log(`  谷歌PR = ${pr}`);
    } catch (e) {
      console.error(`  ❌ 失败：${e.message}`);
      googleMap[domain] = null;
    }
    await randomDelay();
  }

  // 合并 API 结果与谷歌结果
  const apiMap = new Map(apiResults.map((r) => [r.查询域名, r]));
  const allResults = queryList.map((domain) => {
    const apiRow = apiMap.get(domain);
    return {
      查询域名: domain,
      主域名: toMainDomain(domain),
      百度权重: apiRow ? apiRow.百度权重 : null,
      移动权重: apiRow ? apiRow.移动权重 : null,
      谷歌PR: googleMap[domain] ?? null,
    };
  });

  // 按主域名聚合
  const grouped = {};
  for (const r of allResults) {
    if (!grouped[r.主域名]) grouped[r.主域名] = {};
    const key = r.查询域名 === r.主域名 ? "main" : "www";
    grouped[r.主域名][key] = r;
  }

  // 判定：任一项满足（百度>=1 或 移动>=1 或 谷歌>=3）即权重=1
  const qualified = [];
  for (const [main, rec] of Object.entries(grouped)) {
    const mainRec = rec.main;
    const wwwRec = rec.www;

    const hit = (r) => {
      if (!r) return [];
      const reasons = [];
      if (r.百度权重 !== null && r.百度权重 >= 1) reasons.push("百度>=1");
      if (r.移动权重 !== null && r.移动权重 >= 1) reasons.push("移动>=1");
      if (r.谷歌PR !== null && r.谷歌PR >= 3) reasons.push("谷歌>=3");
      return reasons;
    };

    const mainHit = hit(mainRec);
    const wwwHit = hit(wwwRec);
    const isQualified = mainHit.length > 0 || wwwHit.length > 0;

    if (isQualified) {
      qualified.push({
        主域名: main,
        权重: 1,
        主域名_百度: mainRec?.百度权重 ?? "-",
        主域名_移动: mainRec?.移动权重 ?? "-",
        主域名_谷歌: mainRec?.谷歌PR ?? "-",
        www_百度: wwwRec?.百度权重 ?? "-",
        www_移动: wwwRec?.移动权重 ?? "-",
        www_谷歌: wwwRec?.谷歌PR ?? "-",
        命中项: [
          mainHit.length ? `主域名(${mainHit.join("+")})` : "",
          wwwHit.length ? `www(${wwwHit.join("+")})` : "",
        ].filter(Boolean).join("; "),
      });
    }
  }

  // 输出全部结果
  console.log("\n" + "=".repeat(50));
  console.log("全部结果（API百度/移动 + HTML谷歌）：");
  console.table(allResults);

  // 输出筛选结果
  console.log("\n" + "=".repeat(50));
  console.log("满足条件的主域名（百度>=1 或 移动>=1 或 谷歌>=3，任一满足权重记为1）：");
  if (qualified.length) {
    console.table(qualified);
  } else {
    console.log("  无");
  }

  // 浏览器 CSV 下载
  if (typeof document !== "undefined") {
    const header =
      "主域名,权重,主域名_百度,主域名_移动,主域名_谷歌,www_百度,www_移动,www_谷歌,命中项\n";
    const csv = "\uFEFF" + header +
      qualified.map((r) =>
        [
          r.主域名, r.权重, r.主域名_百度, r.主域名_移动, r.主域名_谷歌,
          r.www_百度, r.www_移动, r.www_谷歌, `"${r.命中项}"`,
        ].join(",")
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qualified_any_weight.csv";
    a.click();
    console.log("CSV 已下载");
  }

  return { allResults, qualified };
}

main().catch(console.error);
