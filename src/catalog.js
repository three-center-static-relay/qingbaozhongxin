export const CATALOG_VERSION="2026-08-15.2";
export const EXCLUDED_PROVIDERS=["datacommons","faostat","agt_stock","baichuan","taobao"];

export const CATALOG={
  exa:{category:"search",access:"key",secrets:["EXA_API_KEY"],adapter:"catalog-only"},
  tavily:{category:"search",access:"key",secrets:["TAVILY_API_KEY"],adapter:"tavily.search"},
  serpapi:{category:"search",access:"key",secrets:["SERPAPI_API_KEY"],adapter:"serpapi.search"},
  baidu_ai_search:{category:"search",access:"key",secrets:["BAIDU_API_KEY"],adapter:"catalog-only"},
  jina_reader:{category:"reader",access:"optional-key",secrets:["JINA_API_KEY"],adapter:"catalog-only"},
  firecrawl:{category:"reader",access:"key",secrets:["FIRECRAWL_API_KEY"],adapter:"catalog-only"},
  browserless:{category:"browser",access:"key",secrets:["BROWSERLESS_TOKEN"],adapter:"catalog-only"},
  bigquery:{category:"google-data",access:"key",secret_groups:[["GOOGLE_CLOUD_CREDENTIALS"],["GOOGLE_API_KEY"]],adapter:"catalog-only"},
  earthengine:{category:"google-data",access:"key",secrets:["GOOGLE_CLOUD_CREDENTIALS"],adapter:"catalog-only"},
  baostock:{category:"finance-cn",access:"external-runtime",adapter:"catalog-only"},
  tushare:{category:"finance-cn",access:"key",secrets:["TUSHARE_TOKEN"],adapter:"catalog-only"},
  akshare:{category:"finance-cn",access:"external-runtime",adapter:"catalog-only"},
  alpha_vantage:{category:"finance",access:"key",secrets:["ALPHAVANTAGE_API_KEY"],adapter:"alpha_vantage.daily"},
  eodhd:{category:"finance",access:"key",secrets:["EODHD_API_KEY"],adapter:"catalog-only"},
  alphafeed:{category:"finance",access:"key",secrets:["ALPHAFEED_API_KEY"],adapter:"catalog-only"},
  fred:{category:"macro",access:"key",secrets:["FRED_API_KEY"],adapter:"fred.series_observations"},
  worldbank:{category:"macro",access:"public",adapter:"worldbank.indicator"},
  imf:{category:"macro",access:"public",adapter:"catalog-only"},
  oecd:{category:"macro",access:"public",adapter:"catalog-only"},
  bis:{category:"macro",access:"public",adapter:"catalog-only"},
  wto:{category:"trade",access:"public",adapter:"catalog-only"},
  eia:{category:"energy",access:"key",secrets:["EIA_API_KEY"],adapter:"catalog-only"},
  adb:{category:"macro",access:"public",adapter:"catalog-only"},
  un_comtrade:{category:"trade",access:"optional-key",secrets:["UN_COMTRADE_API_KEY"],adapter:"catalog-only"},
  qweather:{category:"weather",access:"key",secret_groups:[["QWEATHER_JWT"],["QWEATHER_API_KEY"]],adapter:"catalog-only"},
  xweather:{category:"weather",access:"key",secrets:["XWEATHER_API_KEY"],adapter:"catalog-only"},
  open_meteo:{category:"weather",access:"public",adapter:"open_meteo.forecast"},
  overture_maps:{category:"geo",access:"external-runtime",adapter:"catalog-only"},
  opensky:{category:"aviation",access:"key",secret_groups:[["OPENSKY_CLIENT_ID","OPENSKY_CLIENT_SECRET"]],adapter:"catalog-only"},
  worldpop:{category:"population",access:"public",adapter:"catalog-only"},
  night_lights:{category:"remote-sensing",access:"external-runtime",adapter:"catalog-only"},
  who_gho:{category:"health",access:"public",adapter:"catalog-only"},
  clinicaltrials:{category:"health",access:"public",adapter:"clinicaltrials.studies"},
  biomcp:{category:"biomed-mcp",access:"external-mcp",adapter:"catalog-only"},
  huggingface:{category:"ai-catalog",access:"optional-key",secrets:["HUGGINGFACE_TOKEN"],adapter:"huggingface.models"},
  base:{category:"literature",access:"key",secrets:["BASE_API_KEY"],adapter:"catalog-only"},
  crossref:{category:"literature",access:"public",adapter:"crossref.works"},
  openalex:{category:"literature",access:"key",secrets:["OPENALEX_API_KEY"],adapter:"openalex.works"},
  semantic_scholar:{category:"literature",access:"optional-key",secrets:["SEMANTIC_SCHOLAR_API_KEY"],adapter:"semantic_scholar.paper_search"},
  unpaywall:{category:"literature",access:"config",secrets:["UNPAYWALL_EMAIL"],adapter:"unpaywall.doi"},
  openaire:{category:"literature",access:"public",adapter:"openaire.research_products"},
  worldbank_documents:{category:"documents",access:"public",adapter:"catalog-only"},
  east_asia_econ:{category:"regional-economy",access:"external-source",adapter:"catalog-only"},
  gapup_mcp:{category:"mcp",access:"external-mcp",adapter:"catalog-only"},
  newsapi:{category:"news",access:"key",secrets:["NEWSAPI_KEY"],adapter:"catalog-only"},
  gdelt:{category:"news",access:"public",adapter:"catalog-only"},
  wikipedia:{category:"knowledge",access:"public",adapter:"catalog-only"},
  wikidata:{category:"knowledge",access:"public",adapter:"catalog-only"},
  llamaparse:{category:"document-parser",access:"key",secrets:["LLAMA_CLOUD_API_KEY"],adapter:"catalog-only"},
  mcp_registry:{category:"registry",access:"public",adapter:"mcp_registry.search"},
  apis_guru:{category:"registry",access:"public",adapter:"apis_guru.providers"},
  pipedream:{category:"integration-registry",access:"key",secrets:["PIPEDREAM_API_KEY"],adapter:"catalog-only"},
  postman:{category:"api-registry",access:"key",secrets:["POSTMAN_API_KEY"],adapter:"catalog-only"},
  smithery:{category:"mcp-registry",access:"optional-key",secrets:["SMITHERY_API_KEY"],adapter:"catalog-only"},
  glama:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  pulsemcp:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  composio:{category:"integration-registry",access:"key",secrets:["COMPOSIO_API_KEY"],adapter:"catalog-only"},
  zapier:{category:"integration-registry",access:"key",secrets:["ZAPIER_API_KEY"],adapter:"catalog-only"},
  mcp_so:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  rapidapi:{category:"api-market",access:"key",secrets:["RAPIDAPI_KEY"],adapter:"catalog-only"},
  docker_mcp:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  google_mcp_registry:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  azure_mcp_registry:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  modelscope_registry:{category:"cn-ai-registry",access:"public",adapter:"catalog-only"},
  tencent_cloud_registry:{category:"cn-cloud-registry",access:"public",adapter:"catalog-only"},
  volcano_registry:{category:"cn-cloud-registry",access:"public",adapter:"catalog-only"},
  alibaba_bailian_registry:{category:"cn-cloud-registry",access:"public",adapter:"catalog-only"},
  baidu_qianfan_registry:{category:"cn-cloud-registry",access:"public",adapter:"catalog-only"},
  huawei_registry:{category:"cn-cloud-registry",access:"public",adapter:"catalog-only"},
  dify_registry:{category:"agent-registry",access:"public",adapter:"catalog-only"},
  nacos_registry:{category:"mcp-registry",access:"public",adapter:"catalog-only"},
  anthropic_mcp_examples:{category:"mcp-reference",access:"public",adapter:"catalog-only"}
};

function anyGroup(env,groups){return groups?.some(g=>g.every(k=>Boolean(env[k])))}
export function statusFor(env,name){
  const p=CATALOG[name]; if(!p)return null;
  let configured=false;
  if(["public","external-runtime","external-mcp","external-source"].includes(p.access)) configured=true;
  else if(p.secret_groups) configured=anyGroup(env,p.secret_groups);
  else if(p.access==="optional-key") configured=true;
  else configured=(p.secrets||[]).every(k=>Boolean(env[k]));
  return {configured,category:p.category,access:p.access,adapter:p.adapter,live_adapter:p.adapter!=="catalog-only"};
}
export function allStatuses(env){return Object.fromEntries(Object.keys(CATALOG).map(k=>[k,statusFor(env,k)]))}
