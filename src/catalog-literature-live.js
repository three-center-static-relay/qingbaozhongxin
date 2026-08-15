export const LITERATURE_LIVE_CATALOG={
  base:{
    category:"literature-oa-aggregator",
    access:"key",
    secrets:["BASE_API_KEY"],
    adapter:"base.search",
    integration:"BASE-HTTP-Search-API+OAI-PMH",
    scope:"bounded-academic-metadata-search-across-BASE-repositories",
    endpoint:"https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi",
    metadata_endpoint:"https://oai.base-search.net/oai",
    auth:"query parameter apikey=BASE_API_KEY",
    max_hits_per_call:20,
    upstream_documented_max_hits:120,
    upstream_offset_max:999,
    rate_policy:"single request only; no automatic retry; caller must respect BASE access terms and upstream rate limits",
    arbitrary_url:false,
    note:"Search API is used for interactive retrieval; OAI-PMH remains a separate metadata-harvesting interface and may require IP authorization."
  }
};
