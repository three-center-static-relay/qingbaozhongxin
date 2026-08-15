const TIMEOUT_MS=15000,MAX_BYTES=1600000,MAX_TEXT=80000;
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
async function readBounded(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);if(!r.body)return"";const reader=r.body.getReader(),chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502)}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function page(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{signal:c.signal,headers:{accept:"text/html,text/plain,*/*;q=0.1","user-agent":"ThreeCenterIntelligence/1.0 (+bounded official source reader)"}}),raw=await readBounded(r);if(!r.ok)err(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":"UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:502,{http_status:r.status});return raw.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim().slice(0,MAX_TEXT)}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
const CHINA_OPPORTUNITY={
 ggzy:{name:"全国公共资源交易平台数据服务",priority:"S+",domain:"tenders-projects-land-mining-state-assets-procurement",url:"https://data.ggzy.gov.cn/",role:"business-opportunity-and-award-intelligence"},
 ccgp:{name:"中国政府采购网",priority:"S+",domain:"government-procurement-intentions-bids-awards-contracts-cases",url:"https://www.ccgp.gov.cn/",role:"government-procurement-and-case-intelligence"},
 cnipa:{name:"国家知识产权局数据",priority:"S+",domain:"patents-trademarks-geographical-indications-ip-statistics",url:"https://www.cnipa.gov.cn/col/col61/index.html",role:"technology-competition-and-ip-intelligence"},
 miit:{name:"工业和信息化部运行监测",priority:"S+",domain:"manufacturing-ict-internet-software-industry-operation",url:"https://www.miit.gov.cn/jgsj/yxj/xxfb/index.html",role:"china-industry-cycle-and-sector-intelligence"},
 nea:{name:"国家能源局",priority:"S+",domain:"electricity-renewables-coal-oil-gas-energy-projects",url:"https://www.nea.gov.cn/",role:"energy-market-and-investment-intelligence"},
 nhsa:{name:"国家医疗保障局统计数据",priority:"S+",domain:"medical-insurance-funds-drug-procurement-payment-medical-services",url:"https://www.nhsa.gov.cn/col/col84/index.html",role:"healthcare-market-payment-and-policy-intelligence"},
 mee:{name:"生态环境部环境质量",priority:"S+",domain:"air-water-ocean-environmental-quality-climate-policy",url:"https://www.mee.gov.cn/",role:"environmental-risk-and-industry-policy"},
 mot:{name:"交通运输部",priority:"S",domain:"road-waterway-logistics-freight-passenger-transport",url:"https://www.mot.gov.cn/",role:"transport-logistics-demand-intelligence"},
 moa:{name:"农业农村部",priority:"S",domain:"agriculture-crops-livestock-prices-rural-economy",url:"https://www.moa.gov.cn/",role:"agriculture-food-and-rural-market-intelligence"},
 caac:{name:"中国民用航空局",priority:"S",domain:"aviation-airports-airlines-passenger-cargo",url:"https://www.caac.gov.cn/",role:"aviation-market-intelligence"},
 openstd:{name:"国家标准全文公开系统",priority:"S+",domain:"national-standards-technical-rules",url:"https://openstd.samr.gov.cn/",role:"product-compliance-technology-and-market-entry"},
 creditchina:{name:"信用中国",priority:"S+",domain:"public-credit-administrative-penalties-trustworthiness",url:"https://www.creditchina.gov.cn/",role:"counterparty-and-compliance-intelligence"}
};
const QUANT_SOURCES=[
 {id:"fama_french",name:"Kenneth French Data Library",priority:"S+",access:"public-download",value:"3/5-factor, momentum, regional factors, portfolio sorts, breakpoints",url:"https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library.html"},
 {id:"fred_alfred",name:"FRED/ALFRED",priority:"S+",access:"free-api-key",value:"macroeconomic time series and point-in-time revisions",url:"https://fred.stlouisfed.org/docs/api/fred/overview.html"},
 {id:"finra_trace",name:"FINRA TRACE reports/statistics",priority:"S",access:"public-aggregates+licensed-detail",value:"corporate/agency/treasury bond market activity; detailed feeds may be paid",url:"https://www.finra.org/filing-reporting/trace/data"},
 {id:"nyfed_markets",name:"Federal Reserve Bank of New York Markets Data",priority:"S+",access:"public",value:"SOFR, repo, FX reference/market operations and balance-sheet market data",url:"https://markets.newyorkfed.org/"},
 {id:"frb_ddp",name:"Federal Reserve Board Data Download Program",priority:"S+",access:"public",value:"rates, industrial production, money, consumer credit, financial accounts",url:"https://www.federalreserve.gov/datadownload/"},
 {id:"ofr",name:"Office of Financial Research data",priority:"S",access:"public",value:"financial stress, funding, reference data and financial-system research",url:"https://www.financialresearch.gov/data/"},
 {id:"fdic",name:"FDIC BankFind/Summary of Deposits",priority:"S",access:"public",value:"US bank institutions, deposits, branches and financial condition",url:"https://banks.data.fdic.gov/"},
 {id:"cftc",name:"CFTC market/COT data",priority:"S+",access:"public",value:"futures/options positioning and market surveillance statistics",url:"https://www.cftc.gov/MarketReports/index.htm"},
 {id:"sec_edgar",name:"SEC EDGAR",priority:"S+",access:"public",value:"point-in-time filings/XBRL/fundamentals/events",url:"https://www.sec.gov/edgar/sec-api-documentation"},
 {id:"china_exchange_official",name:"SSE/SZSE/BSE/CFFEX/SHFE/DCE/CZCE/GFEX official data",priority:"S+",access:"public/mixed",value:"China equities, bonds, funds, futures, options and market statistics",url:"https://www.sse.com.cn/"}
];
const BUSINESS_METHODS=[
 {id:"procurement_opportunity",inputs:["ggzy","ccgp"],outputs:["demand-signals","awarded-suppliers","budget-bands","regional-demand","buyer-frequency"]},
 {id:"patent_competitive_landscape",inputs:["cnipa"],outputs:["technology-trends","assignee-landscape","white-space","filing-momentum"]},
 {id:"industry_cycle",inputs:["miit","nea","mot","moa","caac"],outputs:["sector-growth","capacity","demand","profit-cycle-proxies"]},
 {id:"healthcare_market",inputs:["nhsa"],outputs:["payer-growth","fund-flows","central-procurement","payment-policy","service-volume-proxies"]},
 {id:"compliance_market_entry",inputs:["openstd","creditchina","mee"],outputs:["standards","environmental-constraints","counterparty-risk"]}
];
async function run(operation,args){
 if(operation==="china_source_catalog")return{provider:"splus_opportunity",operation,items:Object.entries(CHINA_OPPORTUNITY).map(([id,x])=>({id,...x}))};
 if(operation==="official_page"){const key=text(args?.source,80).toLowerCase(),s=CHINA_OPPORTUNITY[key];if(!s)err("INVALID_SOURCE",400,{allowed:Object.keys(CHINA_OPPORTUNITY)});return{provider:"splus_opportunity",operation,source:key,meta:s,text:await page(s.url)}}
 if(operation==="quant_sources")return{provider:"splus_opportunity",operation,items:QUANT_SOURCES,note:"Research-data routing only; paid market feeds remain licensed and are not represented as free."};
 if(operation==="business_methods")return{provider:"splus_opportunity",operation,items:BUSINESS_METHODS,safety:"legitimate-market-research-and-decision-support-only"};
 err("ADAPTER_OPERATION_NOT_APPROVED",403)
}
export const OPERATIONS={splus_opportunity:["china_source_catalog","official_page","quant_sources","business_methods"]};
export async function runAdapter(provider,operation,args={}){if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403);return run(operation,args)}