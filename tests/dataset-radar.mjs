import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {radarMeta,scoreCandidate,mergeCandidates,__test} from "../src/dataset-radar.js";

const meta=radarMeta({KAGGLE_API_TOKEN:"x"});
assert.equal(meta.raw_dataset_mirror,false);assert.equal(meta.raw_notebook_copy,false);assert.equal(meta.arbitrary_url,false);assert.equal(meta.max_candidates,100);assert.ok(meta.sources.length>=11);
assert.equal(meta.sources.find(x=>x.id==="kaggle_datasets")?.configured,true);assert.equal(meta.sources.find(x=>x.id==="kaggle_notebooks")?.configured,true);assert.equal(meta.sources.find(x=>x.id==="modelscope")?.configured,false);assert.equal(meta.sources.find(x=>x.id==="modelscope")?.required_secret,"MODELSCOPE_API_TOKEN");
assert.equal(__test.chinaMatch("福建福州商业房地产人口数据"),true);assert.equal(__test.chinaMatch("generic unrelated benchmark"),false);
const cn={title:"中国福建零售消费与人口数据",description:"trade finance real estate",tags:["China","business"],query:"China",china_match:true,updated_at:new Date().toISOString(),popularity:1000,license:"CC-BY-4.0",type:"dataset",source:"kaggle"};
const generic={...cn,title:"generic sample",description:"sample",tags:[],query:"sample",china_match:false,popularity:0,license:"unknown"};
assert.ok(scoreCandidate(cn)>scoreCandidate(generic));assert.equal(scoreCandidate({...cn,title:"credential leak password dump"}),-100);
const merged=mergeCandidates([],[{source:"kaggle",type:"dataset",id:"a/b",title:"x",score:70,updated_at:"2026-08-10"},{source:"kaggle",type:"dataset",id:"a/b",title:"x2",score:80,updated_at:"2026-08-11"},{source:"x",type:"dataset",id:"bad",title:"bad",score:-100}]);
assert.equal(merged.length,1);assert.equal(merged[0].score,80);assert.ok(String(__test.queryFor(Date.UTC(2026,7,15),0)).length>0);
const registry=JSON.parse(readFileSync(new URL("../data-assets/dataset-radar-sources.json",import.meta.url),"utf8"));
assert.equal(registry.policy.metadata_only_recurring,true);assert.equal(registry.policy.raw_dataset_mirror,false);assert.equal(registry.policy.raw_notebook_copy,false);assert.equal(registry.policy.auto_execute_notebook,false);assert.equal(registry.policy.task_bound_download_only,true);assert.equal(registry.policy.fixed_domain_portal_rotation,true);assert.ok(registry.sources.length>=65,`expected >=65 dataset sources, got ${registry.sources.length}`);
const ids=registry.sources.map(x=>x.id);assert.equal(new Set(ids).size,ids.length,"duplicate dataset-radar source id");
for(const id of [
  "kaggle_datasets","kaggle_notebooks","kaggle_competitions","huggingface","modelscope","opendatalab","tianchi_portal","datafountain_portal","heywhale_dataset_portal","heywhale_project_portal","baidu_ai_studio",
  "sciencedb_portal","tpdc_portal","geodata_portal","ngdc_portal","cma_data_portal","ncmiphda","china_nmdc","china_nssdc","china_nadc","china_earth_observation_center","china_polar_center","china_ecology_center","china_cryosphere_desert_center",
  "openml","uci","zenodo","figshare","dataverse","dryad","datacite","hdx","openneuro","physionet","icpsr","openicpsr","uk_data_service","gesis","mendeley_data","ogb","tensorflow_datasets","roboflow_universe","open_images","mozilla_common_voice","worldbank_microdata","ipums","dhs_program","openaire_data","cern_open_data","earth_engine_catalog","planetary_computer","radiant_ml_hub","gbif_datasets",
  "common_crawl","aws_open_data","bigquery_public","nasa_earthdata","copernicus","esgf","worldpop","ghsl","overture","openstreetmap"
])assert.ok(registry.sources.some(x=>x.id===id),id);
const src=readFileSync(new URL("../src/dataset-radar.js",import.meta.url),"utf8");
for(const bad of ["eval(","new Function(","child_process","subprocess","pip install","args.url","raw_dataset_mirror:true","raw_notebook_copy:true"])assert.equal(src.includes(bad),false,bad);
for(const fixed of ["www.kaggle.com/api/v1/datasets/list","www.kaggle.com/api/v1/kernels/list","huggingface.co/api/datasets","modelscope.cn/openapi/v1/datasets","zenodo.org/api/records","api.figshare.com/v2/articles/search","dataverse.harvard.edu/api/search","datadryad.org/api/v2/search","api.datacite.org/dois","data.humdata.org/api/3/action/package_search","www.openml.org/api/v1/json/data/list"])assert.ok(src.includes(fixed),fixed);
console.log(JSON.stringify({ok:true,suite:"dataset-radar",active_collectors:meta.sources.length,registry_sources:registry.sources.length,metadata_only:true,raw_mirror:false,china_priority:true,arbitrary_url:false}));
