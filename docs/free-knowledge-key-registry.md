# Free Knowledge Source Key Registry

Last verified: 2026-08-15

This registry covers free/public knowledge sources that need or benefit from credentials. Public anonymous sources are intentionally omitted. Secrets belong in the Cloudflare runtime, never in GitHub.

| Provider | Runtime secret | Credential requirement | Registration / token URL |
|---|---|---|---|
| OpenAlex | `OPENALEX_API_KEY` | Free API key | https://openalex.org/settings/api |
| Semantic Scholar | `SEMANTIC_SCHOLAR_API_KEY` | Free key for authenticated Academic Graph usage | https://www.semanticscholar.org/product/api#api-key-form |
| CORE | `CORE_API_KEY` | Free API access subject to current terms/rate limits | https://core.ac.uk/services/api |
| NCBI / PubMed | `NCBI_API_KEY` | Optional; raises E-utilities rate allowance | https://www.ncbi.nlm.nih.gov/account/ |
| NCBI contact | `NCBI_EMAIL` | Optional contact metadata | https://www.ncbi.nlm.nih.gov/account/ |
| Europeana | `EUROPEANA_API_KEY` | Free API key | https://pro.europeana.eu/page/get-api |
| DPLA | `DPLA_API_KEY` | Free key; request endpoint accepts the applicant email | https://api.dp.la/v2/api_key/YOUR_EMAIL@example.com |
| Smithsonian Open Access | `SMITHSONIAN_API_KEY` or `DATA_GOV_API_KEY` | Free api.data.gov key | https://api.data.gov/signup/ |
| GovInfo | `GOVINFO_API_KEY` or `DATA_GOV_API_KEY` | Free key | https://www.govinfo.gov/api-signup |
| Congress.gov | `CONGRESS_API_KEY` or `DATA_GOV_API_KEY` | Free key | https://api.congress.gov/sign-up |
| Regulations.gov | `REGULATIONS_GOV_API_KEY` or `DATA_GOV_API_KEY` | Free api.data.gov key | https://api.data.gov/signup/ |
| openFDA | `OPENFDA_API_KEY` or `DATA_GOV_API_KEY` | Optional; anonymous access has lower limits | https://api.data.gov/signup/ |
| NARA Catalog | `NARA_API_KEY` | Free key; request process documented by NARA | https://www.archives.gov/research/catalog/help/api |
| Biodiversity Heritage Library | `BHL_API_KEY` | Free API key | https://www.biodiversitylibrary.org/getapikey.aspx |
| NASA ADS | `NASA_ADS_TOKEN` | Free personal API token | https://ui.adsabs.harvard.edu/user/settings/token |
| OpenCitations | `OPENCITATIONS_ACCESS_TOKEN` | Optional free token | https://opencitations.net/accesstoken |
| ROR | `ROR_CLIENT_ID` | Optional free client ID; anonymous API remains available | https://ror.org/api-client-id |
| ORCID Public API | `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` | Free public API credentials subject to ORCID terms | https://orcid.org/developer-tools |
| CourtListener | `COURTLISTENER_API_TOKEN` | Free account/token | https://www.courtlistener.com/sign-up/ ; https://www.courtlistener.com/profile/api-token/ |
| EPO Open Patent Services | `EPO_OPS_CONSUMER_KEY`, `EPO_OPS_CONSUMER_SECRET` | Free developer registration / non-paying tier | https://developers.epo.org/user/register |
| DigitalNZ | `DIGITALNZ_API_KEY` | Optional for regular/higher-volume API usage | https://digitalnz.org/api_keys/edit |
| Zenodo | `ZENODO_TOKEN` | Optional for public search; required for account-scoped operations | https://zenodo.org/account/settings/applications/tokens/new/ |
| Deutsche Digitale Bibliothek | `DDB_API_KEY` | Free key after creating a DDB user account; generate it under Meine DDB | https://www.deutsche-digitale-bibliothek.de/content/hilfe?lang=en |
| Harvard Art Museums | `HARVARD_ART_MUSEUMS_API_KEY` | Free key; API is non-commercial and rate-limited | https://www.harvardartmuseums.org/collections/api |
| Trove | `TROVE_API_KEY` | Free key for eligible use; current Trove terms must be checked before harvesting content | https://help.nla.gov.au/trove/building-with-trove/api |

## Shared key rule

`DATA_GOV_API_KEY` should be preferred where supported. One free api.data.gov key can serve compatible federal APIs such as Smithsonian, Regulations.gov, and openFDA; Congress.gov/GovInfo may also expose their own signup flows. Do not create duplicate secrets unless a provider requires a distinct credential.

## Security rule

Never commit keys, tokens, cookies, passwords, or OAuth credentials to this repository. Store them only as runtime secrets and expose only configured/not-configured status through the intelligence center.
