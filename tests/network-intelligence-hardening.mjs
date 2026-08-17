import assert from "node:assert/strict";
import {CATALOG,statusFor} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {networkIntelligenceHardeningManifest} from "../src/domains/network-intelligence-hardening.js";

assert.equal(CATALOG.common_crawl.access,"public");
assert.equal(CATALOG.common_crawl.arbitrary_url,false);
assert.equal(statusFor({},"common_crawl").configured,true);
assert.deepEqual(OPERATIONS.common_crawl,["latest_index","index_lookup"]);
assert.deepEqual(OPERATIONS.cloudflare_browser_run,["source_info","content","markdown","links","scrape","snapshot"]);
assert.ok(OPERATIONS.geospatial_commercial.includes("public_anchor_browser_render"));

const manifest=networkIntelligenceHardeningManifest();
assert.equal(manifest.government_public_data_policy.mainland_china_public_collection_priority,true);
assert.equal(manifest.government_public_data_policy.anonymity_claim,false);
assert.equal(manifest.browser_run_policy.binding,"BROWSER");
assert.equal(manifest.browser_run_policy.api_token_required,false);
assert.equal(manifest.browser_run_policy.sole_browser_runtime,true);
assert.equal(manifest.browser_run_policy.ephemeral_execution_only,true);
assert.equal(manifest.browser_run_policy.session_or_page_state_persisted,false);
assert.equal(manifest.browser_run_policy.cookies_persisted,false);
assert.equal(manifest.browser_run_policy.fixed_allowlisted_sources_only,true);
assert.equal(manifest.browser_run_policy.automatic_browser_fallback,false);
assert.equal(manifest.browser_run_policy.login_or_cookie_injection,false);
for(const deny of ["login-bypass","captcha-bypass","rate-limit-bypass","proxy-rotation-for-evasion","anti-bot-evasion","stealth-or-untraceability-claims"])assert.ok(manifest.hard_denies.includes(deny));
for(const tool of ["common_crawl","cloudflare_browser_run","scrapy","warcio","selectolax"])assert.ok(manifest.added_tools[tool]);
assert.equal(manifest.added_tools.playwright,undefined);
assert.equal(manifest.added_tools.puppeteer,undefined);
for(const label of ["observed","derived","inferred","hypothesis"])assert.ok(manifest.evidence_contract.inference_labels.includes(label));

const originalFetch=globalThis.fetch;
const calls=[];
try{
  globalThis.fetch=async input=>{
    const u=new URL(String(input));calls.push(u.toString());
    assert.equal(u.hostname,"index.commoncrawl.org");
    if(u.pathname==="/collinfo.json")return new Response(JSON.stringify([{id:"CC-MAIN-2026-30",name:"July 2026 Index","cdx-api":"https://index.commoncrawl.org/CC-MAIN-2026-30-index"}]),{status:200,headers:{"content-type":"application/json"}});
    assert.equal(u.pathname,"/CC-MAIN-2026-30-index");
    assert.equal(u.searchParams.get("url"),"https://www.fuzhou.gov.cn/zwgk/");
    assert.equal(u.searchParams.get("output"),"json");
    const rows=[
      {url:"https://www.fuzhou.gov.cn/zwgk/",timestamp:"20260701010203",status:"200",mime:"text/html",digest:"sha1:AAA",filename:"crawl-data/test.warc.gz",offset:"10",length:"100"},
      {url:"https://www.fuzhou.gov.cn/zwgk/",timestamp:"20260601010203",status:"200",mime:"text/html",digest:"sha1:BBB",filename:"crawl-data/test2.warc.gz",offset:"20",length:"120"}
    ];
    return new Response(rows.map(x=>JSON.stringify(x)).join("\n"),{status:200,headers:{"content-type":"application/x-ndjson"}});
  };
  const latest=await runAdapter("common_crawl","latest_index",{},{});
  assert.equal(latest.latest.id,"CC-MAIN-2026-30");
  const out=await runAdapter("common_crawl","index_lookup",{url:"https://www.fuzhou.gov.cn/zwgk/",limit:1},{});
  assert.equal(out.collection,"CC-MAIN-2026-30");
  assert.equal(out.items.length,1);
  assert.equal(out.raw_warc_fetched,false);
  assert.equal(out.arbitrary_live_target_fetch,false);
  assert.equal(calls.some(x=>x.includes("fuzhou.gov.cn")&&new URL(x).hostname!=="index.commoncrawl.org"),false);
  await assert.rejects(()=>runAdapter("common_crawl","index_lookup",{url:"http://127.0.0.1/private"},{}),/PRIVATE_OR_LOCAL_URL_DENIED/);
} finally {globalThis.fetch=originalFetch;}

