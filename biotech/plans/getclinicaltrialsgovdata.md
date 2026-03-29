# Plan: Fetch ClinicalTrials.gov Data and Export CSV

Goal: build a small, robust Python tool that queries ClinicalTrials.gov, normalizes selected fields to a canonical CSV schema, and writes CSV files into `csv/` for downstream analysis.

## Requirements
- Source API: ClinicalTrials.gov public API (v2 or study_fields legacy endpoints). No authentication required.
- Output: CSV files in `csv/` with columns matching the sample schema.
- Idempotent runs and optional incremental updates.

## CSV Schema With API Mapping

| CSV field          | API field or derivation                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Indication         | protocolSection.conditionsModule.conditions[]                                                                |
| Category           | Derived from Indication text (contains HIV or COVID => Virus, else Cancer)                                   |
| Link               | Derived from protocolSection.identificationModule.nctId as https://clinicaltrials.gov/study/<NCT>            |
| Study start        | protocolSection.statusModule.startDateStruct.date                                                            |
| Primary completion | protocolSection.statusModule.primaryCompletionDateStruct.date                                                |
| Phase              | protocolSection.designModule.phases[]                                                                        |
| IBRX drug          | protocolSection.armsInterventionsModule.interventions[].name matched against internal IBRX dictionary        |
| Partner drugs      | protocolSection.armsInterventionsModule.interventions[].name values not matched in IBRX dictionary           |
| Sponsor            | protocolSection.sponsorCollaboratorsModule.leadSponsor.name                                                  |
| FDA designation    | protocolSection.statusModule.expandedAccessInfo.hasExpandedAccess                                            |
| Platform           | Constant value "Immunocytokine"                                                                              |
| Partner drug pharma| protocolSection.sponsorCollaboratorsModule.collaborators[].name                                              |

## Implementation Steps

1. Discovery
    - Confirm which ClinicalTrials.gov API endpoint and field names map to the schema.
    - Prefer `https://clinicaltrials.gov/api/query/study_fields` or v2 endpoints for structured fields.

2. Repo scaffolding
    - Create `scripts/get_clinicaltrials.py` (Python 3).
    - Ensure `csv/` exists (script creates it if missing).

3. Script features
    - CLI options:
        - `--query` (search string)
        - `--nct-list` (comma-separated NCT IDs)
        - `--out-dir` (default `csv/`)
        - `--since` (YYYY-MM-DD for incremental)
        - `--format` (csv/json)
        - `--raw-json` (save raw responses)
    - Pagination and retries:
        - Exponential backoff on failures
        - Respect polite rate limits
    - Normalize fields:
        - Trim text, collapse repeated separators
        - Convert dates to ISO (YYYY-MM-DD)
        - Empty/unknown fields become blank
        - Split intervention names and classify with IBRX dictionary:
            - If name matches IBRX dictionary, write to `IBRX drug`
            - All other names go to `Partner drugs`
        - Derive `Category` from `Indication` (not from API):
            - Set to `"Virus"` if Indication contains "HIV" or "COVID" (case-insensitive)
            - Otherwise set to `"Cancer"`
        - Map FDA designation from `protocolSection.statusModule.expandedAccessInfo.hasExpandedAccess`
        - Set `Platform` to constant value `Immunocytokine`
    - Resolve `Link` as `https://clinicaltrials.gov/study/<NCT>` when NCT available.
    - Output files:
        - `csv/clinicaltrials_<query>_<YYYYMMDD>.csv` for query runs
        - `csv/clinicaltrials_<YYYYMMDD>.csv` for general runs
        - Optionally save `csv/raw_<timestamp>.json`
    - Exit codes:
        - `0` for success
        - Non-zero for fatal errors

4. Idempotency & incremental updates
    - Option A: `--since` fetches studies updated since date and writes incremental CSVs.
    - Option B: script writes daily CSVs and a `canonical.csv` merge routine can be provided.

5. Tests
    - Add `tests/test_mapping.py` to validate mapping from a saved sample API response to the CSV row.
    - Smoke test:
        - Run script with a small known NCT (e.g., NCT04050709)
        - Verify CSV output header and one row

6. Documentation
    - Update this `plans/getclinicaltrialsgovdata.md` with final schema and usage examples.
    - Add `scripts/README.md` with example commands and scheduling suggestions.

## Example usage
```bash
python3 scripts/get_clinicaltrials.py --query "ImmunityBio" --out-dir csv/
python3 scripts/get_clinicaltrials.py --nct-list NCT04050709,NCT03383978 --out-dir csv/ --raw-json
```

## Verification
1. Confirm `csv/clinicaltrials_<date>.csv` exists with expected header and rows.
2. Spot-check known NCT rows:
    - Correct `Link` format
    - Correct `Primary completion` date format
3. Run tests: `pytest tests/`.

## Files to create/update
- `scripts/get_clinicaltrials.py` — main script
- `tests/test_mapping.py` — minimal unit test(s)
- `csv/` — output folder
- `scripts/README.md` — usage docs

## Decisions & assumptions
- Language: Python 3 for portability. If you prefer Node.js, say so.
- Use the public ClinicalTrials.gov API; script will include simple retry/backoff.
- Output will be CSV and optional raw JSON for traceability.
