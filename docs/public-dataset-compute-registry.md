# Public Dataset Compute Registry

Purpose: maintain a high-value, free/public dataset discovery layer for the compute center. This file is a routing/asset registry, not permission to scrape arbitrary endpoints. Prefer official machine-readable interfaces, bulk downloads, or registered public research access. Preserve source attribution, license, update cadence, geography, and data lineage.

## Priority model

- P0: authoritative China data or high-value global data with direct China coverage; suitable for repeated quantitative work.
- P1: strong proxy / spatial / survey / scientific data for calibration, nowcasting, triangulation, stress testing, or small-area estimation.
- P2: supplementary, historical, research, or niche datasets.
- Trust tier: official > intergovernmental / national science infrastructure > peer-reviewed/open research platform > community mirror.
- Never use a community mirror as the sole source when the official source is available.
- Mark synthetic datasets explicitly and exclude them from real-world calibration unless the task explicitly calls for synthetic stress data.

## P0 China authoritative / national sources

| Source | Main value to compute center | Access mode | Notes |
|---|---|---|---|
| National Bureau of Statistics – National Data | GDP, CPI/PPI, industry, retail, investment, real estate, population, employment, income, provincial/monthly/quarterly/annual series, census | public web/database | Core macro baseline and constraint set. Use official pages/downloads; do not assume undocumented APIs are stable. |
| People’s Bank of China statistics | money, credit, social financing, banking, rates, financial statistics | public statistics pages/files | Core monetary/financial calibration. |
| SAFE statistics | balance of payments, IIP, reserves, FX market, external debt, bank external assets/liabilities, settlement/receipts/payments | public pages/files | Core external-sector and FX stress data. |
| General Administration of Customs statistics | import/export, commodity/country/region trade statistics | public query/download | China trade, supply-chain and industry demand modelling. |
| Ministry of Finance / fiscal releases | central/local fiscal revenue/expenditure, government funds, tax/fiscal policy aggregates | public pages/files | Fiscal scenarios and policy calibration. |
| MIIT statistics | industrial sectors, telecom, software, internet, manufacturing indicators | public pages/files | Industry/digital-economy modelling. |
| Ministry of Transport / sector agencies | freight/passenger traffic, ports, road/water transport and transport investment | public pages/files | Logistics, mobility and supply-chain modelling. |
| National Energy Administration / public energy statistics | electricity/energy supply, investment, generation, capacity | public pages/files | Energy-demand, industrial activity and stress scenarios. |
| Ministry of Ecology and Environment / CNEMC | air/environmental indicators | public pages/files where available | Environmental constraints and health/externality models. |
| China Meteorological Data Service Centre | station observations, climate, hourly/daily products, CLDAS and related products | registration/public data service | Weather, extreme-event and demand models. |
| National Earth System Science Data Center | China/global earth-system datasets, land/water/ecology/disaster and research datasets | public/registered dataset downloads | High-value scientific and geospatial calibration. |
| Provincial/municipal open-data portals | local transport, public services, economy, environment, facilities | fragmented public APIs/files | Use city/province-specific adapters only after contract verification. |

## P0/P1 China microdata and research datasets

| Source | Value | Access | Use |
|---|---|---|---|
| CFPS – China Family Panel Studies | household/individual/community panel: income, work, education, health, migration, family dynamics | public + registered/restricted tiers | behavioural, consumption, labour, household and policy-response models |
| CHARLS | ageing, health, income, labour, household longitudinal microdata | registration/research access | ageing, health economics, retirement, household risk |
| CGSS | social attitudes, demographics, work, family and social structure | registration/research access | social behaviour, attitudes, segmentation and policy response |
| CHFS (where research access is granted) | household finance/assets/debt/income | research access conditions | household balance-sheet and financial-risk modelling |
| PKU Open Research Data / Dataverse datasets | replication datasets and China-focused research data | dataset-specific | model replication, parameter priors and validation |

## P0 global open data with China coverage

| Source | Value | Access |
|---|---|---|
| World Bank Open Data / WDI / Data360 / Microdata | development, macro, population, infrastructure, survey context | free API/download; dataset terms vary for microdata |
| IMF Data | macro, fiscal, monetary, balance-of-payments, trade and financial series | public interfaces/downloads subject to dataset terms |
| UN Comtrade | bilateral merchandise trade and commodity flows | public API/download with service limits |
| UN / UNData / SDG datasets | demographics, development and SDG indicators | public |
| FAOSTAT | agriculture, food, land, production, prices, trade | public API/download |
| ILOSTAT | labour, employment, wages, unemployment | public |
| WHO / GHO | health, mortality, disease and system indicators | public |
| BIS | banking, credit, debt, exchange-rate and financial statistics | public |
| OECD public statistics | economy, productivity, industry, trade, social indicators | public datasets / SDMX where available |
| ADB Data Library | Asia macro/development indicators | public |
| FRED | macro/financial series including selected China/global series | public API key / public site |
| EIA international data | energy production/consumption/prices | public API/key where applicable |
| Ember / Global Energy Monitor open datasets | electricity mix, generation, infrastructure/project tracking | open/public under source-specific terms |