const browserCalls=[];
const browserEnv={BROWSER:{quickAction:async(action,payload)=>{browserCalls.push({action,payload});assert.equal(action,"content");assert.equal(new URL(payload.url).hostname,"fgw.fuzhou.gov.cn");assert.equal(payload.gotoOptions.waitUntil,"networkidle2");return new Response(JSON.stringify({success:true,result:`<html><head><title>福州项目测试</title></head><body><div>发布日期：2026-06-25</div><table><tr><th>项目</th><th>投资</th></tr><tr><td>测试道路</td><td>7273.46万元</td></tr></table><a href="/fgwzwgk/fzgh/test.pdf">附件</a></body></html>`}),{status:200,headers:{"content-type":"application/json","x-browser-ms-used":"321"}})}}};
const rendered=await runAdapter("geospatial_commercial","public_anchor_browser_render",{source_id:"fuzhou_project_pipeline",url:"https://fgw.fuzhou.gov.cn/fgwzwgk/fzgh/202606/t20260625_5338008.htm",timeout_ms:6000},browserEnv);
assert.equal(browserCalls.length,1);
assert.equal(rendered.retrieved_via,"cloudflare-browser-run-quick-action-content");
assert.equal(rendered.evidence_label,"public_observed_web_snapshot");
assert.equal(rendered.browser_ms_used,321);
assert.equal(rendered.policy.browser_run,true);
assert.equal(rendered.policy.automatic_browser_fallback,false);
assert.equal(rendered.tables.length,1);
assert.equal(rendered.attachments.length,1);
assert.equal(rendered.attachments[0].extension,"pdf");
assert.equal(rendered.source_receipt.digest_sha256.length,64);
await assert.rejects(()=>runAdapter("geospatial_commercial","public_anchor_browser_render",{source_id:"fuzhou_project_pipeline",url:"https://example.com/"},browserEnv),/PUBLIC_ANCHOR_HOST_DENIED/);
await assert.rejects(()=>runAdapter("geospatial_commercial","public_anchor_browser_render",{source_id:"fuzhou_project_pipeline",url:"https://fgw.fuzhou.gov.cn/fgwzwgk/fzgh/test.htm"},{}),/CLOUDFLARE_BROWSER_BINDING_NOT_CONFIGURED/);

const quickCalls=[];
const networkBrowserEnv={
  NETWORK_INTELLIGENCE_BROWSER_ALLOWLIST:"fuzhou.gov.cn,copernicus.eu",
  BROWSER:{quickAction:async(action,payload)=>{
    quickCalls.push({action,payload});
    assert.equal(new URL(payload.url).hostname,"www.fuzhou.gov.cn");
    assert.equal(payload.gotoOptions.waitUntil,"networkidle2");
    const result=action==="content"?"<html><body><h1>福州公开信息</h1></body></html>":action==="markdown"?"# 福州公开信息":action==="links"?["https://www.fuzhou.gov.cn/a","mailto:test@example.com"]:action==="scrape"?[{selector:"h1",results:[{text:"福州公开信息",html:"福州公开信息",attributes:[],height:20,width:100,top:10,left:10}]}]:action==="snapshot"?{content:"<html><body>snapshot</body></html>",markdown:"# snapshot",accessibilityTree:{role:"RootWebArea",name:"snapshot"}}:null;
    return new Response(JSON.stringify({success:true,result}),{status:200,headers:{"content-type":"application/json","x-browser-ms-used":"77"}});
  }}
};
const target="https://www.fuzhou.gov.cn/zwgk/";
const info=await runAdapter("cloudflare_browser_run","source_info",{},networkBrowserEnv);
assert.equal(info.worker_binding_no_api_token,true);
assert.ok(info.allowlisted_host_suffixes.includes("fuzhou.gov.cn"));
const content=await runAdapter("cloudflare_browser_run","content",{url:target},networkBrowserEnv);assert.match(content.result,/福州公开信息/);assert.equal(content.browser_ms_used,77);assert.equal(content.source_receipt.digest_sha256.length,64);
const markdown=await runAdapter("cloudflare_browser_run","markdown",{url:target},networkBrowserEnv);assert.equal(markdown.result,"# 福州公开信息");
const links=await runAdapter("cloudflare_browser_run","links",{url:target},networkBrowserEnv);assert.deepEqual(links.result,["https://www.fuzhou.gov.cn/a"]);assert.equal(quickCalls.find(x=>x.action==="links").payload.visibleLinksOnly,true);
const scrape=await runAdapter("cloudflare_browser_run","scrape",{url:target,selectors:["h1"]},networkBrowserEnv);assert.equal(scrape.result[0].results[0].text,"福州公开信息");assert.deepEqual(quickCalls.find(x=>x.action==="scrape").payload.elements,[{selector:"h1"}]);
const snapshot=await runAdapter("cloudflare_browser_run","snapshot",{url:target,formats:["content","markdown","accessibilityTree","screenshot"]},networkBrowserEnv);assert.equal(snapshot.result.markdown,"# snapshot");assert.deepEqual(quickCalls.find(x=>x.action==="snapshot").payload.formats,["content","markdown","accessibilityTree"]);assert.equal(snapshot.policy.screenshot_binary_disabled,true);
await assert.rejects(()=>runAdapter("cloudflare_browser_run","content",{url:"https://example.com/"},networkBrowserEnv),/BROWSER_HOST_NOT_ALLOWLISTED/);
await assert.rejects(()=>runAdapter("cloudflare_browser_run","content",{url:"http://www.fuzhou.gov.cn/"},networkBrowserEnv),/BROWSER_HTTPS_REQUIRED/);
await assert.rejects(()=>runAdapter("cloudflare_browser_run","content",{url:"https://127.0.0.1/"},networkBrowserEnv),/PRIVATE_OR_LOCAL_URL_DENIED/);

console.log(JSON.stringify({ok:true,suite:"network-intelligence-hardening",common_crawl:true,cloudflare_browser_run_contract:true,browser_quick_actions:["content","markdown","links","scrape","snapshot"],browser_binding:"BROWSER",sole_browser_runtime:true,browser_ephemeral:true,browser_auto_fallback:false,mainland_government_public_collection_priority:true,no_evasion:true,inference_labels:manifest.evidence_contract.inference_labels}));
