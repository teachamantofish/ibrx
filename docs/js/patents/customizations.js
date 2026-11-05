/** Overview: Configured patent-specific presentation for the vendored graph UI. */

let patentLabelConfig;

/** Decode the multi-selection stored in the viewer's existing string setting. */
function patentSelectedTags(value) {
  if (value === null) return [];
  const tags = JSON.parse(value);
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) throw new Error('Invalid patent tag selection');
  return tags;
}

/** Install host presentation before constructing the graph controller. */
function configurePatentViewer(config, data, details) {
  patentLabelConfig = config.labels;
  document.documentElement.style.setProperty('--patent-label-width', `${config.labels.maxWidth}px`);
  document.documentElement.style.setProperty('--patent-label-font', `${config.labels.fontSize}px`);
  document.documentElement.style.setProperty('--patent-hover-title-font', `${config.labels.hoverTitleFontSize}px`);
  uiText_default['filter.placeholder'] = config.searchPlaceholder;
  uiText_default['filter.syntax'] = config.searchHint;
  const searchIndex = new Map(data.files.map(record => [record.path,
    [record.path, record.basename, record.metadata.title, record.metadata.type,
      ...record.tags, ...Object.values(details[record.path]).filter(value => typeof value === 'string')]
      .join(' ').toLowerCase()
  ]));
  /** Search patent data independently of the currently selected label mode. */
  matchesFilter = function matchesPatentSearch(record, query) {
    for (const term of query) {
      let text;
      if (term.field === 'file') text = record.basename.toLowerCase();
      else if (term.field === 'path') text = record.path.toLowerCase();
      else if (term.field === 'all') {
        text = searchIndex.has(record.path) ? searchIndex.get(record.path) : record.path.toLowerCase();
      } else throw new Error(`Unknown search field: ${term.field}`);
      if (text.includes(term.value) === term.negate) return false;
    }
    return true;
  };

  /** Preserve explicit filename/path restrictions when building excluded terms. */
  negateTerm = function negatePatentTerm(term) {
    const value = term.value.includes(' ') ? `"${term.value}"` : term.value;
    return `-${term.field === 'all' ? '' : term.field + ':'}${value}`;
  };

  const connectedPaths = new Set();
  for (const [source, targets] of Object.entries(data.resolvedLinks)) {
    if (Object.keys(targets).length) connectedPaths.add(source);
    for (const target of Object.keys(targets)) connectedPaths.add(target);
  }
  const hasOrphans = data.files.some(record => !connectedPaths.has(record.path));
  const hasUnresolved = Object.values(data.unresolvedLinks).some(targets => Object.keys(targets).length > 0);
  const buildFilters = ControlPanel.prototype.buildFilterSection;
  /** Omit controls that cannot affect the full loaded dataset, regardless of current search. */
  ControlPanel.prototype.buildFilterSection = function buildPatentFilters(body, callbacks) {
    buildFilters.call(this, body, callbacks);
    const row = this.orphanBtn.parentElement;
    if (!hasOrphans) this.orphanBtn.remove();
    if (!hasUnresolved) this.unresolvedBtn.remove();
    if (!hasOrphans && !hasUnresolved) row.remove();
  };

  const originalShow = SourcePanel.prototype.show;
  /** Keep only the patent title and close button in the inspector header. */
  SourcePanel.prototype.show = function showPatentInspector(node, callbacks) {
    const record = details[node.id];
    originalShow.call(this, {...node, name: record ? record.title : node.name}, callbacks);
    const head = this.root.querySelector('.gx-source-head');
    for (const child of [...head.children]) {
      if (!child.classList.contains('gx-source-title-row')) child.remove();
    }
  };

  for (const preset of STYLE_PRESETS) preset.starfield = config.settings.showStarfield;
  uiText_default['brand.name'] = config.brand;
  uiText_default['brand.sub'] = config.subtitle;
  uiText_default['size.links'] = config.linkSizeLabel;
  inspector_default.tabs = inspector_default.tabs.filter(tab => config.inspectorTabs.includes(tab.id));

  /** Use node identity, not repeated display text or centrality roots, for label eligibility. */
  GraphController.prototype.applyLabelVisibility = function patentLabelVisibility() {
    if (!this.overlay) return;
    this.overlay.patentLabelMode = this.settings.labelField;
    this.overlay.setLabelVisibility(this.settings.labelShowAll, {}, {l1:[], l2:[], l3:[]});
  };

  /** Family mode labels every family; other modes consider every nonempty node label. */
  OverlayManager.prototype.labelIndices = function patentLabelIndices() {
    if (!this.labelShowAll) return [];
    return this.data.nodes.flatMap((node, index) => {
      const eligible = this.patentLabelMode === 'filename' ? node.id.startsWith('families/') : Boolean(node.name);
      return eligible && !node.unresolved ? [index] : [];
    });
  };

  const rebuildLabels = OverlayManager.prototype.rebuildLabels;
  /** Cache label measurements once per rebuild and expose their backing node for QA. */
  OverlayManager.prototype.rebuildLabels = function rebuildPatentLabels() {
    rebuildLabels.call(this);
    for (const label of this.hubEls) {
      label.el.dataset.nodeId = this.data.nodes[label.index].id;
      label.width = label.el.offsetWidth;
      label.height = label.el.offsetHeight;
    }
  };

  const updateOverlay = OverlayManager.prototype.update;
  /** Anchor labels to projected nodes; suppress overlapping Category/Title labels, never families. */
  OverlayManager.prototype.update = function updatePatentLabels(width, height) {
    updateOverlay.call(this, width, height);
    const occupied = [];
    for (const label of this.hubEls) {
      const point = this.renderer.projectNode(label.index, width, height);
      const x = point.x;
      const y = point.y - config.labels.nodeGap;
      const box = {left:x-label.width/2, right:x+label.width/2, top:y-label.height, bottom:y};
      const inside = !point.behind && box.right >= 0 && box.left <= width && box.bottom >= 0 && box.top <= height;
      const overlaps = this.patentLabelMode !== 'filename' && occupied.some(other =>
        box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
      const visible = inside && !overlaps;
      this.paint(label, visible ? '1' : '0', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
      if (visible) occupied.push(box);
    }
    // Persistent labels already cover selected neighbors; avoid a second overlapping label layer.
    for (const label of this.neighborEls) this.paint(label, '0', label.transform);
  };

  const originalSizes = relativeNodeSizes;
  /** Double family radii before applying the existing link-count ranking. */
  relativeNodeSizes = function patentNodeSizes(nodes, mode) {
    const sizes = originalSizes(nodes, mode);
    nodes.forEach((node, index) => {
      if (node.id.startsWith('families/')) sizes[index] *= config.familySizeMultiplier;
    });
    return sizes;
  };

  /** Keep the search toolbar available independently of drawer visibility. */
  ControlPanel.prototype.setToolbarVisible = function showPatentToolbar() {
    this.toolbar.hidden = false;
    this.shell.toggleClass('gx-toolbar-visible', true);
  };

  /** Toggle one selected tag while retaining all other selected tags. */
  toggleTagLens = function togglePatentTag(current, clicked) {
    const selected = new Set(patentSelectedTags(current));
    if (selected.has(clicked)) selected.delete(clicked);
    else selected.add(clicked);
    return selected.size ? JSON.stringify([...selected]) : null;
  };

  /** Highlight the union of selected categories and their internal relationships. */
  resolveTagLens = function resolvePatentTags(data, adjacency, showTags, requested) {
    if (!showTags || requested === null) return {id: null, focus: null};
    const selected = new Set(patentSelectedTags(requested).map(tag => tag.slice(4)));
    const nodeIndices = new Set();
    data.nodes.forEach((node, index) => {
      if (node.tags.some(tag => selected.has(tag))) nodeIndices.add(index);
    });
    const linkIndices = [];
    data.links.forEach((link, index) => {
      if (nodeIndices.has(link.source) && nodeIndices.has(link.target)) linkIndices.push(index);
    });
    return {id: requested, focus: {tagIndex: null, nodeIndices, linkIndices}};
  };

  /** Omit empty fields and make supplied patent URLs usable links. */
  SourcePanel.prototype.fields = function patentFields(parent, record) {
    const table = parent.createEl('table', {cls: 'gx-inspector-fields'});
    for (const [key, value] of Object.entries(record)) {
      const empty = value === undefined || value === null || value === '' ||
        (typeof value === 'string' && (!value.trim() || value.trim().toLowerCase() === 'none supplied')) ||
        (typeof value === 'object' && !Object.keys(value).length);
      if (empty) continue;
      const row = table.createEl('tr');
      row.createEl('th', {text: key, attr: {scope: 'row'}});
      const cell = row.createEl('td');
      if (key === 'url' && typeof value === 'string' && /^https?:\/\//i.test(value)) {
        cell.createEl('a', {text: value, attr: {href: value, target: '_blank', rel: 'noopener noreferrer'}});
      } else {
        const flat = typeof value !== 'object' || (Array.isArray(value) && value.every(item => typeof item === 'string' || typeof item === 'number'));
        cell.textContent = (flat ? detailValueText(value) : null) ?? JSON.stringify(value, null, 2);
      }
    }
  };

  /** Display one title followed by available applicant and date fields. */
  OverlayManager.prototype.setHover = function patentHover(index) {
    this.hoverIndex = index;
    this.hoverEl.empty();
    if (index < 0) { this.hoverEl.hide(); return; }
    const node = this.data.nodes[index];
    if (!node) throw new Error('Unknown hover node');
    const detail = this.cb.getNodeDetail(node.id);
    const title = node.id.startsWith('applications/') || node.id.startsWith('families/') ? node.metadata.title : node.name;
    this.hoverEl.createDiv({cls: 'gx-hover-name', text: title});
    if (detail) {
      for (const field of config.hoverFields) {
        if (detail[field.key]) this.hoverEl.createDiv({cls:'gx-hover-title', text:`${field.label}: ${detail[field.key]}`});
      }
    }
    this.hoverEl.show();
  };

  /** Fit all node extents, reserving configured blank margins and open-panel space. */
  GraphController.prototype.computeFraming = function framePatentGraph() {
    const renderer = this.renderer;
    const nodes = this.store.data.nodes;
    const center = new Vector3();
    const point = new Vector3();
    if (!nodes.length) return {center, radius: 1};
    nodes.forEach((_, index) => center.add(renderer.nodePosition(index, point)));
    center.divideScalar(nodes.length);
    let radius = 1;
    nodes.forEach((_, index) => {
      radius = Math.max(radius, renderer.nodePosition(index, point).distanceTo(center) + renderer.nodeRadius(index));
    });
    const width = this.contentEl.clientWidth;
    const height = this.contentEl.clientHeight;
    const panel = this.contentEl.querySelector('.gx-data-panel.is-open');
    const left = panel && width > config.compactWidth ? panel.getBoundingClientRect().right : config.railWidth;
    const top = config.toolbarBottom;
    const usableWidth = Math.max(1, width - left - 2 * config.graphPadding);
    const usableHeight = Math.max(1, height - top - 2 * config.graphPadding);
    renderer.camera.setViewOffset(width, height, -left / 2, -top / 2, width, height);
    return {center, radius: radius * Math.max(height / usableWidth, height / usableHeight)};
  };

  /** Use the full-graph framing on cached loads without an introductory close-up. */
  GraphController.prototype.playEstablishing = function establishPatentGraph() {
    const frame = this.computeFraming();
    this.director.setInitialFraming(frame.center, frame.radius);
  };
}
