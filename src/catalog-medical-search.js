export const MEDICAL_SEARCH_CATALOG={
  medical_top_tier_search:{
    category:"medical-top-tier-direct-evidence-search",
    access:"key",
    secrets:["EXA_API_KEY","TAVILY_API_KEY"],
    adapter:"medical_top_tier_search.exa+tavily",
    integration:"official-Exa-and-Tavily-search-APIs-restricted-to-top-tier-medical-domains",
    scope:"direct diagnosis, differential, treatment, medication, nursing and evidence retrieval from authoritative medical and specialty domains",
    execution_policy:"single direct dual-engine retrieval; no model-generated search answer; official-domain restricted; partial engine success permitted",
    arbitrary_url:false,
    write:false
  }
};
