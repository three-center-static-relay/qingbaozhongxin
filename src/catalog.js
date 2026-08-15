import {CATALOG as BASE_CATALOG,EXCLUDED_PROVIDERS as BASE_EXCLUDED} from "./catalog-base.js";
export const CATALOG_VERSION="2026-08-15.22";
export const EXCLUDED_PROVIDERS=BASE_EXCLUDED;
export const CATALOG={
  ...BASE_CATALOG,
  gdelt:{...BASE_CATALOG.gdelt,adapter:"gdelt.articles"},
  bigquery:{category:"google-public-data",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"bigquery.public-query+catalog",integration:"official-rest",scope:"approved-public-projects-only"},
  earthengine:{category:"google-public-geospatial",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"earthengine.public-assets",integration:"official-rest",scope:"earthengine-public-assets-only"},
  google_trends_public:{category:"google-first-party-search-trends",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"bigquery.google-trends",integration:"official-bigquery-public-dataset",scope:"top-and-rising-terms"},
  google_patents_public:{category:"google-public-patents",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"bigquery.google-patents",integration:"official-google-patents-public-dataset",scope:"read-only-bounded-query"},
  google_earth_observation:{category:"google-public-geospatial-curated",access:"key",secret_groups:[["GOOGLE_CLOUD_ACCESS_TOKEN"],["GOOGLE_CLOUD_CREDENTIALS"]],adapter:"earthengine.curated-high-value",integration:"official-earthengine-rest",scope:"public-assets-only"},
  youtube:{category:"google-public-media",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"youtube.data-v3",integration:"official-rest",scope:"public-read-only"},
  google_books:{category:"google-public-books",access:"optional-key",secrets:["GOOGLE_API_KEY"],adapter:"google_books.v1",integration:"official-rest",scope:"public-volumes-read-only"},
  google_factcheck:{category:"google-public-verification",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"google_factcheck.claim-search",integration:"official-rest"},
  google_civic:{category:"google-public-civic",access:"key",secret_groups:[["GOOGLE_CIVIC_API_KEY"],["GOOGLE_API_KEY"]],adapter:"google_civic.v2",integration:"official-rest",scope:"us-civic-data",auth_note:"prefer a Civic-only restricted key; shared GOOGLE_API_KEY remains supported"},
  google_knowledge_graph:{category:"google-public-knowledge",access:"key",secret_groups:[["GOOGLE_KNOWLEDGE_GRAPH_API_KEY"],["GOOGLE_API_KEY"]],adapter:"google_knowledge_graph.entity-search",integration:"official-rest",scope:"legacy-read-only-noncritical",auth_note:"prefer a Knowledge-Graph-only restricted key; shared GOOGLE_API_KEY remains supported"},
  google_crux:{category:"google-public-web-intel",access:"key",secrets:["GOOGLE_API_KEY"],adapter:"google_crux.record+history",integration:"official-rest",scope:"aggregated-user-experience"},
  google_pagespeed:{category:"google-public-web-intel",access:"optional-key",secrets:["GOOGLE_API_KEY"],optional_secrets:["GOOGLE_PAGESPEED_API_KEY"],adapter:"google_pagespeed.v5",integration:"official-rest",scope:"public-web-analysis",auth_note:"anonymous access supported; GOOGLE_PAGESPEED_API_KEY preferred when configured"},
  google_trends_alpha:{category:"google-public-trends",access:"key",secrets:["GOOGLE_TRENDS_API_KEY"],adapter:"catalog-only",integration:"official-alpha",permission:"limited-alpha-access-required"},
  amap:{category:"maps-cn",access:"key",secrets:["AMAP_API_KEY"],adapter:"amap.multi"},
  baidu_maps:{category:"maps-cn",access:"key",secret_groups:[["BAIDU_MAP_AK"],["BAIDU_MAP_API_KEY"]],adapter:"baidu_maps.geocode+reverse"},
  tencent_maps:{category:"maps-cn-mcp",access:"key",secret_groups:[["TENCENT_LBS_API_KEY"],["TENCENT_MAP_API_KEY"]],adapter:"tencent_maps.multi",integration:"official-mcp+webservice"},
  tianditu:{category:"maps-cn-official",access:"key",secret_groups:[["TIANDITU_TK"],["TIANDITU_API_KEY"]],adapter:"tianditu.search"},
  aifin_market:{category:"finance-cn-mcp",access:"key",secrets:["WIND_API_KEY"],adapter:"catalog-only",integration:"official-skill-mcp"},
  pkulaw:{category:"legal-cn",access:"key",secret_groups:[["PKULAW_MCP_TOKEN"],["PKULAW_API_TOKEN"],["BROWSERFABRIC_API_KEY"]],adapter:"pkulaw.official-cli-direct-jsonrpc",integration:"official-cli-direct-jsonrpc",scope:"10-fixed-official-mcp-services-tools-list-and-tool-call",endpoint:"https://apim-gateway.pkulaw.com/",auth_note:"preferred secret PKULAW_MCP_TOKEN; PKULAW_API_TOKEN supported; BROWSERFABRIC_API_KEY retained temporarily only as a legacy secret-name alias"},
  yuandian:{category:"legal-cn",access:"key",secret_groups:[["YD_API_KEY"],["YUANDIAN_API_KEY"]],adapter:"yuandian.official-api",integration:"official-rest+mcp",scope:"law-case-enterprise-read-only"},
  wikidata:{category:"global-knowledge-graph",access:"public",adapter:"wikidata.public-read",integration:"official-sparql+entitydata",scope:"anonymous-read-only"},
  copernicus_cds:{category:"climate-global-official",access:"key",secret_groups:[["COPERNICUS_CDS_API_KEY"],["CDS_API_KEY"]],adapter:"copernicus_cds.catalog+retrieve",integration:"official-rest",scope:"catalog-read+bounded-retrieval-job-control-no-binary-proxy",terms:"dataset-terms-must-be-accepted-manually-before-download"},
  qichacha:{category:"company-legal-tender-document-intelligence-cn",access:"key",secrets:["QICHACHA_API_KEY"],adapter:"qichacha.agent-mcp",integration:"official-streamable-http-mcp",scope:"10-fixed-official-servers-tools-list-and-tool-call",endpoint_base:"https://agent.qcc.com/mcp",server_count:10,history_permission:"enterprise-verification-required",other_servers_permission:"personal-account-supported",billing:"points-per-tool-with-daily-gift-points",local_document_mcp:false},

  crossref:{...BASE_CATALOG.crossref,integration:"official-rest",scope:"global-scholarly-metadata"},
  openalex:{...BASE_CATALOG.openalex,integration:"official-rest",registration_url:"https://openalex.org/settings/api",free_tier:"1-usd-daily-api-credit"},
  semantic_scholar:{...BASE_CATALOG.semantic_scholar,integration:"official-rest",registration_url:"https://www.semanticscholar.org/product/api#api-key-form"},
  unpaywall:{...BASE_CATALOG.unpaywall,integration:"official-rest",scope:"global-scholarly-metadata"},
  openaire:{...BASE_CATALOG.openaire,integration:"official-rest",scope:"europe-global-research-products"},
  base:{category:"literature-oa-aggregator",access:"public",adapter:"catalog-only",integration:"official-oai-pmh",scope:"repository-aggregator-metadata",endpoint:"https://oai.base-search.net/oai"},
  core:{category:"literature-oa-aggregator",access:"public",adapter:"catalog-only",integration:"official-rest",scope:"open-access-metadata-and-fulltext",registration_url:"https://core.ac.uk/services/api",note:"free-access-subject-to-current-terms-and-rate-limits"},
  doaj:{category:"literature-open-access",access:"public",adapter:"catalog-only",integration:"official-api+oai-pmh+data-dump",scope:"open-access-journals-and-articles",endpoint:"https://doaj.org/api"},
  europe_pmc:{category:"literature-biomedical",access:"public",adapter:"europe_pmc.search",integration:"official-rest",scope:"biomedical-literature-preprints-fulltext-links"},
  pubmed:{category:"literature-biomedical",access:"optional-key",secrets:["NCBI_API_KEY"],optional_secrets:["NCBI_EMAIL"],adapter:"pubmed.search",integration:"official-ncbi-eutils",scope:"pubmed-index",registration_url:"https://www.ncbi.nlm.nih.gov/account/settings/"},
  datacite:{category:"research-metadata",access:"public",adapter:"datacite.search",integration:"official-rest",scope:"doi-research-outputs"},
  zenodo:{category:"research-repository",access:"optional-key",secrets:["ZENODO_TOKEN"],adapter:"zenodo.search",integration:"official-rest",scope:"public-records"},
  figshare:{category:"research-repository",access:"public",adapter:"figshare.search",integration:"official-rest",scope:"public-articles-datasets"},
  arxiv:{category:"preprint-global",access:"public",adapter:"arxiv.search",integration:"official-atom-api",scope:"preprints"},
  biorxiv:{category:"preprint-biomedical",access:"public",adapter:"biorxiv.recent",integration:"official-rest",scope:"recent-preprints"},
  medrxiv:{category:"preprint-medical",access:"public",adapter:"medrxiv.recent",integration:"official-rest",scope:"recent-preprints"},
  dblp:{category:"literature-computer-science",access:"public",adapter:"dblp.search",integration:"official-search-api",scope:"computer-science-bibliography"},
  inspirehep:{category:"literature-physics",access:"public",adapter:"inspirehep.search",integration:"official-rest",scope:"high-energy-physics"},
  zbmath:{category:"literature-mathematics",access:"public",adapter:"catalog-only",integration:"official-rest+oai-pmh",scope:"mathematics-bibliography",terms:"api-terms-must-be-accepted"},
  nasa_ads:{category:"literature-astronomy-physics",access:"key",secrets:["NASA_ADS_TOKEN"],adapter:"catalog-only",integration:"official-rest",scope:"astronomy-astrophysics-physics",registration_url:"https://ui.adsabs.harvard.edu/user/settings/token"},
  gbif_literature:{category:"literature-biodiversity",access:"public",adapter:"gbif_literature.search",integration:"official-rest",scope:"biodiversity-literature"},
  bhl:{category:"library-biodiversity-heritage",access:"key",secrets:["BHL_API_KEY"],adapter:"bhl.search",integration:"official-rest",scope:"biodiversity-books-serials-fulltext",registration_url:"https://www.biodiversitylibrary.org/getapikey.aspx"},
  uniprot:{category:"knowledge-life-sciences",access:"public",adapter:"uniprot.search",integration:"official-rest",scope:"protein-sequence-function-knowledge"},
  opencitations:{category:"scholarly-citation-graph",access:"optional-key",secrets:["OPENCITATIONS_ACCESS_TOKEN"],adapter:"opencitations.doi",integration:"official-rest",scope:"bibliographic-and-citation-metadata",registration_url:"https://opencitations.net/accesstoken"},
  ror:{category:"research-organization-registry",access:"optional-key",secrets:["ROR_CLIENT_ID"],adapter:"ror.search",integration:"official-rest",scope:"research-organizations",registration_url:"https://ror.org/api-client-id",note:"client-id-registration-temporarily-paused-as-of-2026-08; anonymous-api-remains-free"},
  orcid:{category:"researcher-identity-knowledge",access:"optional-key",secret_groups:[["ORCID_CLIENT_ID","ORCID_CLIENT_SECRET"]],adapter:"catalog-only",integration:"official-public-api",scope:"public-researcher-registry",registration_url:"https://orcid.org/developer-tools",terms:"public-api-free-for-non-commercial-use"},
  osf:{category:"research-repository",access:"public",adapter:"catalog-only",integration:"official-rest",scope:"public-projects-registrations-preprints-files",endpoint:"https://api.osf.io/v2/"},
  hal:{category:"research-repository-france",access:"public",adapter:"hal.search",integration:"official-rest+oai-pmh",scope:"french-open-science-repository",terms:"oai-harvest-non-commercial"},
  oapen:{category:"open-access-books",access:"public",adapter:"oapen.search",integration:"official-rest+oai-pmh+feeds",scope:"open-access-scholarly-books"},
  doab:{category:"open-access-books-directory",access:"public",adapter:"doab.search",integration:"official-rest+metadata-feeds",scope:"open-access-book-metadata"},
  eric:{category:"literature-education",access:"public",adapter:"eric.search",integration:"official-eric-api",scope:"education-research"},
  scielo_network:{category:"literature-latin-america-global-south",access:"public",adapter:"catalog-only",integration:"official-oai+search",scope:"open-access-journals-preprints-data",endpoint:"https://search.scielo.org/"},
  scielo_books:{category:"open-access-books-latin-america",access:"public",adapter:"catalog-only",integration:"official-oai-pmh+opds",scope:"open-access-books-and-chapters",endpoint:"http://oai.books.scielo.org/oai-pmh"},

  library_of_congress:{category:"library-national-us",access:"public",adapter:"library_of_congress.search",integration:"official-json-api",scope:"books-manuscripts-maps-photos-audio-archives"},
  open_library:{category:"library-global-books",access:"public",adapter:"open_library.search",integration:"official-rest",scope:"book-bibliography"},
  dpla:{category:"digital-library-us",access:"key",secrets:["DPLA_API_KEY"],adapter:"dpla.search",integration:"official-rest",scope:"aggregated-library-archive-museum-content",registration_url:"https://api.dp.la/v2/api_key/YOUR_EMAIL@example.com",registration_method:"POST"},
  europeana:{category:"digital-library-europe",access:"key",secrets:["EUROPEANA_API_KEY"],adapter:"europeana.search",integration:"official-rest",scope:"aggregated-european-cultural-heritage",registration_url:"https://pro.europeana.eu/page/get-api"},
  smithsonian:{category:"museum-library-archive-us",access:"key",secret_groups:[["SMITHSONIAN_API_KEY"],["DATA_GOV_API_KEY"]],adapter:"smithsonian.search",integration:"official-open-access-api",scope:"museum-library-archive-collections",registration_url:"https://api.data.gov/signup/"},
  nara_catalog:{category:"archive-national-us",access:"key",secrets:["NARA_API_KEY"],adapter:"nara_catalog.search",integration:"official-rest",scope:"us-national-archives-catalog",registration_url:"https://www.archives.gov/research/catalog/lcdrg/api"},
  digitalnz:{category:"digital-library-new-zealand",access:"optional-key",secrets:["DIGITALNZ_API_KEY"],adapter:"digitalnz.search",integration:"official-rest",scope:"aggregated-nz-digital-heritage"},
  met_museum:{category:"museum-open-collection",access:"public",adapter:"met_museum.search",integration:"official-rest",scope:"metropolitan-museum-open-access"},
  ndl_search:{category:"library-national-japan",access:"public",adapter:"ndl_search.search",integration:"official-sru+opensearch+oai-pmh",scope:"japan-national-library-and-linked-libraries",terms:"non-profit-use-no-application;commercial-or-continuous-use-may-require-application",registration_url:"https://ndlsearch.ndl.go.jp/en/help/api"},
  gallica:{category:"library-national-france-digital",access:"public",adapter:"gallica.search",integration:"official-sru",scope:"bnf-gallica-digital-library"},
  bnf_data:{category:"library-national-france-knowledge-graph",access:"public",adapter:"catalog-only",integration:"official-sparql",scope:"authors-works-topics-places-archives-manuscripts",endpoint:"https://data.bnf.fr/sparql"},
  project_gutenberg:{category:"global-public-domain-ebooks",access:"public",adapter:"catalog-only",integration:"official-opds+machine-readable-catalog",scope:"public-domain-ebooks",endpoint:"https://www.gutenberg.org/ebooks/search.opds/",terms:"do-not-crawl-human-site-use-feeds-or-catalog"},
  govinfo:{category:"government-publications-us",access:"key",secret_groups:[["DATA_GOV_API_KEY"],["GOVINFO_API_KEY"]],adapter:"govinfo.search",integration:"official-rest+mcp-preview+bulk-data",scope:"official-publications-all-three-us-federal-branches",registration_url:"https://www.govinfo.gov/api-signup"},
  uk_national_archives:{category:"archive-national-uk",access:"external-source",adapter:"catalog-only",integration:"official-discovery-api",scope:"uk-national-and-aggregated-archive-descriptions",registration_url:"https://www.nationalarchives.gov.uk/terms-and-conditions/discovery-for-developers-about-the-application-programming-interface-api/",note:"free API access requires contacting webmaster@nationalarchives.gov.uk and providing source IP"},
  wikimedia_commons:{category:"global-media-knowledge",access:"public",adapter:"wikimedia_commons.search",integration:"official-mediawiki-api",scope:"open-media-and-metadata"},
  wikisource:{category:"global-digital-text-library",access:"public",adapter:"wikisource.search",integration:"official-mediawiki-api",scope:"public-domain-and-free-texts-multilingual"},
  internet_archive:{category:"global-digital-library-archive",access:"public",adapter:"catalog-only",integration:"official-metadata-and-advanced-search-apis",scope:"books-audio-video-software-web-collections"},
  software_heritage:{category:"global-software-archive",access:"public",adapter:"catalog-only",integration:"official-rest",scope:"source-code-archive"}
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