## P0/P1 geospatial and human-activity data

Already integrated or registered in the intelligence center should be preferred rather than duplicated:

- Google Earth Engine public catalog
- Sentinel / Landsat / MODIS and Copernicus public products
- ERA5 and other climate/reanalysis products available through approved public channels
- WorldPop
- GHSL population, built-up surface, settlement and urbanisation layers
- Overture Maps
- OpenStreetMap / public extracts
- Foursquare OS Places
- DLR World Settlement Footprint
- NASA VIIRS night lights / Black Marble products
- Copernicus land-cover products
- Global Fishing Watch public layers where applicable

Primary compute uses: small-area estimation, urban structure, commercial catchment proxies, population exposure, land-use change, construction/urban growth, activity nowcasting, logistics, climate/environment stress tests.

## P1 business, enterprise, innovation and public-information datasets

- Qichacha: keyed commercial/business-intelligence source already integrated; treat as licensed source, not an open dataset.
- GLEIF LEI: global legal-entity identifiers and relationships; valuable for cross-border entity matching.
- SEC EDGAR: filings for US-listed/global issuers including China-related issuers.
- OpenAlex / Crossref / DataCite / OpenCitations: science, institutions, citations and research diffusion.
- Google Patents public data, EPO interfaces, USPTO ODP, Court/government publication datasets already registered where appropriate.
- GDELT: global news/event monitoring and narrative/activity proxies.
- Wikimedia pageviews / Commons / Wikidata: attention, entity and knowledge-graph proxies.
- Common Crawl: web-scale public corpus; bulk/compute-heavy, use only for bounded research jobs.

## China-specific dataset packs to build for the compute center

Do not store all raw data permanently. Build immutable task-ready packs with manifests and hashes.

1. `china-macro-pack`: NBS + PBOC + SAFE + fiscal + customs + World Bank/IMF cross-checks.
2. `china-industry-pack`: NBS industry + MIIT + customs commodity flows + energy + patents/science.
3. `china-commercial-location-pack`: WorldPop + GHSL + Overture/OSM + POI + VIIRS + land cover + official local statistics.
4. `china-household-behavior-pack`: CFPS/CGSS/CHARLS/other approved surveys + macro price/income context.
5. `china-logistics-pack`: customs + ports/transport + road/rail/water statistics + weather + geospatial network layers.
6. `china-financial-risk-pack`: PBOC + SAFE + BIS + FRED + public market data + entity links.
7. `china-policy-impact-pack`: official policy releases + macro/industry/local panels + survey/microdata + causal-design metadata.
8. `china-environment-climate-pack`: CMA + MEE/CNEMC + ERA5/Sentinel/MODIS/GHSL + earth-system datasets.
9. `china-urban-real-estate-pack`: NBS housing indicators + land/building/settlement layers + population/POI/night-light proxies + local open data.
10. `china-disaster-resilience-pack`: weather/extremes + earth-system hazard datasets + population/exposure + roads/buildings/critical facilities.

## Mandatory data-pack manifest

Every compute input pack should include at least:

```json
{
  "pack_id": "...",
  "version": "...",
  "created_at": "...",
  "sources": [],
  "source_urls": [],
  "license_notes": [],
  "retrieved_at": [],
  "geography": {},
  "time_coverage": {},
  "update_cadence": {},
  "schema": {},
  "units": {},
  "missingness": {},
  "quality_score": {},
  "freshness_score": {},
  "trust_tier": {},
  "transformations": [],
  "cross_checks": [],
  "sha256": "..."
}
```

## Quality rules

1. Official and direct sources outrank mirrors.
2. Mirrors/Kaggle copies may be used for convenience only after provenance and licensing are verified.
3. Synthetic datasets must be labelled `synthetic=true` and cannot calibrate real-world models by default.
4. Time, geography, units and revisions must be explicit.
5. Use at least two independent sources for high-impact quantities when possible.
6. Prefer source triangulation: official statistic + independent international series + spatial/activity proxy.
7. For China city/district estimates, never infer precision finer than the weakest reliable input without uncertainty bounds.
8. Keep raw collection in the intelligence center; send bounded immutable data packs to the compute center.
9. Preserve no task history in compute; reusable methods, schemas, benchmarks and public parameter priors are allowed.
10. A dataset is not production-ready until it has provenance, license/access status, schema, freshness and a validation rule.
