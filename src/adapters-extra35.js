const MAX_BYTES=1800000,TIMEOUT_MS=18000;
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function req(v,name,n=300){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function tok(v,name,re=/^[A-Za-z0-9_.:@,+-]+$/,n=180){const s=req(v,name,n);if(!re.test(s))err(`INVALID_${name.toUpperCase()}`);return s}
async function readBounded(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502)}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function request(url,init={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/json",...(init.headers||{})}}),raw=await readBounded(r);let body=null;try{body=raw?JSON.parse(raw):null}catch{body=raw}if(!r.ok)err(r.status===404?"UPSTREAM_NOT_FOUND":r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":"UPSTREAM_HTTP_ERROR",r.status===404?404:r.status===401||r.status===403?503:502,{http_status:r.status,message:text(typeof body==="string"?body:body?.message||body?.error||raw,400)});return body}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}

const PUBCHEM="https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUBCHEM_PROPERTIES=new Set(["MolecularFormula","MolecularWeight","CanonicalSMILES","IsomericSMILES","InChI","InChIKey","IUPACName","XLogP","TPSA","HeavyAtomCount","HydrogenBondDonorCount","HydrogenBondAcceptorCount","RotatableBondCount","ExactMass","MonoisotopicMass","Charge","Complexity"]);
function pubchemProps(v){const a=(Array.isArray(v)?v:String(v||"MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,IUPACName").split(",")).map(x=>String(x).trim()).filter(Boolean).slice(0,12);if(!a.length||a.some(x=>!PUBCHEM_PROPERTIES.has(x)))err("INVALID_PUBCHEM_PROPERTY",400,{allowed:[...PUBCHEM_PROPERTIES]});return a.join(",")}
function cid(v){const s=tok(v,"cid",/^\d{1,12}$/,12);if(Number(s)<1)err("INVALID_CID");return s}
async function pubchem(operation,args){let url="";
 if(operation==="compound_properties_cid")url=`${PUBCHEM}/compound/cid/${cid(args?.cid)}/property/${pubchemProps(args?.properties)}/JSON`;
 else if(operation==="compound_properties_name"){const name=req(args?.name,"name",180);url=`${PUBCHEM}/compound/name/${encodeURIComponent(name)}/property/${pubchemProps(args?.properties)}/JSON`}
 else if(operation==="compound_synonyms")url=`${PUBCHEM}/compound/cid/${cid(args?.cid)}/synonyms/JSON`;
 else if(operation==="gene_summary"){const gene=tok(args?.gene_id,"gene_id",/^\d{1,12}$/,12);url=`${PUBCHEM}/gene/geneid/${gene}/summary/JSON`}
 else err("ADAPTER_OPERATION_NOT_APPROVED",403);
 const body=await request(url);const items=body?.PropertyTable?.Properties||body?.InformationList?.Information||body?.GeneSummaries?.GeneSummary||[];return{provider:"pubchem",operation,items:Array.isArray(items)?items:[items],data:items?.length===undefined?body:undefined}}

