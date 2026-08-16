import {runAdapter as runWindAdapter} from "./adapters-extra32.js";

const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
const sha256=async value=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value))));
const safeText=(value,n=120)=>String(value??"").replace(/[\r\n\t]+/g," ").trim().slice(0,n);

export async function runWindSelftest(env){
  const started=Date.now();
  try{
    const out=await runWindAdapter("aifin_market","list_tools",{server_type:"stock_data"},env);
    const tools=Array.isArray(out?.result?.tools)?out.result.tools:[];
    const names=tools.map(x=>String(x?.name||"")).filter(Boolean);
    const stockPriceTool=names.includes("get_stock_price_indicators");
    const observed={
      provider:"aifin_market",
      source:out?.source||null,
      server_type:out?.server_type||null,
      tool_count:tools.length,
      stock_price_tool:stockPriceTool,
      transport:"mcp-streamable-http",
      auth:"bearer",
      ai_called:false
    };
    const ok=observed.source==="Wind AIFin Market"&&observed.server_type==="stock_data"&&tools.length>0&&stockPriceTool;
    const receipt_digest=await sha256(observed);
    return json({
      ok,
      selftest:"wind-aifin-readiness",
      runtime:true,
      protocol_e2e:true,
      business_e2e:false,
      ...observed,
      receipt_digest,
      secrets_redacted:true,
      elapsed_ms:Date.now()-started,
      observed_at:new Date().toISOString()
    },ok?200:503);
  }catch(error){
    const code=safeText(error?.message||"WIND_SELFTEST_FAILED",80);
    const allowed=new Set([
      "UPSTREAM_AUTH_FAILED","UPSTREAM_RATE_LIMIT","UPSTREAM_SERVER_ERROR","UPSTREAM_UNAVAILABLE",
      "UPSTREAM_TIMEOUT","UPSTREAM_HTTP_ERROR","UPSTREAM_JSONRPC_ERROR","UPSTREAM_EMPTY_RESPONSE",
      "UPSTREAM_RESPONSE_FORMAT_ERROR","UPSTREAM_TOOL_ERROR"
    ]);
    return json({
      ok:false,
      selftest:"wind-aifin-readiness",
      runtime:true,
      protocol_e2e:false,
      business_e2e:false,
      provider:"aifin_market",
      error:allowed.has(code)?code:"WIND_SELFTEST_FAILED",
      ai_called:false,
      secrets_redacted:true,
      elapsed_ms:Date.now()-started,
      observed_at:new Date().toISOString()
    },503);
  }
}
