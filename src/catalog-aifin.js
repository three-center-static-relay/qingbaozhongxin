import {AKSHARE_CATALOG} from "./catalog-akshare.js";
import {WEB_SEARCH_CATALOG} from "./catalog-web-search.js";
import {LITERATURE_LIVE_CATALOG} from "./catalog-literature-live.js";
import {KNOWLEDGE_ARCHIVES_CATALOG} from "./catalog-knowledge-archives.js";
import {GLOBAL_INSTITUTION_CATALOG} from "./catalog-global-institutions.js";
import {RUNTIME_CATALOG_OVERRIDES} from "./catalog-runtime-overrides.js";
export const AIFIN_CATALOG={
  aifin_market:{
    category:"finance-cn-ai-agent-mcp",
    access:"key",
    secrets:["WIND_API_KEY"],
    adapter:"aifin_market.live-mcp",
    integration:"official-aifin-market-streamable-http-mcp+skills",
    scope:"A-share-HK-US-equities-funds-bonds-indices-macro-financials-announcements-news-research-analysis-risk-decision",
    endpoint:"https://mcp.wind.com.cn/",
    server_types:["stock_data","fund_data","index_data","bond_data","financial_docs","economic_data","analytics_data"],
    official_tool_count:34,
    registration_url:"https://aifinmarket.wind.com.cn/#/user/overview",
    install_manifest:"https://aifinmarket.wind.com.cn/skill.md",
    official_source_repo:"Wind-Information-Co-Ltd/wind-skills",
    auth:"Bearer WIND_API_KEY",
    account_note:"AIFin Market is independent from a Wind terminal account; use the current AIFin Market account entitlement/points.",
    execution_policy:"Direct calls use only seven fixed official Wind MCP endpoints and the official 34-tool allowlist. No remote skill installation, no child process, no arbitrary URL, no automatic tools/call retry.",
    arbitrary_url:false
  },
  yuandian:{
    category:"legal-cn",
    access:"key",
    secret_groups:[["YD_API_KEY"],["YUANDIAN_API_KEY"]],
    adapter:"yuandian.mcp-streamable-http",
    integration:"official-streamable-http-mcp",
    scope:"law-case-enterprise-read-only-fixed-official-mcp-servers",
    endpoints:{
      law:"https://open.chineselaw.com/mcp/law/stream",
      case:"https://open.chineselaw.com/mcp/case/stream",
      company:"https://open.chineselaw.com/mcp/company/stream"
    },
    auth:"Bearer YD_API_KEY",
    arbitrary_url:false
  },
  ...AKSHARE_CATALOG,
  ...WEB_SEARCH_CATALOG,
  ...LITERATURE_LIVE_CATALOG,
  ...KNOWLEDGE_ARCHIVES_CATALOG,
  ...GLOBAL_INSTITUTION_CATALOG,
  ...RUNTIME_CATALOG_OVERRIDES
};