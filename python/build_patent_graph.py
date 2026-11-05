"""Convert the IBRX patent CSV to Galaxy View records, typed relationships, details, and configurable title-based topic tags."""
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/data/ibrx_uspto_patents.csv'
OUTPUT = ROOT / 'docs/patents/data'
TAG_RULES = OUTPUT / 'tag-rules.json'
FAMILY_DETAIL_FIELDS = ('title', 'cpc', 'first_applicant', 'grant_date', 'est_expiry')
REQUIRED_COLUMNS = {'application_number', 'title', 'family_id', 'parent_applications'}
RELATIONSHIPS = {
    'family-member': 'Application belongs to the family ID explicitly supplied in the CSV.',
    'parent-application': 'Child application points to a parent listed in the CSV; not a patent citation.'
}


def classify_title(title, rules):
    """Assign overlapping topic tags; use the configured therapeutic class for vague titles."""
    tags = [rule['tag'] for rule in rules['categories']
            if re.search(rule['pattern'], title, re.IGNORECASE)
            and not (rule['exclude'] and re.search(rule['exclude'], title, re.IGNORECASE))]
    if not tags:
        unmatched = rules['unmatched']
        tags = [unmatched['cancerTag'] if re.search(unmatched['cancerPattern'], title, re.IGNORECASE)
                else unmatched['otherTag']]
    return tags


def write_json(name, value):
    """Write deterministic JSON for static hosting."""
    (OUTPUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def build():
    """Validate source rows and preserve every CSV field in each application's sourceRecord."""
    with SOURCE.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if not REQUIRED_COLUMNS.issubset(reader.fieldnames or []):
            raise ValueError('Missing required CSV columns')
        rows = list(reader)
    if not rows:
        raise ValueError('Empty patent CSV')
    rules = json.loads(TAG_RULES.read_text())
    applications = {}
    family_tags = {}
    family_rows = {}
    for row in rows:
        key = row['application_number']
        if not key or not row['title'] or key in applications or None in row or None in row.values():
            raise ValueError(f'Invalid or duplicate application: {key}')
        applications[key] = f'applications/{key}.md'
    files, edges, details, absent = [], [], {}, []
    for row in rows:
        path = applications[row['application_number']]
        tags = classify_title(row['title'], rules)
        family_tags.setdefault(row['family_id'], set()).update(tags)
        family_rows.setdefault(row['family_id'], []).append(row)
        files.append({'path': path, 'basename': SOURCE.name,
                      'metadata': {'title': row['title'], 'name': row['application_number'], 'type': row['cpc'], 'tags': tags},
                      'tags': tags,
                      'sourceRecord': row.copy()})
        details[path] = {**row, 'topic_tags': tags, 'classification_basis': rules['basis']}
        if row['family_id']:
            edges.append({'source': path, 'target': f"families/{row['family_id']}.md", 'type': 'family-member'})
        if row['parent_applications']:
            for parent in row['parent_applications'].split('; '):
                fields = parent.split('|')
                if len(fields) != 5 or not fields[0]:
                    raise ValueError(f'Malformed parent for {path}: {parent}')
                if fields[0] in applications:
                    edges.append({'source': path, 'target': applications[fields[0]],
                                  'type': 'parent-application', 'relationship_code': fields[4]})
                else:
                    absent.append({'application': row['application_number'], 'parent': fields[0]})
    for family in sorted({row['family_id'] for row in rows if row['family_id']}):
        path = f'families/{family}.md'
        tags = sorted(family_tags[family])
        summary = {field: '; '.join(sorted({row[field] for row in family_rows[family] if row[field]}))
                   for field in FAMILY_DETAIL_FIELDS}
        record = {'family_id': family, 'kind': 'family grouping from CSV'}
        files.append({'path': path, 'basename': SOURCE.name,
                      'metadata': {'title': summary['title'], 'type': summary['cpc'], 'tags': tags}, 'tags': tags, 'sourceRecord': record})
        details[path] = {**record, **summary, 'topic_tags': tags, 'classification_basis': rules['basis']}
    links, degree = {}, Counter()
    for edge in edges:
        links.setdefault(edge['source'], {})[edge['target']] = 1
        degree[edge['source']] += 1
        degree[edge['target']] += 1
    for node in files:
        node['sizing'] = {'links': degree[node['path']], 'fileSize': 0, 'depth': 1, 'age': 0}
    paths = {node['path'] for node in files}
    if len(paths) != len(files) or any(e['target'] not in paths for e in edges):
        raise ValueError('Duplicate nodes or dangling relationships')
    graph = {'files': files, 'resolvedLinks': links, 'unresolvedLinks': {}, 'typedEdges': edges,
             'ontology': {'version': '1', 'source': SOURCE.name, 'scope': 'CSV applications and explicit family/parent relationships',
                          'domains': [], 'nodeTypes': {'application': 'One CSV application record', 'family': 'Explicit CSV family ID'},
                          'relationships': RELATIONSHIPS},
             'provenance': {'source': SOURCE.name, 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                            'applicationCount': len(rows), 'familyCount': len(files) - len(rows),
                            'parentsOutsideDataset': absent,
                            'tagClassification': rules['basis'],
                            'sizing': 'Links count incoming and outgoing relationships. File size and age are zero: no file metadata supplied.'}}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_json('patents.json', graph)
    write_json('patents.details.json', details)
    print(f'{len(rows)} applications; {len(files) - len(rows)} families; {len(edges)} edges; {len(absent)} parent references outside CSV')


if __name__ == '__main__':
    build()
