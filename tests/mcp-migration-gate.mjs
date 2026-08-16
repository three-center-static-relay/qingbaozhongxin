import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS} from "../src/adapters.js";

const pureMcp=["amap","baidu_maps","tencent_maps","aifin_market","yuandian","qichacha"];
for(const p of pureMcp){
  assert.ok(CATALOG[p],`missing ${p}`);
  assert.match(String(CATALOG[p].integration||""),/mcp/i,`${p} must declare MCP integration`);
  assert.match(String(CATALOG[p].adapter||""),/mcp/i,`${p} must route through MCP adapter`);
  assert.notEqual(CATALOG[p].rest_fallback,true,`${p} must not silently fall back to REST`);
  assert.ok(Array.isArray(OPERATIONS[p])&&OPERATIONS[p].length>0,`${p} must have callable MCP operations`);
}
assert.ok(CATALOG.pkulaw);assert.match(`${CATALOG.pkulaw.scope||""} ${CATALOG.pkulaw.integration||""}`,/mcp|jsonrpc/i,"PKULaw must remain on its official MCP JSON-RPC path");
assert.ok(CATALOG.govinfo);assert.match(String(CATALOG.govinfo.integration||""),/mcp-preview/i,"GovInfo MCP is preview and must stay explicitly marked preview");
assert.ok(CATALOG.tianditu);assert.equal(CATALOG.tianditu.integration,"official-https-api");assert.match(String(CATALOG.tianditu.mcp_status||""),/no-public-official-mcp/i,"TianDiTu must not be relabeled MCP without a verified official MCP endpoint");
console.log(JSON.stringify({ok:true,suite:"mcp-migration-gate",pure_mcp:pureMcp,pkulaw_mcp_jsonrpc:true,govinfo_preview_not_forced:true,tianditu_api_not_faked_as_mcp:true}));
