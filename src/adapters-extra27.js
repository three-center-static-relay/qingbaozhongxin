const TIMEOUT_MS=15000,MAX_BYTES=1500000,MAX_TEXT=70000;
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
async function readBounded(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);if(!r.body)return"";const reader=r.body.getReader(),chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502)}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function fetchPage(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{signal:c.signal,headers:{accept:"text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1","user-agent":"ThreeCenterIntelligence/1.0 (+read-only official-source fetch)"}}),raw=await readBounded(r);if(!r.ok)err(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":"UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:502,{http_status:r.status});const cleaned=raw.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();return cleaned.slice(0,MAX_TEXT)}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
const CHINA_SOURCES={
 nbs_data:{name:"国家统计局国家数据",priority:"S+",domain:"macro-population-industry-consumption-prices-investment",url:"https://data.stats.gov.cn/",access:"public-official"},
 pbc:{name:"中国人民银行",priority:"S+",domain:"money-credit-social-financing-rates-payments-financial-stability",url:"https://www.pbc.gov.cn/",access:"public-official",fetchable:false},
 safe:{name:"国家外汇管理局",priority:"S+",domain:"fx-reserves-balance-of-payments-external-debt-cross-border-flows",url:"https://www.safe.gov.cn/",access:"public-official",fetchable:false},
 mof:{name:"财政部统计数据",priority:"S+",domain:"fiscal-revenue-expenditure-debt-government-finance",url:"https://gks.mof.gov.cn/tongjishuju/",access:"public-official"},
 customs:{name:"海关总署在线服务",priority:"S+",domain:"customs-trade-import-export",url:"https://online.customs.gov.cn/",access:"public-official"},
 mofcom:{name:"商务部统计数据",priority:"S+",domain:"trade-fdi-consumption-overseas-investment-contracting",url:"https://www.mofcom.gov.cn/tjsh/",access:"public-official"},
 csrc_securities:{name:"证监会证券市场月报",priority:"S+",domain:"securities-market-statistics-listed-companies",url:"https://www.csrc.gov.cn/csrc/c100120/common_list.shtml",access:"public-official"},
 csrc_futures:{name:"证监会期货市场周报",priority:"S+",domain:"futures-options-volume-open-interest-products",url:"https://www.csrc.gov.cn/csrc/c100121/common_list.shtml",access:"public-official"},
 sse_market:{name:"上海证券交易所市场数据",priority:"S+",domain:"equities-bonds-funds-options-market-statistics",url:"https://www.sse.com.cn/market/stockdata/statistic/",access:"public-official"},
 szse_market:{name:"深圳证券交易所市场数据",priority:"S+",domain:"equities-bonds-funds-options-market-statistics",url:"https://www.szse.cn/market/index.html",access:"public-official"},
 cninfo:{name:"巨潮资讯",priority:"S+",domain:"listed-company-disclosures-announcements-financial-reports",url:"https://www.cninfo.com.cn/new/index",access:"public-designated-disclosure-platform"},
 gov_policy:{name:"中国政府网政策",priority:"S+",domain:"state-council-policy-regulation-economic-social-policy",url:"https://www.gov.cn/zhengce/",access:"public-official"},
 npc_law:{name:"国家法律法规数据库",priority:"S+",domain:"laws-regulations-legal-reference",url:"https://flk.npc.gov.cn/",access:"public-official",fetchable:false},
 nmpa:{name:"国家药监局",priority:"S+",domain:"drug-device-cosmetics-regulation-approvals-safety",url:"https://www.nmpa.gov.cn/",access:"public-official",fetchable:false},
 nhc:{name:"国家卫生健康委员会",priority:"S+",domain:"health-policy-medical-services-public-health-statistics",url:"https://www.nhc.gov.cn/",access:"public-official",fetchable:false},
 chictr:{name:"中国临床试验注册中心",priority:"S",domain:"registered-clinical-trials",url:"https://www.chictr.org.cn/",access:"public-registry",fetchable:false}
};
const METHODS=[
 ["bayesian_decision","Bayesian decision analysis"],["mcda","Multi-criteria decision analysis"],["scenario_planning","Scenario planning"],["real_options","Real options"],["game_theory","Game theory"],["mechanism_design","Mechanism design"],["causal_inference","Causal inference"],["operations_research","Operations research"],["robust_optimization","Robust optimization"],["system_dynamics","System dynamics"],["agent_based_modeling","Agent-based modeling"],["premortem_redteam","Pre-mortem and red-team analysis"],["reference_class_forecasting","Reference-class forecasting"],["influence_diagrams","Decision trees and influence diagrams"],["portfolio_theory","Portfolio and risk theory"],["value_chain","Value-chain analysis"],["unit_economics","Unit economics"],["market_sizing","Market sizing"],["competitive_strategy","Competitive strategy"],["principled_negotiation","Principled negotiation / BATNA / ZOPA"]
].map(([id,name])=>({id,name,safety:"legitimate-analysis-only"}));
const CASE_ROUTES=[
 {id:"sec_filings",source:"SEC EDGAR",domain:"company-strategy-financial-events",access:"public"},
 {id:"world_bank_projects",source:"World Bank Projects/IEG",domain:"development-project-evaluation",access:"public"},
 {id:"oecd_policy_cases",source:"OECD",domain:"policy-industry-country-comparison",access:"public"},
 {id:"pubmed_cases",source:"PubMed/NCBI",domain:"medical-case-reports",access:"public-metadata"},
 {id:"europepmc_cases",source:"Europe PMC",domain:"medical-life-science-case-reports",access:"public"},
 {id:"openalex_case_studies",source:"OpenAlex",domain:"cross-disciplinary-case-studies",access:"public"},
 {id:"crossref_case_studies",source:"Crossref",domain:"published-case-studies",access:"public"},
 {id:"harvard_growth_lab",source:"Harvard Growth Lab",domain:"industry-trade-economic-complexity",access:"public"},
 {id:"icpsr",source:"ICPSR",domain:"social-behavior-policy-crime-education",access:"mixed"},
 {id:"ipums",source:"IPUMS",domain:"population-household-labor-demography",access:"free-registration-many-products"},
 {id:"rand",source:"RAND",domain:"policy-defense-health-economics",access:"public-research"},
 {id:"mit_ocw_sloan",source:"MIT OpenCourseWare/Sloan",domain:"management-operations-strategy",access:"public"},
 {id:"hbs_cases",source:"Harvard Business School Cases",domain:"business-management",access:"reference-only-licensed"},
 {id:"ivey_cases",source:"Ivey Publishing",domain:"business-management",access:"reference-only-licensed"},
 {id:"darden_cases",source:"Darden Business Publishing",domain:"business-management",access:"reference-only-licensed"}
];
const QUANT_ROUTES={
 macro_regime:["regime-switching","nowcasting","macro-factor-models","yield-curve-signals"],
 fundamental_equity:["quality-value-momentum-size-factors","event-studies","earnings-and-filings-signals","cross-sectional-ranking"],
 derivatives_positioning:["basis","term-structure","volatility","commitments-of-traders","open-interest"],
 portfolio_risk:["mean-variance","Black-Litterman","risk-parity","CVaR","drawdown-controls","Kelly-with-caps"],
 quant_validation:["walk-forward","purged-cross-validation","transaction-costs","survivorship-bias-controls","multiple-testing-controls"]
};
async function china(operation,args){
 if(operation==="source_catalog")return{provider:"splus_china",operation,items:Object.entries(CHINA_SOURCES).map(([id,x])=>({id,...x}))};
 if(operation==="official_page"){const id=text(args?.source,80).toLowerCase(),s=CHINA_SOURCES[id];if(!s)err("INVALID_SOURCE",400,{allowed:Object.keys(CHINA_SOURCES)});if(s.fetchable===false)err("SOURCE_METADATA_ONLY",403,{source:id,url:s.url});const body=await fetchPage(s.url);return{provider:"splus_china",operation,source:id,meta:s,text:body}}
 err("ADAPTER_OPERATION_NOT_APPROVED",403)
}
async function decision(operation){
 if(operation==="methods")return{provider:"splus_decision",operation,policy:"legal-business-strategy-decision-science-only",excluded:["fraud","coercion","unlawful-manipulation","market-manipulation","evasion","theft","sabotage","privacy-invasion"],items:METHODS};
 if(operation==="case_routes")return{provider:"splus_decision",operation,items:CASE_ROUTES};
 if(operation==="quant_routes")return{provider:"splus_decision",operation,routes:QUANT_ROUTES,note:"Research and validation library; not a guarantee of returns or a live trading executor."};
 if(operation==="business_toolkit")return{provider:"splus_decision",operation,items:["customer-segmentation","unit-economics","pricing-analysis","market-sizing","competitive-landscape","value-chain","channel-economics","site-selection","inventory-optimization","cash-flow-scenarios","break-even-analysis","experiment-design","negotiation-BATNA-ZOPA","pre-mortem","scenario-planning","causal-inference","robust-optimization"]};
 err("ADAPTER_OPERATION_NOT_APPROVED",403)
}
export const OPERATIONS={splus_china:["source_catalog","official_page"],splus_decision:["methods","case_routes","quant_routes","business_toolkit"]};
export async function runAdapter(provider,operation,args={}){if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403);if(provider==="splus_china")return china(operation,args);if(provider==="splus_decision")return decision(operation,args);err("ADAPTER_NOT_IMPLEMENTED",501)}