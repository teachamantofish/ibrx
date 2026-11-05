"""Check generated patent graph against the original CSV, including every source field."""
import csv
import json
import unittest
from build_patent_graph import SOURCE, OUTPUT, TAG_RULES, classify_title


class PatentGraphTest(unittest.TestCase):
    """Verify record preservation and explicit relationship integrity."""

    def test_topic_tags(self):
        """Check overlapping technologies, vague-title classes, and complete family inheritance."""
        rules = json.loads(TAG_RULES.read_text())
        examples = {
            'Methods of Treating Cancer': {'Cancer therapeutics'},
            'METHODS FOR TREATING NEOPLASIA': {'Cancer therapeutics'},
            'Methods of Treating Aging-Related Disorders': {'Other therapeutics'},
            'Oral Vaccine Formulations': {'Vaccines', 'Drug delivery & formulations'},
            'AUTOMATED CELL CULTURING AND HARVESTING DEVICE': {'Biomanufacturing & automation'},
            'Deep Learning Models For Tumor Evaluation': {'AI & computer vision'},
            'NK-92 CELLS IN COMBINATION THERAPY WITH CANCER DRUGS': {'Cell therapy'},
            'CD16HIGH CD57HIGH NK-92MI CELLS': {'Cell therapy'},
            'Object Storage And Access Management Systems And Methods': {'Cloud & data infrastructure'},
        }
        for title, expected in examples.items():
            with self.subTest(title=title):
                self.assertEqual(set(classify_title(title, rules)), expected)
        graph = json.loads((OUTPUT / 'patents.json').read_text())
        families = {}
        for node in graph['files']:
            self.assertTrue(node['tags'])
            self.assertEqual(node['tags'], node['metadata']['tags'])
            if node['path'].startswith('applications/'):
                families.setdefault(node['sourceRecord']['family_id'], set()).update(node['tags'])
        for node in graph['files']:
            if node['path'].startswith('families/'):
                self.assertEqual(set(node['tags']), families[node['sourceRecord']['family_id']])


    def test_source_and_relationships(self):
        """Require exact CSV records, family memberships, and in-dataset parent edges."""
        with SOURCE.open(newline='', encoding='utf-8-sig') as handle:
            rows = list(csv.DictReader(handle))
        graph = json.loads((OUTPUT / 'patents.json').read_text())
        applications = {row['application_number']: row for row in rows}
        actual = {node['sourceRecord']['application_number']: node['sourceRecord'] for node in graph['files']
                  if node['path'].startswith('applications/')}
        self.assertEqual(actual, applications)
        for node in graph['files']:
            self.assertEqual(node['basename'], SOURCE.name)
            if node['path'].startswith('applications/'):
                self.assertEqual(node['metadata']['type'], node['sourceRecord']['cpc'])
                self.assertEqual(node['metadata']['title'], node['sourceRecord']['title'])
            incident = sum(edge['source'] == node['path'] for edge in graph['typedEdges']) + sum(edge['target'] == node['path'] for edge in graph['typedEdges'])
            self.assertEqual(node['sizing']['links'], incident)
        expected = set()
        for row in rows:
            source = f"applications/{row['application_number']}.md"
            if row['family_id']:
                expected.add((source, f"families/{row['family_id']}.md", 'family-member'))
            if row['parent_applications']:
                for parent in row['parent_applications'].split('; '):
                    parent_id = parent.split('|')[0]
                    if parent_id in applications:
                        expected.add((source, f'applications/{parent_id}.md', 'parent-application'))
        self.assertEqual(expected, {(e['source'], e['target'], e['type']) for e in graph['typedEdges']})
        paths = {node['path'] for node in graph['files']}
        for source, target, _ in expected:
            self.assertIn(source, paths)
            self.assertIn(target, paths)
            self.assertEqual(graph['resolvedLinks'][source][target], 1)


if __name__ == '__main__':
    unittest.main()
