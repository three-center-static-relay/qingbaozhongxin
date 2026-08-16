export const RUNTIME_CATALOG_OVERRIDES={
  google_patents_public:{
    category:"google-public-patents",
    access:"public",
    adapter:"google_patents.bounded-public-search",
    integration:"official-google-patents-public-search",
    scope:"bounded-public-search-no-bigquery-scan",
    endpoint:"https://patents.google.com/xhr/query",
    billing:"bigquery-bytes-billed-zero",
    arbitrary_url:false,
    write:false
  }
};
