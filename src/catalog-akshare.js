export const AKSHARE_CATALOG={
  akshare:{
    category:"finance-cn-open-source-research-data",
    access:"config",
    secrets:["AKTOOLS_BASE_URL"],
    config_vars:["AKTOOLS_BASE_URL"],
    adapter:"akshare.aktools-http",
    integration:"official-akshare+official-aktools-http",
    scope:"A-share-HK-US-equities-indices-funds-bonds-futures-macro-public-financial-data",
    official_repo:"akfamily/akshare",
    http_repo:"akfamily/aktools",
    docs:"https://akshare.akfamily.xyz/",
    runtime_note:"AKShare remains a Python-side data collection library; the intelligence Worker talks only to a separately deployed AKTools HTTP runtime.",
    access_policy:"public-source research data; downstream source terms still apply; do not treat as exchange-licensed real-time feed",
    arbitrary_url:false,
    retry_policy:"none"
  },
  aktools:{
    category:"finance-cn-http-runtime",
    access:"config",
    secrets:["AKTOOLS_BASE_URL"],
    config_vars:["AKTOOLS_BASE_URL"],
    adapter:"akshare.aktools-http",
    integration:"official-aktools-fastapi-http",
    scope:"bounded allowlisted AKShare HTTP functions",
    official_repo:"akfamily/aktools",
    docs:"https://aktools.akfamily.xyz/",
    arbitrary_url:false,
    retry_policy:"none"
  }
};
