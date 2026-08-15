# Global high-value data key registry

Only free/long-term-free or public-account credentials belong in the production candidate set. Paid-only or trial-only services are reference-only unless separately approved.

| Provider | Secret | Registration / account URL | Notes |
|---|---|---|---|
| Japan e-Stat | `ESTAT_JAPAN_APP_ID` | https://www.e-stat.go.jp/api/api/ | User registration required for API functions. |
| Korea KOSIS | `KOSIS_API_KEY` | https://kosis.kr/openapi/index/index.jsp | Official Korean statistics OpenAPI key. |
| Korea OpenDART | `OPENDART_API_KEY` | https://opendart.fss.or.kr/ | Official FSS disclosure/financial OpenAPI key. |
| Japan EDINET | `EDINET_API_KEY` | https://disclosure2.edinet-fsa.go.jp/ | Official FSA disclosure API registration. |
| UK Companies House | `COMPANIES_HOUSE_API_KEY` | https://developer.company-information.service.gov.uk/ | Public company data API; create account/application/key. |
| U.S. EIA | `EIA_API_KEY` | https://www.eia.gov/opendata/register.php | Free API key; bulk downloads do not require a key. |
| U.S. Census | `CENSUS_API_KEY` | https://api.census.gov/data/key_signup.html | Optional for many queries; use when needed for higher/reliable access. |
| U.S. BLS | `BLS_API_KEY` | https://data.bls.gov/registrationEngine/ | Optional registration key for public API. |
| U.S. BEA | `BEA_API_KEY` | https://apps.bea.gov/API/signup/ | Free official API key. |
| USDA NASS Quick Stats | `USDA_NASS_API_KEY` | https://quickstats.nass.usda.gov/api | Free official agricultural statistics key. |
| Materials Project | `MATERIALS_PROJECT_API_KEY` | https://next-gen.materialsproject.org/api | Account/API key; obey project terms. |
| Copernicus Marine | `COPERNICUS_MARINE_USERNAME`, `COPERNICUS_MARINE_PASSWORD` | https://data.marine.copernicus.eu/register | Free account for data/services. |
| Destatis GENESIS | `DESTATIS_GENESIS_TOKEN` | https://www-genesis.destatis.de/genesis/online | Optional token/account depending on API method; public data remain free. |

## No-key production candidates

`ons_uk`, `statcan`, `ecb_data`, `sec_edgar`, `clinicaltrials`, `abs_australia`, `istat_italy`, `cbs_netherlands`, `scb_sweden`, `ssb_norway`, `statfin_finland`, `statbank_denmark`, `gleif_lei`, `bank_canada_valet`, `us_treasury_fiscaldata`, `faa_aerodata`, `noaa_accessais`, `emodnet`, `argo_gdac`, `gebco`, `world_bank_pink_sheet`, `imf_commodity_prices`, `jodi_oil_gas`, `nih_reporter`, `cdc_open_data`, `cms_data`, `usaspending`, `ted_eu_procurement`, `usgs_earthquake`, `gdacs`, `reliefweb`, `nomad_materials`, `aflowlib`.

## Explicitly not treated as long-term-free production

- **ICAO API Data Service**: registration currently provides a limited 100-call free trial; subsequent API usage is paid. Keep as reference/catalog only.
- **IEA World Energy Statistics / Balances**: data-product terms can require paid licensing for modelling or derived products. Do not route into production as a free source unless rights are separately confirmed.
- Complete real-time exchange-grade equities, futures and order-book feeds are commonly licensed. Free public sources should be used for filings, fundamentals, macro/central-bank data, regulatory positioning and any legitimately open/delayed market data; do not mislabel proprietary exchange feeds as free.
