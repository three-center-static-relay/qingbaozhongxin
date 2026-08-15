const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=15000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const req=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
async function fetchJson(url,init={},timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/json",...(init.headers||{})}});
    const len=Number(r.headers.get("content-length")||0);if(Number.isFinite(len)&&len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});return {body,http_status:r.status};
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
const safePathPart=(v,n=200)=>encodeURIComponent(text(v,n));

export const OPERATIONS={
  dryad:["search"],
  art_institute_chicago:["search"],
  vam_collections:["search"],
  gbif_species:["search"],
  pubchem:["compound_by_name"],
  chembl:["search"],
  harvard_dataverse:["search"],
  rcsb_pdb:["search"]
};

export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=text(args?.query,300),limit=clamp(args?.limit,1,25,10);

  if(provider==="dryad"){
    if(!q)req(args,"query");const u=new URL("https://datadryad.org/api/v2/search");u.searchParams.set("q",q);u.searchParams.set("page","1");u.searchParams.set("per_page",String(limit));
    const r=await fetchJson(u);return {provider,operation,data:r.body};
  }
  if(provider==="art_institute_chicago"){
    if(!q)req(args,"query");const resource=["artworks","artists","places","publications","articles","digital-publications"].includes(String(args?.resource||"artworks"))?String(args?.resource||"artworks"):"artworks";
    const u=new URL(`https://api.artic.edu/api/v1/${resource}/search`);u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));u.searchParams.set("fields","id,title,api_model,api_link,artist_display,date_display,description");
    const r=await fetchJson(u);return {provider,operation,resource,total:r.body?.pagination?.total??null,items:r.body?.data||[]};
  }
  if(provider==="vam_collections"){
    if(!q)req(args,"query");const u=new URL("https://api.vam.ac.uk/v2/objects/search");u.searchParams.set("q",q);u.searchParams.set("page_size",String(limit));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.info?.record_count??null,items:r.body?.records||[]};
  }
  if(provider==="gbif_species"){
    if(!q)req(args,"query");const u=new URL("https://api.gbif.org/v1/species/search");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.count??null,items:r.body?.results||[]};
  }
  if(provider==="pubchem"){
    const name=text(args?.name||args?.query,200);if(!name)req(args,"name");const props="Title,MolecularFormula,MolecularWeight,InChIKey";
    const u=`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${safePathPart(name)}/property/${props}/JSON`;
    const r=await fetchJson(u);return {provider,operation,items:r.body?.PropertyTable?.Properties||[]};
  }
  if(provider==="chembl"){
    if(!q)req(args,"query");const resource=["molecule","target","document","assay","activity"].includes(String(args?.resource||"molecule"))?String(args?.resource||"molecule"):"molecule";
    const u=new URL(`https://www.ebi.ac.uk/chembl/api/data/${resource}/search.json`);u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));u.searchParams.set("offset","0");
    const r=await fetchJson(u);return {provider,operation,resource,data:r.body};
  }
  if(provider==="harvard_dataverse"){
    if(!q)req(args,"query");const type=["dataset","dataverse","file"].includes(String(args?.type||"dataset"))?String(args?.type||"dataset"):"dataset";
    const u=new URL("https://dataverse.harvard.edu/api/search");u.searchParams.set("q",q);u.searchParams.set("type",type);u.searchParams.set("per_page",String(limit));u.searchParams.set("start","0");
    const r=await fetchJson(u);return {provider,operation,type,total:r.body?.data?.total_count??null,items:r.body?.data?.items||[]};
  }
  if(provider==="rcsb_pdb"){
    if(!q)req(args,"query");const body={query:{type:"terminal",service:"full_text",parameters:{value:q}},return_type:"entry",request_options:{paginate:{start:0,rows:limit}}};
    const r=await fetchJson("https://search.rcsb.org/rcsbsearch/v2/query",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});return {provider,operation,total:r.body?.total_count??null,items:r.body?.result_set||[]};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
