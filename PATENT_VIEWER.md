# IBRX patent graph

Open `docs/patents/index.html` through an HTTP server. The shared site menu includes **Patent graph**.

```sh
python3 -m http.server 8874 --bind 127.0.0.1 --directory docs
```

Visit http://127.0.0.1:8874/patents/ . Static hosting under a URL prefix also works; no backend API is needed.

The UI comes from `/home/ben/GIT/topomorph/graph-viewer/dist-standalone`: its bundled Three.js renderer, force layout, controls, themes, camera interactions, and inspector, plus CSS. The host boot is replaced with `docs/js/patents/boot.js`. The import script strips the inline source map and retains bundled licenses. No source repository datasets, Python server, source editor service, or Obsidian plugin entry point are copied. Inactive helpers inside the upstream bundle remain vendored.

- `docs/patents/data/viewer.config.json`: title, settings defaults, independent browser-storage key.
- `docs/patents/data/manifest.json`: dataset path and available data controls.
- `docs/patents/data/patents.json`: graph and relationship ontology.
- `docs/patents/data/patents.details.json`: inspector fields.
- `docs/css/patents/`: copied UI styles and host styles.

Rebuild data after editing the CSV:

```sh
python3 python/build_patent_graph.py
python3 python/test_patent_graph.py
```

There are 988 application records, 579 explicit family-ID nodes, and 1,738 directed links. Every CSV column is preserved verbatim as a string in each application's source record and detail entry. Family links point from applications to their CSV family IDs. Parent links point from child to parent and retain the supplied relationship code. These are not citation links. The 220 parent references outside this CSV are retained in provenance and original records, but do not create invented application nodes. No date or file-size metrics are fabricated; those sizing values are zero. Link sizing uses incoming and outgoing relationship counts; family radii are doubled.

To refresh the UI bundle from the same source checkout or after changing the host adapter:

```sh
python3 python/import_patent_viewer.py
```

Browser regression test (server must be running on port 8874):

```sh
playwright-cli open http://127.0.0.1:8874/patents/
playwright-cli run-code --filename=tests/js/patent-viewer.js
```

Validated in Chromium: WebGL rendering, all node/link counts, filtering and restoration, node inspector/ontology, theme selection, settings persistence, desktop/mobile canvas resize, and visible failure for a missing dataset. Inspector selection uses the controller's real selection handler; it is not a synthetic canvas click test. Software WebGL emitted performance warnings; hardware GPU performance was not measured.

Topic tags are generated from `docs/patents/data/tag-rules.json`. These are title-based classifications, not verified CPC mappings. Applications may have multiple tags; family nodes inherit the union of their members' tags. Vague titles receive **Cancer therapeutics** when cancer is stated, otherwise **Other therapeutics**. The graph stores tags in both record metadata and the viewer's top-level `tags` field; the inspector also lists them in sidecar details.

All 13 categories appear under **Data → Tag Controls** by default. Selecting a tag focuses its nodes using the existing tag lens. Counts include applications and family nodes, not just patents. The v3 settings key initializes the updated view with tag display enabled and starfield disabled.

The page opens Data and keeps search visible when drawers close. Tag checkboxes support multiple selections (OR), persisted together. Label choices are Category (topic tags), Family (the literal word Family), and title (patent titles). Stored CPC metadata and CSV basenames remain unchanged. Hover details aggregate supplied applicant and date values.

`docs/js/patents/customizations.js` implements the host's rendering and inspector changes and is embedded by the import script. `viewer.config.json` controls branding, initial settings, 100px graph padding, family radius multiplier, inspector tabs, and hover fields. Framing includes all nodes, reserves the open Data panel on desktop, and disables the close-up introduction. At compact widths, the drawer overlays the graph. The File tab is omitted; empty field rows are omitted; patent URLs are clickable.

Inspector headers show only the patent title and close button. Hover cards and graph labels share a 340px wrapping limit; hover titles use 13px and graph labels use 11px. The application/family `.md` paths are synthetic graph identifiers, not Markdown documents. Rendered node JSON includes runtime graph fields and differs from the raw dataset record.

## Portfolio overview

`docs/patent-overview.html` provides category counts, annual filings stacked by recorded status, status counts, largest families, and a category-overlap matrix. The left tag checkboxes filter every chart using OR semantics; applications are deduplicated by their record ID. Clear all shows zero; Select all restores the full dataset. Clicking a category bar isolates that category. Family nodes never enter application totals. Missing filing dates are counted separately.

Data paths, status group mappings/colors, chart text, and family ranking limit live in `docs/data/patent-overview.config.json`. Unknown status values fail visibly until mapped. Status labels describe the source snapshot, not a fresh legal-status determination. Run `playwright-cli run-code --filename=tests/js/patent-overview.js` for source-count, filter, matrix, and responsive regression checks.
