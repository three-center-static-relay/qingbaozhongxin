import {CATALOG as BASE_CATALOG,EXCLUDED_PROVIDERS as BASE_EXCLUDED} from "./catalog-base.js";
export const CATALOG_VERSION="2026-08-15.5";
export const EXCLUDED_PROVIDERS=BASE_EXCLUDED;
export const CATALOG={
  ...BASE_CATALOG,
  gdelt:{...BASE_CATALOG.gdelt,adapter:"gdelt.articles"},
  amap:{category:"maps-cn",access:"key",secrets:["AMAP_API_KEY"],adapter:"amap.multi"},
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
