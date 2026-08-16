export const PROFESSIONAL_WEB_INTELLIGENCE_VERSION="professional-web-intelligence-v1-20260816";

export const PROFESSIONAL_WEB_INTELLIGENCE=Object.freeze({
  id:"professional-web-intelligence",
  label_zh:"专业网络信息收集",
  version:PROFESSIONAL_WEB_INTELLIGENCE_VERSION,
  type:"intelligence-subdomain",
  purpose:"General professional-grade public web information discovery, retrieval, corroboration and page reading for all Intelligence Center domains.",
  replaces_center:false,
  production_role:"shared-acquisition-branch",
  providers:[
    {id:"exa",operations:["search"],role:"semantic-and-deep-web-discovery"},
    {id:"tavily",operations:["search"],role:"current-web-news-finance-and-general-search"},
    {id:"firecrawl",operations:["search"],role:"web-discovery-and-search-result-corroboration"},
    {id:"jina",operations:["read"],role:"public-page-reading-clean-content-extraction-and-grounding"}
  ],
  collection_policy:{
    multi_provider:true,
    sequential_by_default:true,
    query_rewrite_and_multi_round_allowed:true,
    cross_source_corroboration:true,
    source_url_required:true,
    provider_and_query_provenance_required:true,
    fetched_at_required:true,
    bounded_results:true,
    bounded_response_size:true,
    arbitrary_code:false,
    write_actions:false,
    browser_interaction:false,
    private_network_access:false,
    secrets_never_returned:true
  },
  workflow:[
    "discover-with-exa-tavily-firecrawl",
    "deduplicate-and-rank-candidate-urls",
    "read-important-public-pages-with-jina",
    "cross-check-conflicts-with-an-independent-provider",
    "return-provenance-bearing-evidence-to-requesting-domain"
  ],
  usage_scope:[
    "tool-and-api-discovery","current-public-web-research","company-and-industry-research","policy-and-regulatory-research",
    "commercial-and-geospatial-research","academic-and-technical-discovery","source-verification","multi-hop-information-gathering"
  ],
  boundary_rules:[
    "search-results-are-evidence-candidates-not-ground-truth",
    "important-claims-require-source-level-reading-or-primary-source-verification-when-available",
    "this-branch-does-not-replace-domain-specific-structured-APIs-or-databases",
    "this-branch-does-not-turn-discovery-tools-into-domain-feature-sources",
    "no-automatic-installation-or-write-back-from-search-results"
  ]
});

export function professionalWebIntelligenceManifest(){return PROFESSIONAL_WEB_INTELLIGENCE;}
