import {CATALOG as BASE_CATALOG,EXCLUDED_PROVIDERS as BASE_EXCLUDED} from "./catalog-base.js";
export const CATALOG_VERSION="2026-08-15.9";
export const EXCLUDED_PROVIDERS=BASE_EXCLUDED;
export const CATALOG={
  ...BASE_CATALOG,
  gdelt:{...BASE_CATALOG.gdelt,adapter:"gdelt.articles"},
  bigquery:{category:"google-public-data",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"bigquery.public-query+tables",integration:"official-rest",scope:"bigquery-public-data-only"},
  earthengine:{category:"google-public-geospatial",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"earthengine.public-assets",integration:"official-rest",scope:"earthengine-public-assets-only"},
  youtube:{category:"google-public-media",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"youtube.data-v3",integration:"official-rest"},
  google_books:{category:"google-public-books",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"google_books.v1",integration:"official-rest"},
  google_factcheck:{category:"google-public-verification",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"google_factcheck.claim-search",integration:"official-rest"},
  google_civic:{category:"google-public-civic",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"google_civic.v2",integration:"official-rest",scope:"us-civic-data"},
  google_trends_alpha:{category:"google-public-trends",access:"key",secrets:["GOOGLE_TRENDS_API_KEY"],adapter:"catalog-only",integration:"official-alpha",permission:"limited-alpha-access-required"},
  amap:{category:"maps-cn",access:"key",secrets:["AMAP_API_KEY"],adapter:"amap.multi"},
  baidu_maps:{category:"maps-cn",access:"key",secret_groups:[["BAIDU_MAP_AK"],["BAIDU_MAP_API_KEY"]],adapter:"baidu_maps.geocode+reverse"},
  tencent_maps:{category:"maps-cn-mcp",access:"key",secret_groups:[["TENCENT_LBS_API_KEY"],["TENCENT_MAP_API_KEY"]],adapter:"tencent_maps.multi",integration:"official-mcp+webservice"},
  tianditu:{category:"maps-cn-official",access:"key",secret_groups:[["TIANDITU_TK"],["TIANDITU_API_KEY"]],adapter:"tianditu.search"},
  aifin_market:{category:"finance-cn-mcp",access:"key",secrets:["WIND_API_KEY"],adapter:"catalog-only",integration:"official-skill-mcp"}
};
function anyGroup(env,groups){return groups?.some(g=>g.every(k=>Boolean(env[k])))}
export function statusFor(env,name){
  const p=CATALOG[name];if(!p)return null;
  let configured=false;
  if(["public","external-runtime","external-mcp","external-source"].includes(p.access))configured=true;
  else if(p.secret_groups)configured=anyGroup(env,p.secret_groups);
  else if(p.access==="optional-key")configured=true;
  else configured=(p.secrets||[]).every(k=>Boolean(env[k]));
  return{configured,category:p.category,access:p.access,adapter:p.adapter,live_adapter:p.adapter!=="catalog-only"};
}
export function allStatuses(env){return Object.fromEntries(Object.keys(CATALOG).map(k=>[k,statusFor(env,k)]))}
