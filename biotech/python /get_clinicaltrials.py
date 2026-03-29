#!/usr/bin/env python3
"""Fetch ClinicalTrials.gov studies and export normalized CSV rows.

This script uses the v2 API and applies project-specific mapping rules,
including dictionary-driven separation of IBRX interventions vs partner drugs.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from typing import Any


API_BASE = "https://clinicaltrials.gov/api/v2/studies"
PLATFORM_VALUE = "Immunocytokine"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "csv"))
DEFAULT_QUERY_TERM = (
	"AREA[BasicSearch]ImmunityBio OR AREA[BasicSearch]IBRX "
	"OR AREA[BasicSearch]N803 OR AREA[BasicSearch]N-803 OR AREA[BasicSearch]Anktiva"
)
DEFAULT_STUDY_START_AFTER = "2020-01-01"


# IBRX entries as a simple CSV list.
# Per requirement, semicolon-separated parts in the provided source list are treated as standalone entries.
IBRX_NAMES_CSV = (
	"PD-L1 t-haNK, NK-92/5.28.z, Neoepitope Yeast Vaccine (YE-NEO-001), "
	"N-803, TriAdeno vaccine, M-CENK, CD19 t-haNK, Aldoxorubicin HCL, IBRX-042, "
	"hAd5-S-Fusion+N-ETSD, BM-Allo.MSC, Ad5-triCoV/Mac or ChAd-triCoV/Mac, "
	"AAHI-SC2 Vaccine, AAHI-SC3 Vaccine, 3BNC117-LS and 10-1074-LS Plus N-803, CIML NK cells, "
	"hAd5-S-Fusion+N-ETSD vaccine, Anktiva, Nogapendekin alfa inbakicept, t-haNK, CD19t-haNK suspension, "
	"CD19 t-haNK- IV Administration, CD19t-haNK suspension, haNK, Cryopreserved (M-CENK) (Cohort 2 part B), "
	"Allogeneic invariant Natural Killer T (iNKT) Cells (AgenT-797), AgenT-797, iNKT"
	"Suspension for Infusion; Cryopreserved (M-CENK) (Cohort 2 part B), M-CENK, Nogapendekin Alfa"
)


CSV_HEADERS = [
	"Indication",
	"Category",
	"Link",
	"Study start",
	"Primary completion",
	"Phase",
	"IBRX drug",
	"Co-treatments",
	"Sponsor",
	"Platform",
	"Partnered pharma",
]


def normalize_text(value: str) -> str:
	cleaned = value.replace("™", "")
	cleaned = re.sub(r"\s+", " ", cleaned.strip())
	return cleaned


def strip_parenthetical_text(value: str) -> str:
	text = value
	# Repeatedly remove innermost (...) so nested parentheses are fully removed.
	while True:
		new_text = re.sub(r"\([^()]*\)", "", text)
		if new_text == text:
			break
		text = new_text
	# Clean up any unmatched parentheses remnants.
	text = text.replace("(", "").replace(")", "")
	return normalize_text(text)


def unique_preserve_order(items: list[str]) -> list[str]:
	seen: set[str] = set()
	out: list[str] = []
	for item in items:
		key = item.lower()
		if key in seen:
			continue
		seen.add(key)
		out.append(item)
	return out


def canonicalize_ibrx_drug(value: str) -> str:
	text = normalize_text(value)
	if not text or text == "None":
		return text

	parts = [normalize_text(p) for p in text.split(";") if normalize_text(p)]
	cleaned_parts: list[str] = []

	for part in parts:
		if re.search(r"\bm-cenk\b", part, flags=re.IGNORECASE):
			part = "M-CENK"
		elif re.fullmatch(r"suspension for infusion", part, flags=re.IGNORECASE):
			continue
		part = re.sub(r"\s*\([^)]*\)", "", part).strip()
		part = re.sub(
			r"allogeneic invariant natural killer t cells|agent-797|inkt",
			"iNKT/AgenT-797",
			part,
			flags=re.IGNORECASE,
		)
		part = re.sub(r"\bNogapendekin\s+alfa[-\s]+inbakicept\b", "Anktiva", part, flags=re.IGNORECASE)
		part = re.sub(r"\bN-803\b", "Anktiva", part, flags=re.IGNORECASE)
		part = re.sub(r"\bN803\b", "Anktiva", part, flags=re.IGNORECASE)
		part = normalize_text(part)
		if part:
			cleaned_parts.append(part)

	cleaned_parts = unique_preserve_order(cleaned_parts)
	return "; ".join(cleaned_parts) if cleaned_parts else "None"


def canonicalize_partner_drug(part: str) -> str:
	value = normalize_text(part)
	if not value:
		return ""
	# Co-treatments should not include parenthetical qualifiers.
	value = strip_parenthetical_text(value)
	if not value:
		return ""

	lower = value.lower()
	if "m-cenk" in lower:
		return ""
	if lower == "suspension for infusion":
		return ""
	if "bcg" in lower or "bacillus calmette-guerin" in lower:
		return "BCG"
	if lower == "10-1074":
		return "10-1074"
	if lower.startswith("etbx-071"):
		return "ETBX-071"
	if lower == "pembrolizumab":
		return "Pembrolizumab/Keytruda"
	if lower == "rituximab":
		return "Rituximab"

	return value


def canonicalize_partner_drugs(value: str) -> str:
	text = normalize_text(value)
	if not text or text == "None":
		return text
	text = strip_parenthetical_text(text)
	if not text:
		return "None"

	parts = [canonicalize_partner_drug(part) for part in text.split(";")]
	parts = [part for part in parts if part and part != "None"]
	parts = unique_preserve_order(parts)
	return "; ".join(parts) if parts else "None"


def canonicalize_org_name(value: str) -> str:
	text = normalize_text(value)
	if not text:
		return text

	text = text.replace("National Institute of Allergy and Infectious Diseases (NIAID)", "NIAID")
	text = re.sub(r"\bUniversity\b", "U.", text)
	return normalize_text(text)


def canonicalize_indication(value: str) -> str:
	text = normalize_text(value)
	text = re.sub(r"\s*\([^)]*\)", "", text)
	text = normalize_text(text).rstrip(",")
	if not text:
		return text

	lower = text.lower()

	# Collapse known aliases/semicolon lists into a single canonical indication.
	if "head and neck" in lower:
		return "Head and neck cancer"

	if re.search(r"\bnsclc\b", lower) or "non-small cell" in lower or "non small cell" in lower:
		return "Non-small Cell Lung Cancer"

	if "long covid" in lower:
		return "Long Covid"

	if "covid" in lower:
		return "COVID"

	if (
		"hiv infection" in lower
		or "hiv infections" in lower
		or re.search(r"\bhiv\b", lower) and "aids" in lower
		or re.fullmatch(r"hiv", lower)
		or "human immunodeficiency virus" in lower
	):
		return "HIV/AIDS"

	if "non hodgkin's lymphoma refractory/relapsed" in lower:
		return "Non Hodgkin's Lymphoma"

	if "non-hodgkin lymphoma" in lower or "non hodgkin lymphoma" in lower:
		return "Non Hodgkin Lymphoma"

	if (
		"metastatic urothelial carcinoma" in lower
		or "urothelial carcinoma" in lower
		or "locally advanced urothelial carcinoma" in lower
		or "urothelial cancer" in lower
	):
		return "Urothelial Carcinoma"

	parts = [normalize_text(p) for p in text.split(";") if normalize_text(p)]
	mapped_parts: list[str] = []

	for part in parts:
		candidate = part
		if re.match(r"^Pancreatic Cancer Resectable$", candidate, flags=re.IGNORECASE):
			candidate = "Pancreatic Cancer"
		if re.match(r"^NMIBC$", candidate, flags=re.IGNORECASE):
			candidate = "Non Muscle Invasive Bladder Cancer"
		candidate = re.sub(
			r"Immunoparalysis in Critically Ill Adults",
			"Immunoparalysis",
			candidate,
			flags=re.IGNORECASE,
		)
		candidate = normalize_text(candidate)
		mapped_parts.append(candidate)

	mapped_parts = unique_preserve_order(mapped_parts)
	return "; ".join(mapped_parts)


def normalize_key(value: str) -> str:
	v = value.lower().strip()
	v = re.sub(r"^(biological|drug|device|procedure|other):\s*", "", v)
	v = re.sub(r"[^a-z0-9]+", "", v)
	return v


def build_ibrx_key_set() -> set[str]:
	keys: set[str] = set()

	for entry in IBRX_NAMES_CSV.split(","):
		part = normalize_text(entry)
		if part.lower().startswith("and "):
			part = normalize_text(part[4:])
		part_norm = normalize_key(part)
		if part_norm:
			keys.add(part_norm)

	return keys


IBRX_KEYS = build_ibrx_key_set()


def derive_category(indication_text: str) -> str:
	text = indication_text.lower()
	if "hiv" in text or "covid" in text:
		return "Virus"
	return "Cancer"


def parse_iso_date(value: str) -> dt.date | None:
	value = normalize_text(value)
	if not value:
		return None
	# ClinicalTrials often returns YYYY-MM-DD; occasionally YYYY-MM or YYYY.
	if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
		return dt.date.fromisoformat(value)
	if re.match(r"^\d{4}-\d{2}$", value):
		return dt.date.fromisoformat(f"{value}-01")
	if re.match(r"^\d{4}$", value):
		return dt.date.fromisoformat(f"{value}-01-01")
	return None


def filter_studies_by_start_after(studies: list[dict[str, Any]], cutoff: dt.date) -> list[dict[str, Any]]:
	filtered: list[dict[str, Any]] = []
	for study in studies:
		status_mod = study.get("protocolSection", {}).get("statusModule", {})
		start_raw = str(status_mod.get("startDateStruct", {}).get("date", ""))
		start_date = parse_iso_date(start_raw)
		if start_date and start_date > cutoff:
			filtered.append(study)
	return filtered


def split_intervention_text(name: str) -> list[str]:
	# Keep slashes in names (e.g., NK-92/5.28.z), split only on known separators.
	parts = re.split(r"\s*(?:;|\band\b|\bplus\b|\bwith\b|,)\s*", name, flags=re.IGNORECASE)
	parts = [normalize_text(p) for p in parts if normalize_text(p)]
	return parts or [normalize_text(name)]


def is_ibrx_name(name: str) -> bool:
	clean = normalize_text(name)
	clean_no_paren = normalize_text(re.sub(r"\s*\([^)]*\)", "", clean))

	# Alias recognition for known IBRX naming variants found in CT.gov intervention text.
	lower = clean.lower()
	lower_no_paren = clean_no_paren.lower()
	if "nogapendekin alfa inbakicept" in lower or "nogapendekin alfa inbakicept" in lower_no_paren:
		return True
	if "anktiva" in lower or "anktiva" in lower_no_paren:
		return True
	if re.search(r"\bn-?803\b", lower) or re.search(r"\bn-?803\b", lower_no_paren):
		return True
	if "agent-797" in lower or "agent-797" in lower_no_paren:
		return True
	if re.search(r"\binkt\b", lower) or re.search(r"\binkt\b", lower_no_paren):
		return True
	if re.search(r"\bm-cenk\b", lower):
		return True

	nkey = normalize_key(clean_no_paren)

	# t-haNK variants from ClinicalTrials names (e.g., "CD19 t-haNK- IV Administration").
	if "cd19thank" in nkey or "pdl1thank" in nkey:
		return True
	if not nkey:
		return False
	return nkey in IBRX_KEYS


def csv_value(value: Any) -> str:
	if value is None:
		return "None"
	text = normalize_text(str(value))
	text = text.replace("ImmunityBio, Inc.", "IBRX")
	return text if text else "None"


def normalize_phase_token(phase: str) -> str:
	phase = normalize_text(phase)
	return re.sub(r"^PHASE", "P", phase, flags=re.IGNORECASE)


def classify_interventions(interventions: list[dict[str, Any]]) -> tuple[str, str]:
	ibrx: list[str] = []
	partner: list[str] = []

	for item in interventions:
		raw_name = normalize_text(str(item.get("name", "")))
		if not raw_name:
			continue

		for candidate in split_intervention_text(raw_name):
			if is_ibrx_name(candidate):
				ibrx.append(candidate)
			else:
				partner.append(candidate)

	ibrx = unique_preserve_order(ibrx)
	partner = unique_preserve_order(partner)
	return "; ".join(ibrx), "; ".join(partner)


def http_get_json(url: str, retries: int = 4, timeout: int = 30) -> dict[str, Any]:
	delay = 1.0
	headers = {"User-Agent": "biowatch-clinicaltrials/1.0"}

	for attempt in range(1, retries + 1):
		try:
			req = urllib.request.Request(url, headers=headers)
			with urllib.request.urlopen(req, timeout=timeout) as response:
				raw = response.read()
				return json.loads(raw)
		except Exception:
			if attempt == retries:
				raise
			time.sleep(delay)
			delay = min(delay * 2.0, 8.0)

	raise RuntimeError("Unexpected retry loop exit")


def fetch_studies(query: str | None, nct_ids: list[str] | None) -> list[dict[str, Any]]:
	studies: list[dict[str, Any]] = []
	page_token: str | None = None

	while True:
		params: dict[str, str] = {"pageSize": "100"}

		# Fetch criteria for the ClinicalTrials.gov API:
		# 1. If --nct-list is provided, query those exact NCT IDs via query.id.
		# 2. Else if --query is provided, search by that term via query.term.
		# 3. Else default to a BasicSearch expression that searches for either term:
		#    AREA[BasicSearch]ImmunityBio OR AREA[BasicSearch]IBRX
		# 4. Results are requested in pages of 100 studies and all pages are fetched until
		#    nextPageToken is absent.
		# 5. No status, phase, sponsor, indication, or intervention filters are applied at the
		#    API request level beyond the query.id/query.term selection above.
		if nct_ids:
			params["query.id"] = ",".join(nct_ids)
		elif query:
			params["query.term"] = query
		else:
			params["query.term"] = DEFAULT_QUERY_TERM

		if page_token:
			params["pageToken"] = page_token

		url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
		payload = http_get_json(url)

		chunk = payload.get("studies", [])
		studies.extend(chunk)

		page_token = payload.get("nextPageToken")
		if not page_token:
			break

		time.sleep(0.25)

	return studies


def map_study_to_row(study: dict[str, Any]) -> dict[str, str]:
	ps = study.get("protocolSection", {})

	id_mod = ps.get("identificationModule", {})
	status_mod = ps.get("statusModule", {})
	conditions_mod = ps.get("conditionsModule", {})
	design_mod = ps.get("designModule", {})
	interventions_mod = ps.get("armsInterventionsModule", {})
	sponsors_mod = ps.get("sponsorCollaboratorsModule", {})

	nct_id = normalize_text(str(id_mod.get("nctId", "")))
	conditions = conditions_mod.get("conditions") or []
	indications = [normalize_text(str(c)) for c in conditions if str(c).strip()]
	indication = "; ".join(indications)

	phases = design_mod.get("phases") or []
	phase = "; ".join(normalize_phase_token(str(p)) for p in phases if str(p).strip())

	interventions = interventions_mod.get("interventions") or []
	ibrx_drug, partner_drugs = classify_interventions(interventions)

	collaborators = sponsors_mod.get("collaborators") or []
	partner_pharma = "; ".join(
		canonicalize_org_name(str(c.get("name", ""))) for c in collaborators if str(c.get("name", "")).strip()
	)

	row = {
		"Indication": canonicalize_indication(indication),
		"Category": derive_category(indication),
		"Link": f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else "",
		"Study start": normalize_text(str(status_mod.get("startDateStruct", {}).get("date", ""))),
		"Primary completion": normalize_text(
			str(status_mod.get("primaryCompletionDateStruct", {}).get("date", ""))
		),
		"Phase": phase,
		"IBRX drug": canonicalize_ibrx_drug(ibrx_drug),
		"Co-treatments": canonicalize_partner_drugs(partner_drugs),
		"Sponsor": canonicalize_org_name(str(sponsors_mod.get("leadSponsor", {}).get("name", ""))),
		"Platform": PLATFORM_VALUE,
		"Partnered pharma": partner_pharma,
	}

	return {key: csv_value(val) for key, val in row.items()}


def safe_slug(value: str) -> str:
	value = value.strip().lower()
	value = re.sub(r"[^a-z0-9]+", "_", value)
	value = value.strip("_")
	return value or "query"


def write_csv(rows: list[dict[str, str]], out_dir: str, query: str | None) -> str:
	os.makedirs(out_dir, exist_ok=True)
	stamp = dt.datetime.now().strftime("%Y%m%d")

	if query:
		filename = f"clinicaltrials_{safe_slug(query)}_{stamp}.csv"
	else:
		filename = f"ibrx.csv"

	out_path = os.path.join(out_dir, filename)
	with open(out_path, "w", newline="", encoding="utf-8") as f:
		writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
		writer.writeheader()
		writer.writerows(rows)
	return out_path


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Fetch ClinicalTrials.gov and export normalized CSV")
	parser.add_argument("--query", default=None, help="Search term query")
	parser.add_argument("--nct-list", default=None, help="Comma-separated NCT IDs")
	parser.add_argument(
		"--study-start-after",
		default=DEFAULT_STUDY_START_AFTER,
		help="Include only studies with startDateStruct.date after this date (YYYY-MM-DD)",
	)
	parser.add_argument(
		"--out-dir",
		default=DEFAULT_OUT_DIR,
		help=f"Output folder for CSV (defaults to repo csv folder: {DEFAULT_OUT_DIR})",
	)
	parser.add_argument("--raw-json", action="store_true", help="Also write fetched raw JSON")
	return parser.parse_args()


def main() -> int:
	args = parse_args()

	nct_ids = None
	if args.nct_list:
		nct_ids = [x.strip() for x in args.nct_list.split(",") if x.strip()]

	try:
		studies = fetch_studies(args.query, nct_ids)
	except Exception as exc:
		print(f"fatal: failed to fetch studies: {exc}", file=sys.stderr)
		return 2

	try:
		cutoff = dt.date.fromisoformat(args.study_start_after)
	except ValueError:
		print("fatal: --study-start-after must be YYYY-MM-DD", file=sys.stderr)
		return 2

	# Post-fetch inclusion criteria for writing rows to CSV:
	# 1. A study is kept only if protocolSection.statusModule.startDateStruct.date exists and parses
	#    as YYYY-MM-DD, YYYY-MM, or YYYY.
	# 2. The parsed start date must be strictly later than --study-start-after.
	# 3. With the current default, only studies starting after 2020-01-01 are written.
	# 4. After this date filter, the script maps each remaining study into one CSV row using
	#    conditions, phases, interventions, sponsor/collaborator data, and the normalization rules
	#    defined above for indication, IBRX drug, co-treatments, sponsor, and partnered pharma.
	studies = filter_studies_by_start_after(studies, cutoff)

	rows = [map_study_to_row(s) for s in studies]
	out_dir = DEFAULT_OUT_DIR
	if os.path.abspath(args.out_dir) != DEFAULT_OUT_DIR:
		print(f"note: ignoring --out-dir and writing to {DEFAULT_OUT_DIR}")
	out_path = write_csv(rows, out_dir, args.query)

	if args.raw_json:
		os.makedirs(out_dir, exist_ok=True)
		raw_path = os.path.join(out_dir, f"raw_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
		with open(raw_path, "w", encoding="utf-8") as f:
			json.dump({"studies": studies}, f, indent=2)
		print(f"raw_json={raw_path}")

	print(f"wrote_rows={len(rows)}")
	print(f"csv={out_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
