"""Copy the graph UI with a static host, tag heading placement, and details-first inspector."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/home/ben/GIT/topomorph/graph-viewer/dist-standalone')
BUNDLE = ROOT / 'docs/js/patents/viewer.js'
CUSTOMIZATIONS = ROOT / 'docs/js/patents/customizations.js'
ADAPTER = ROOT / 'docs/js/patents/boot.js'


def main():
    """Retain bundled UI/libraries and licenses; remove the original host boot and source map."""
    bundle = (SOURCE / 'boot.js').read_text().split('//# sourceMappingURL=')[0]
    heading = '      dataBody.createDiv({ cls: "gx-dataset-group", text: uiText_default["panel.tagControls"] });\n'
    filters = '      this.buildFilterSection(dataBody, cb);\n'
    if bundle.count(heading + filters) != 1:
        raise ValueError('Expected exactly one tag heading before the filter section')
    bundle = bundle.replace(heading + filters, filters + heading)
    search_field = '      let field = "path";'
    if bundle.count(search_field) != 1:
        raise ValueError('Expected one default search field')
    bundle = bundle.replace(search_field, '      let field = "all";')
    checkbox = 'const active = this.settings.tagLens === tag.id;'
    if bundle.count(checkbox) != 1:
        raise ValueError('Expected one tag checkbox selection expression')
    bundle = bundle.replace(checkbox, 'const active = patentSelectedTags(this.settings.tagLens).includes(tag.id);')
    # Display choices are independent of the dataset's original filename and CPC metadata.
    label = 'name: !opts.labelField || opts.labelField === "filename" ? f.basename : f.metadata?.[opts.labelField] ?? "",'
    option = 'text: field, value: field'
    if bundle.count(label) != 1 or bundle.count(option) != 1:
        raise ValueError('Expected graph label and dropdown expressions')
    bundle = bundle.replace(label, 'name: !opts.labelField || opts.labelField === "filename" ? (f.path.startsWith("families/") ? f.metadata.title : "") : opts.labelField === "type" ? (f.tags ?? []).join(patentLabelConfig.separator) : f.metadata?.[opts.labelField] ?? "",')
    bundle = bundle.replace(option, 'text: patentLabelConfig.options[field], value: field')
    # Label choice enables its layer; hierarchy rings no longer limit patent labels.
    selection = '        s.labelField = select.value;'
    levels = '      for (const key of ["l1", "l2", "l3"]) mkLevel(key, dataControls_default.labelLevels[key]);'
    if bundle.count(selection) != 1 or bundle.count(levels) != 1:
        raise ValueError('Expected label selector and level controls')
    bundle = bundle.replace(selection, selection + '\n        s.labelShowAll = true;\n        setOn(showAllSw, true);')
    bundle = bundle.replace(levels, '')
    # Inspector tabs are an explicit host configuration, including omission of File.
    required_tabs = '      for (const id of Object.keys(renderers)) {\n        if (!ids.includes(id)) throw new Error(`Inspector config missing ${id} tab`);\n      }\n'
    file_pane = '      this.renderPane(panes.find((pane) => pane.id === "file"));'
    if bundle.count(required_tabs) != 1 or bundle.count(file_pane) != 1:
        raise ValueError('Expected inspector tab validation and file initialization')
    bundle = bundle.replace(required_tabs, '')
    bundle = bundle.replace(file_pane, '      const filePane = panes.find((pane) => pane.id === "file");\n      if (filePane) this.renderPane(filePane);')
    # Show patent details before graph metadata in the inspector Data tab.
    details = ('      parent.createEl("h3", { text: text.headings.details });\n'
               '      if (inspection.details) this.fields(parent, inspection.details);\n'
               '      else parent.createDiv({ text: inspector_default.emptyValue });\n')
    dataset = '      this.fields(parent, { [text.fieldLabels.dataset]: inspection.dataset, [text.fieldLabels.loadedAt]: inspection.loadedAt });'
    if bundle.count(details) != 1 or bundle.count(dataset) != 1:
        raise ValueError('Expected one inspector details section and dataset row')
    bundle = bundle.replace(details, '').replace(dataset, details + dataset)
    start = bundle.index('  // standalone/boot.ts\n')
    end = bundle.index('\n})();', start)
    BUNDLE.write_text('/** Overview: Vendored Galaxy View UI; static patent host from boot.js. */\n'
                      + bundle[:start] + CUSTOMIZATIONS.read_text() + ADAPTER.read_text() + bundle[end:])
    shutil.copyfile(SOURCE / 'styles.css', ROOT / 'docs/css/patents/viewer.css')


if __name__ == '__main__':
    main()
