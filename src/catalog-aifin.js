import {AKSHARE_CATALOG} from "./catalog-akshare.js";
import {POLICY_REGULATORY_CATALOG} from "./catalog-policy-regulatory.js";
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
  ...AKSHARE_CATALOG,
  ...POLICY_REGULATORY_CATALOG
};