const CHEMBL="https://www.ebi.ac.uk/chembl/api/data";
function chemblId(v,name="chembl_id"){return tok(v,name,/^CHEMBL\d+$/i,30).toUpperCase()}
function chemblQuery(v){const s=req(v,"query",160);if(!/^[\p{L}\p{N}\s._+,'()\-/:]+$/u.test(s))err("INVALID_CHEMBL_QUERY");return s}
async function chembl(operation,args){let u=null,key=null;
 if(operation==="molecule"){u=new URL(`${CHEMBL}/molecule/${chemblId(args?.chembl_id)}.json`);key="molecule"}
 else if(operation==="molecule_search"){u=new URL(`${CHEMBL}/molecule/search.json`);u.searchParams.set("q",chemblQuery(args?.query));u.searchParams.set("limit",String(clamp(args?.limit,1,100,25)));key="molecules"}
 else if(operation==="target"){u=new URL(`${CHEMBL}/target/${chemblId(args?.chembl_id)}.json`);key="target"}
 else if(operation==="target_search"){u=new URL(`${CHEMBL}/target/search.json`);u.searchParams.set("q",chemblQuery(args?.query));u.searchParams.set("limit",String(clamp(args?.limit,1,100,25)));key="targets"}
 else if(operation==="activities"){u=new URL(`${CHEMBL}/activity.json`);const m=args?.molecule_chembl_id?chemblId(args.molecule_chembl_id,"molecule_chembl_id"):"",t=args?.target_chembl_id?chemblId(args.target_chembl_id,"target_chembl_id"):"";if(!m&&!t)err("ARG_REQUIRED:molecule_chembl_id_or_target_chembl_id");if(m)u.searchParams.set("molecule_chembl_id",m);if(t)u.searchParams.set("target_chembl_id",t);if(args?.standard_type)u.searchParams.set("standard_type",tok(args.standard_type,"standard_type",/^[A-Za-z0-9_ -]+$/,50));u.searchParams.set("limit",String(clamp(args?.limit,1,100,25)));key="activities"}
 else if(operation==="mechanisms"){u=new URL(`${CHEMBL}/mechanism.json`);u.searchParams.set("molecule_chembl_id",chemblId(args?.molecule_chembl_id,"molecule_chembl_id"));u.searchParams.set("limit",String(clamp(args?.limit,1,100,25)));key="mechanisms"}
 else if(operation==="status"){u=new URL(`${CHEMBL}/status.json`);key="status"}
 else err("ADAPTER_OPERATION_NOT_APPROVED",403);
 const body=await request(u);if(["molecule","target","status"].includes(operation))return{provider:"chembl",operation,data:body};return{provider:"chembl",operation,items:Array.isArray(body?.[key])?body[key]:[],page_meta:body?.page_meta||null}}

const ENSEMBL="https://rest.ensembl.org";
function species(v){return tok(v,"species",/^[A-Za-z][A-Za-z0-9_]{1,79}$/,80).toLowerCase()}
function ensemblId(v){return tok(v,"ensembl_id",/^ENS[A-Z0-9]*\d+(?:\.\d+)?$/i,60).toUpperCase()}
async function ensembl(operation,args){let u="";
 if(operation==="species")u=`${ENSEMBL}/info/species?content-type=application/json`;
 else if(operation==="lookup_id"){u=`${ENSEMBL}/lookup/id/${encodeURIComponent(ensemblId(args?.ensembl_id))}?expand=${args?.expand===true?1:0};content-type=application/json`}
 else if(operation==="symbol_xrefs"){const sp=species(args?.species),symbol=tok(args?.symbol,"symbol",/^[A-Za-z0-9_.-]+$/,80);u=`${ENSEMBL}/xrefs/symbol/${encodeURIComponent(sp)}/${encodeURIComponent(symbol)}?content-type=application/json`}
 else if(operation==="id_xrefs"){u=`${ENSEMBL}/xrefs/id/${encodeURIComponent(ensemblId(args?.ensembl_id))}?all_levels=${args?.all_levels===true?1:0};content-type=application/json`}
 else err("ADAPTER_OPERATION_NOT_APPROVED",403);
 const body=await request(u);return{provider:"ensembl",operation,items:Array.isArray(body)?body:undefined,data:Array.isArray(body)?undefined:body}}

const REACTOME="https://reactome.org/ContentService";
function reactomeId(v){return tok(v,"reactome_id",/^R-[A-Z]{3}-\d+(?:\.\d+)?$/i,40).toUpperCase()}
async function reactome(operation,args){if(operation==="version"){const body=await request(`${REACTOME}/data/database/version`,{headers:{accept:"text/plain"}});return{provider:"reactome",operation,version:String(body).trim().slice(0,40)}}const id=reactomeId(args?.reactome_id);if(operation==="query")return{provider:"reactome",operation,data:await request(`${REACTOME}/data/query/${encodeURIComponent(id)}`)};if(operation==="participants"){const body=await request(`${REACTOME}/data/event/${encodeURIComponent(id)}/participatingPhysicalEntities`);return{provider:"reactome",operation,items:Array.isArray(body)?body:[]}}err("ADAPTER_OPERATION_NOT_APPROVED",403)}

const RCSB="https://data.rcsb.org/rest/v1/core";
function pdbId(v){return tok(v,"pdb_id",/^[0-9][A-Za-z0-9]{3}$/,4).toUpperCase()}
async function rcsb(operation,args){const p=pdbId(args?.pdb_id);let u="";
 if(operation==="entry")u=`${RCSB}/entry/${p}`;
 else if(operation==="pubmed")u=`${RCSB}/pubmed/${p}`;
 else if(operation==="polymer_entity"){const e=tok(args?.entity_id,"entity_id",/^\d{1,4}$/,4);u=`${RCSB}/polymer_entity/${p}/${e}`}
 else if(operation==="chem_comp"){const c=tok(args?.comp_id,"comp_id",/^[A-Za-z0-9]{1,5}$/,5).toUpperCase();u=`${RCSB}/chemcomp/${c}`}
 else err("ADAPTER_OPERATION_NOT_APPROVED",403);return{provider:"rcsb_pdb",operation,data:await request(u)}}

const UNIPROT="https://rest.uniprot.org";
function accession(v){return tok(v,"accession",/^[A-Z0-9]{6,10}$/i,10).toUpperCase()}
async function uniprot(operation,args){if(operation==="entry"){const a=accession(args?.accession),u=new URL(`${UNIPROT}/uniprotkb/${a}`);u.searchParams.set("format","json");return{provider:"uniprot",operation,data:await request(u)}}if(operation==="gene_search"){const gene=tok(args?.gene,"gene",/^[A-Za-z0-9_.-]+$/,80),org=tok(args?.organism_id||"9606","organism_id",/^\d{1,10}$/,10),reviewed=args?.reviewed===false?"false":"true",u=new URL(`${UNIPROT}/uniprotkb/search`);u.searchParams.set("query",`(gene_exact:${gene}) AND (organism_id:${org}) AND (reviewed:${reviewed})`);u.searchParams.set("format","json");u.searchParams.set("size",String(clamp(args?.limit,1,50,20)));u.searchParams.set("fields","accession,id,protein_name,gene_names,organism_name,length,xref_pdb");const body=await request(u);return{provider:"uniprot",operation,items:Array.isArray(body?.results)?body.results:[]}}err("ADAPTER_OPERATION_NOT_APPROVED",403)}

const CATALOG=[
 {provider:"pubchem",role:"chemical-compounds-properties-synonyms-gene-links"},{provider:"chembl",role:"drug-discovery-molecules-targets-bioactivities-mechanisms"},{provider:"ensembl",role:"genes-transcripts-genome-identifiers-cross-references"},{provider:"reactome",role:"curated-biological-pathways-events-participants"},{provider:"rcsb_pdb",role:"experimental-macromolecular-structures-and-annotations"},{provider:"uniprot",role:"protein-sequence-function-gene-and-PDB-cross-references"}
];
export const OPERATIONS={pubchem:["compound_properties_cid","compound_properties_name","compound_synonyms","gene_summary"],chembl:["molecule","molecule_search","target","target_search","activities","mechanisms","status"],ensembl:["species","lookup_id","symbol_xrefs","id_xrefs"],reactome:["version","query","participants"],rcsb_pdb:["entry","pubmed","polymer_entity","chem_comp"],uniprot:["entry","gene_search"],splus_biomed_knowledge:["catalog"]};
export async function runAdapter(provider,operation,args={},env={}){if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});if(provider==="pubchem")return pubchem(operation,args);if(provider==="chembl")return chembl(operation,args);if(provider==="ensembl")return ensembl(operation,args);if(provider==="reactome")return reactome(operation,args);if(provider==="rcsb_pdb")return rcsb(operation,args);if(provider==="uniprot")return uniprot(operation,args);if(provider==="splus_biomed_knowledge")return{provider,operation,items:CATALOG};err("ADAPTER_NOT_IMPLEMENTED",501)}
