export const AIFIN_CATALOG={
  aifin_market:{
    category:"finance-cn-ai-agent-mcp",
    access:"key",
    secrets:["WIND_API_KEY"],
    adapter:"catalog-only",
    integration:"official-aifin-market-mcp+skills",
    scope:"A-share-HK-US-equities-funds-bonds-indices-macro-financials-announcements-research-analysis-risk-decision",
    endpoint:"https://aifinmarket.wind.com.cn/",
    registration_url:"https://aifinmarket.wind.com.cn/#/user/overview",
    install_manifest:"https://aifinmarket.wind.com.cn/skill.md",
    auth:"WIND_API_KEY",
    account_note:"AIFin Market is independent from a Wind terminal account; use the current AIFin Market account entitlement/points.",
    execution_policy:"Do not auto-install or execute remote skill code in the intelligence worker. Treat skill.md as the official integration manifest; enable direct MCP/Skill execution only after the exact official runtime contract is verified and WIND_API_KEY is configured.",
    arbitrary_url:false
  }
};
