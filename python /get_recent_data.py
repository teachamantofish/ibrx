#!/usr/bin/env python3
"""Fetch ClinicalTrials.gov studies modified in the last 14 days and export to recent_data.csv.

Uses the same query, status filter, and normalization as get_clinicaltrials.py.
Run from this directory: python3 get_recent_data.py
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import os
import time
import urllib.parse
import urllib.request

from get_clinicaltrials import (
    API_BASE,
    CSV_HEADERS,
    DEFAULT_QUERY_TERM,
    DEFAULT_OUT_DIR,
    STUDY_STATUS_TO_INCLUDE,
    filter_studies_by_status,
    http_get_json,
    map_study_to_row,
)

DAYS_BACK = 14


def fetch_studies_modified_since(since: dt.date) -> list:
    studies = []
    page_token: str | None = None
    date_range = f"{since.isoformat()},{dt.date.today().isoformat()}"

    while True:
        params: dict[str, str] = {
            "pageSize": "100",
            "query.term": DEFAULT_QUERY_TERM,
            "filter.lastUpdatePostDate": date_range,
        }
        if page_token:
            params["pageToken"] = page_token

        url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
        payload = http_get_json(url)

        studies.extend(payload.get("studies", []))

        page_token = payload.get("nextPageToken")
        if not page_token:
            break

        time.sleep(0.25)

    return studies


def main() -> int:
    since = dt.date.today() - dt.timedelta(days=DAYS_BACK)
    print(f"Fetching studies with lastUpdatePostDate >= {since.isoformat()} ...")

    studies = fetch_studies_modified_since(since)
    print(f"  API returned {len(studies)} studies")

    studies = filter_studies_by_status(studies, STUDY_STATUS_TO_INCLUDE)
    print(f"  After status filter: {len(studies)} studies")

    rows = [map_study_to_row(s) for s in studies]

    out_path = os.path.join(DEFAULT_OUT_DIR, "recent_data.csv")
    os.makedirs(DEFAULT_OUT_DIR, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
