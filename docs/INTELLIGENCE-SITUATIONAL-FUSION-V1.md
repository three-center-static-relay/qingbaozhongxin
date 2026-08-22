# Intelligence Situational Fusion & Warning v1.1

## Purpose

This is a **general-purpose intelligence sensing, fusion, analysis and warning architecture**. It is not tied to air defence, weapons, targeting or fire-control. It converts bounded metadata observations from the Intelligence Center's approved sources into a persistent, auditable situational picture for Governance/LA and Expert review.

## Public doctrine used as design reference

The architecture is derived from current public, authoritative concepts rather than one vendor or one country's platform:

- NATO Joint Intelligence, Surveillance and Reconnaissance (JISR), updated 8 July 2026: persistent multi-domain collection, analysis, fusion and sharing for situational awareness and decision support.
- NATO Data Strategy for the Alliance (2025): discoverable, accessible, trusted, regulated, interoperable/curated, shared and secure data.
- NATO Digital Transformation / Digital Backbone: consolidated multi-domain situational awareness using sensor networks, multiple data sources and advanced analytics.
- NGA GEOINT AI / 2025 capabilities: high-volume detections, tip-offs and alerts, pattern-of-life analysis, anomaly discovery and informed collection orchestration.
- ODNI ICD 203 analytic standards: source quality, explicit uncertainty, separation of information/assumption/judgment, analysis of alternatives and explicit analytic disagreement.
- UK Joint Intelligence Organisation: authoritative all-source fusion of classified reporting, diplomatic reporting and open sources for senior decision-makers.

## Optimized architecture

```text
Approved sources / datasets / browsers / geospatial / literature / legal / economic / public data
                                      |
                                      v
                              Observation layer
                                      |
                     normalize time/entity/provenance
                                      |
                                      v
                         Track / Entity correlation
                                      |
                  persistent world-state / track continuity
                                      |
             +------------------------+------------------------+
             |                        |                        |
             v                        v                        v
      Pattern-of-life          Source independence      Hypothesis ledger
      baseline deviation       provenance quality       support/contradict
             |                        |                        |
             +------------------------+------------------------+
                                      |
                                      v
                         All-source fusion engine
                                      |
           confidence / anomaly / impact / urgency / velocity
           deception risk / contradiction / information value
                                      |
                                      v
                         Dynamic priority & warning
                  BACKGROUND -> INTEREST -> WATCH ->
                    WARNING -> HIGH_WARNING
                                      |
                         tail-risk override for
                     low-confidence/high-impact cases
                                      |
                                      v
                         Collection gap analysis
                                      |
          increase/decrease cadence / independent corroboration /
       orthogonal evidence / provenance verification / alternative review
                                      |
                                      v
                         LA + Expert review packet
                                      |
                facts vs assumptions vs judgments separated
                uncertainty + alternatives + dissent explicit
                                      |
                                      v
                            Decision support
                                      |
                                      +---- feedback / retask ---->
```

## Core rules

1. **Track reality, not documents.** Many observations may represent one entity/event track.
2. **Source count is not source independence.** Correlated outlets sharing one upstream source are one evidence family.
3. **Maintain a continuous world model.** Tracks persist and decay instead of disappearing between searches.
4. **Baseline first, anomaly second.** A change is meaningful relative to normal behavior.
5. **Do not average away tail risk.** High-impact, abnormal or urgent cases can force a warning-floor override.
6. **Use value of information.** High-impact/high-uncertainty tracks receive priority for additional collection.
7. **Surface deception and information pollution.** Contradiction, common-origin evidence and explicit deception signals reduce confidence and trigger orthogonal collection.
8. **Preserve alternative hypotheses and dissent.** Consensus is not treated as proof.
9. **AI is advisory.** AI receives metadata-only track packets, must cite track keys, express uncertainty and cannot perform autonomous external actions.
10. **Human/LA decision authority remains external to Intelligence.** The Intelligence Center produces situational awareness and warnings, not policy or execution decisions.
11. **Metadata-only persistence.** Raw source bodies, transcripts, secrets, credentials and arbitrary payloads are rejected from the fusion state.
12. **Closed-loop collection.** Warnings generate bounded retask recommendations that return through Governance/LA to approved collection paths.

## Runtime endpoints

- `GET /v1/intelligence-fusion/meta` — public architecture/capability metadata.
- `POST /v1/intelligence-fusion/run` — service-binding internal only; fuse metadata observations and persist the current situational picture.
- `GET /v1/intelligence-fusion/latest` — service-binding internal only; read the latest situational picture.
- `POST /v1/intelligence-fusion/ai-assess` — service-binding internal only; optional advisory Workers AI analysis of the latest metadata-only picture.

AI advisory is implemented but defaults to **off**, automatic invocation is **off**, and automatic paid budget is **0**. This preserves the existing free-first/fail-closed operating policy while making the AI analysis layer one configuration switch away when explicitly enabled.

## Non-goals

- No weapon control or engagement logic.
- No autonomous targeting.
- No arbitrary URL collection.
- No secret/raw intelligence persistence in fusion state.
- No replacement of source-specific adapters or Governance/Expert judgment.
