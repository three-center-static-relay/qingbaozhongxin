import assert from "node:assert/strict";
import fs from "node:fs";
import {CATALOG} from "../src/catalog.js";

const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/china-intelligence-research-database-registry.json",import.meta.url),"utf8"));
assert.ok(Array.isArray(registry.sources));
assert.ok(registry.sources.length>=80,`expected >=80 China intelligence sources, got ${registry.sources.length}`);
const ids=new Set(registry.sources.map(x=>x.id));
for(const id of [
  "china_nbs","pbc","safe","customs","mof","ndrc","miit","nea","mee","mot","caac","samr","cnipa","ggzy","ccgp","creditchina","gsxt",
  "sse","szse","cninfo","chinabond","chinamoney","shfe","dce","czce",
  "npcssd","nstrs","ckcest","science_db_cas","geodata_cn",
  "cfps","charls","cgss","chfs","cmes","ceps","clds","clhls",
  "cnrds","csmar","resset","eps_data","cnki","wanfang",
  "drc","cicir","ciis","cciee","caict","ccid","cf40","nifd","pku_nsd","tsinghua_ciss",
  "cflp","caam","cec","cisa","iresearch","analysys","questmobile",
  "aifin_market","wind_terminal","ifind","eastmoney_choice"
]) assert.ok(ids.has(id),`missing China source ${id}`);

assert.ok(CATALOG.aifin_market,"AIFin Market missing from runtime catalog");
assert.equal(CATALOG.aifin_market.secrets?.[0],"WIND_API_KEY");
assert.equal(CATALOG.aifin_market.install_manifest,"https://aifinmarket.wind.com.cn/skill.md");
assert.equal(CATALOG.aifin_market.registration_url,"https://aifinmarket.wind.com.cn/#/user/overview");
assert.equal(CATALOG.aifin_market.adapter,"catalog-only","Do not claim live AIFin execution before official runtime contract is verified");
assert.ok(CATALOG.aifin_market.scope.includes("A-share-HK-US-equities"));
console.log(JSON.stringify({ok:true,china_sources:registry.sources.length,aifin_catalog:true,aifin_live:false}));
