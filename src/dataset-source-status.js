import {CATALOG,statusFor} from "./catalog.js";
import {OPERATIONS} from "./adapters.js";
import {radarMeta} from "./dataset-radar.js";
import {portalRadarMeta} from "./dataset-radar-portals.js";

export const DATASET_SOURCE_GROUPS=Object.freeze({
  "active-daily-api":["kaggle_datasets","kaggle_notebooks","huggingface","openml","zenodo","figshare","dataverse","dryad","datacite","hdx"],
  "active-when-key-configured":["modelscope"],
  "fixed-domain-rotation":["opendatalab","tianchi_portal","datafountain_portal","heywhale_dataset_portal","heywhale_project_portal","sciencedb_portal","tpdc_portal","geodata_portal","ngdc_portal","cma_data_portal","uci","dataone","pangaea","openneuro","physionet"],
  "catalog-task-retrieval":["kaggle_competitions","baidu_ai_studio","osf","icpsr","openicpsr","uk_data_service","gesis","mendeley_data","ogb","tensorflow_datasets","roboflow_universe","open_images","mozilla_common_voice","worldbank_microdata","openaire_data","cern_open_data","planetary_computer","radiant_ml_hub","gbif_datasets","common_crawl","esgf"],
  "registration-task-retrieval":["ipums","dhs_program"],
  "repository-discovery":["china_nmdc","china_nssdc","china_nadc","china_earth_observation_center","china_polar_center","china_ecology_center","china_cryosphere_desert_center","re3data"],
  "existing-live-provider":["earth_engine_catalog","bigquery_public","nasa_earthdata","copernicus","worldpop","ghsl"],
  "existing-source":["overture","openstreetmap"],
  "official-catalog":["data_gov","data_europa","noaa"],
  "large-catalog":["aws_open_data"],
  "secondary-discovery":["google_dataset_search"],
  "catalog-discovery":["socrata_network","opendatasoft_network"],
  "keyed-catalog-future":["ncmiphda"]
});

const PROVIDER_ALIASES=Object.freeze({
  kaggle_datasets:["kaggle"],
  huggingface:["huggingface"],
  zenodo:["zenodo"],
  figshare:["figshare"],
  dataverse:["harvard_dataverse"],
  dryad:["dryad"],
  datacite:["datacite"],
  hdx:["hdx"],
  openml:["openml"],
  pangaea:["pangaea"],
  earth_engine_catalog:["earthengine"],
  bigquery_public:["bigquery"],
  nasa_earthdata:["nasa_cmr","nasa_stac"],
  copernicus:["copernicus_cds"],
  worldpop:["worldpop"],
  ghsl:["ghsl"]
});

const TASK_ONLY_MODES=new Set(["catalog-task-retrieval","registration-task-retrieval"]);
const DISCOVERY_MODES=new Set(["fixed-domain-rotation","repository-discovery","existing-source","official-catalog","large-catalog","secondary-discovery","catalog-discovery"]);

function directProvider(env,id){
  for(const provider of PROVIDER_ALIASES[id]||[]){
    if(!CATALOG[provider]||!Array.isArray(OPERATIONS[provider])||OPERATIONS[provider].length===0)continue;
    const state=statusFor(env,provider);
    return{provider,configured:Boolean(state?.configured),operations:OPERATIONS[provider]};
  }
  return null;
}

function rows(){
  const out=[];
  for(const[mode,ids]of Object.entries(DATASET_SOURCE_GROUPS))for(const id of ids)out.push({id,mode});
  return out;
}

export function datasetSourceStatus(env={}){
  const radar=radarMeta(env),active=new Map((radar.sources||[]).map(x=>[x.id,x]));
  const portal=portalRadarMeta(),portalIds=new Set((portal.portals||[]).map(x=>x.id));
  const sources=rows().map(({id,mode})=>{
    const provider=directProvider(env,id),collector=active.get(id)||null,isPortal=portalIds.has(id);
    let status="NOT_CONNECTED",surface="none",reason="no approved live or discovery surface";
    if(provider?.configured){status="LIVE";surface="provider";reason="approved provider operation is configured"}
    else if(collector){status=collector.configured?"LIVE":"NOT_CONNECTED";surface="dataset-radar";reason=collector.configured?"active API collector configured":"active API collector requires configuration"}
    else if(mode==="existing-live-provider"){
      status="NOT_CONNECTED";surface=provider?"provider":"none";reason=provider?"provider exists but runtime configuration is incomplete":"registry says existing live provider but no approved provider alias was found";
    }else if(TASK_ONLY_MODES.has(mode)){
      status="TASK_ONLY";surface="task-retrieval";reason="retrieval is intentionally task-bound";
    }else if(DISCOVERY_MODES.has(mode)||isPortal){
      status="DISCOVERY";surface=isPortal?"fixed-domain-portal":"registry";reason=isPortal?"metadata discovery is live; direct dataset execution is not approved":"metadata/catalog discovery only";
    }else if(mode==="keyed-catalog-future"){
      status="NOT_CONNECTED";surface="registry";reason="credentialed future integration is not configured";
    }
    return{id,mode,status,surface,configured:status==="LIVE",provider:provider?.provider||null,operations:provider?.configured?provider.operations:[],required_secret:collector?.configured?null:(collector?.required_secret||null)};
  });
  const counts={LIVE:0,DISCOVERY:0,TASK_ONLY:0,NOT_CONNECTED:0};for(const x of sources)counts[x.status]++;
  return{schema_version:"dataset-source-status-v1",total:sources.length,counts,sources,secrets_redacted:true,raw_dataset_mirror:false,raw_notebook_copy:false};
}

export const __test={rows,directProvider};
