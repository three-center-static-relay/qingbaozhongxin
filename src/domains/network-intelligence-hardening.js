export const NETWORK_INTELLIGENCE_HARDENING_VERSION="network-intelligence-hardening-v2-20260817";

export const NETWORK_INTELLIGENCE_HARDENING=Object.freeze({
  version:NETWORK_INTELLIGENCE_HARDENING_VERSION,
  purpose:"Discover, preserve and structure high-value public information with explicit provenance; keep inference downstream in compute.",
  acquisition_pipeline:[
    "search-discovery","official-source-resolution","static-public-page-collection","dynamic-public-page-rendering-when-required","historical-snapshot-discovery","document-and-table-parsing","content-hash-and-provenance","entity-event-relationship-extraction","commercial-spatial-evidence-bundle","compute-handoff"
  ],
  existing_runtime_tools:{
    exa:{role:"semantic-web-discovery",status:"existing",bounded:true},
    tavily:{role:"web-discovery-and-cross-check",status:"existing",bounded:true},
    serpapi:{role:"search-engine-cross-check",status:"existing",bounded:true},
    baidu_ai_search:{role:"china-web-discovery",status:"existing-catalog",bounded:true},
    gdelt:{role:"global-news-event-discovery",status:"existing-live-adapter",bounded:true},
    jina_reader:{role:"public-page-reader",status:"existing",bounded:true},
    firecrawl:{role:"bounded-web-search",status:"existing",bounded:true},
    llamaparse:{role:"complex-pdf-spreadsheet-image-document-parsing",status:"existing-production",bounded:true}
  },
  added_tools:{
    common_crawl:{role:"historical-public-web-snapshot-index",execution:"cloudflare-worker-bounded-index-only",access:"public",raw_warc_proxy:false,arbitrary_target_fetch:false},
    scrapy:{role:"fixed-source-static-crawler",execution:"external-runtime",license:"BSD-3-Clause",production_status:"accepted-runtime-tool",notes:"Use only allowlisted public sources with bounded depth/rate/cache."},
    playwright:{role:"javascript-rendered-public-page-collector",execution:"external-runtime",license:"Apache-2.0",production_status:"accepted-runtime-tool",notes:"Rendering only; no login/CAPTCHA/access-control bypass."},
    warcio:{role:"WARC-evidence-read-write",execution:"external-runtime",license:"Apache-2.0",production_status:"accepted-runtime-tool",notes:"Preserve public evidence snapshots and replay metadata."},
    selectolax:{role:"fast-html-css-parser",execution:"external-runtime",license:"MIT-wrapper; use Lexbor backend",production_status:"accepted-runtime-tool",notes:"Prefer Lexbor backend for bounded static HTML extraction."}
  },
  commercial_spatial_handoff:{
    contract_version:"commercial-spatial-evidence-v1-20260817",
    cross_branch_share:true,
    cross_center_share:true,
    intelligence_role:"collect-resolve-normalize-and-sign-public-evidence",
    compute_role:"consume-evidence-bundle-and-return-derived-inferred-or-hypothesis-records",
    share:["normalized-features","public-aggregate-observations","source-receipts","content-hashes","entity-ids","spatial-units","temporal-scope","uncertainty"],
    priority_metrics:["population","poi","brand","building","accessibility","traffic","transit","parking","visitor_activity","land_transaction","project_pipeline","enterprise_activity","web_attention","event_activity","footfall","dwell","origin_destination","trade_area","competitor_overlap","aggregate_profile","market_potential","site_score","white_space"],
    raw_person_or_device_trajectories:false,
    personal_identifiers:false,
    inferred_promoted_to_observed:false
  },
  government_public_data_policy:{
    mainland_china_public_collection_priority:true,authenticated_api_or_mcp_only_when_materially_needed:true,identity_disclosure_minimization:true,anonymity_claim:false,requests_may_be_logged:true,fixed_official_sources_preferred:true,cache_first:true,incremental:true,low_frequency:true
  },
  hard_denies:["login-bypass","captcha-bypass","paywall-bypass","access-control-bypass","rate-limit-bypass","fingerprint-spoofing-for-evasion","proxy-rotation-for-evasion","credential-cycling","anti-bot-evasion","stealth-or-untraceability-claims","personal-device-trajectory-collection"],
  evidence_contract:{
    required:["source_url","publisher","fetched_at","content_hash","collector_or_parser_version","evidence_kind"],recommended:["published_at","retrieved_via","license_or_terms","entity_ids","geography","temporal_scope"],inference_labels:["observed","derived","inferred","hypothesis"],rule:"Intelligence preserves observations and provenance. Compute may infer hidden variables, but inferred or hypothetical outputs must never be promoted to observed facts."
  }
});
export function networkIntelligenceHardeningManifest(){return NETWORK_INTELLIGENCE_HARDENING;}
