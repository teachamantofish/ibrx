/** Overview: Static patent host and the shared site page links, embedded by the import script. */
installDomExtensions();

/** Fetch a required JSON resource; report malformed or missing resources as errors. */
async function readPatentJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

/** Mount the copied graph controls, renderer, and inspector using local configuration. */
async function bootPatents() {
  const config = await readPatentJson('data/viewer.config.json');
  document.title = config.title;
  const mount = document.getElementById('galaxy');
  if (!mount) throw new Error('Missing #galaxy mount');
  const { data, sourcePath, datasetUi } = await loadGraphSource();
  const details = await readPatentJson(sourcePath.replace(/\.json$/, '.details.json'));
  configurePatentViewer(config, data, details);
  const saved = localStorage.getItem(config.storageKey);
  const settings = mergeSettings(saved === null ? config.settings : JSON.parse(saved));
  /** Persist changes under this viewer's independent key. */
  function save() { localStorage.setItem(config.storageKey, JSON.stringify(settings)); }
  const controller = new GraphController(new FakeApp(data), mount, settings, save, datasetUi);
  controller.setNodeDetails(details);
  controller.setInspector(createInspector(data, sourcePath, details));
  await controller.start();
  const rail = mount.querySelector('.gx-rail');
  if (!rail) throw new Error('Missing galaxy menu rail');
  addSitePages(rail, controller.panel.dataRailBtn);
  if (config.openDataPanel) controller.panel.toggleDataDrawer();
  controller.panel.setToolbarVisible(true);
  const frame = controller.computeFraming();
  controller.director.setInitialFraming(frame.center, frame.radius);
  controller.setIndexCounts(1, data.files.length);
  mount.galaxyController = controller;
  /** Match the canvas to its current viewport. */
  function resize() {
    controller.resize();
    const frame = controller.computeFraming();
    controller.director.setInitialFraming(frame.center, frame.radius);
  }
  window.addEventListener('resize', resize);
  const host = controller.getDatasetPanelHost();
  if (!host) throw new Error('Missing dataset controls');
  await mountDatasetPicker(host, false);
}

/** Put the site's shared page links (js/sidenav.js) at the top of the rail, above Data and Themes. */
function addSitePages(rail, firstTool) {
  if (!window.SIDENAV) throw new Error('Missing js/sidenav.js page list');
  for (const page of window.SIDENAV.pages) {
    const link = document.createElement('a');
    link.className = 'gx-rail-item' + (page.id === 'patents' ? ' gx-rail-current' : '');
    link.href = '../' + page.href;
    link.title = page.label;
    link.setAttribute('aria-label', page.label);
    if (page.id === 'patents') link.setAttribute('aria-current', 'page');
    const glyph = document.createElement('span');
    glyph.className = 'gx-rail-glyph';
    glyph.innerHTML = window.SIDENAV.svg(page.icon);
    glyph.firstChild.classList.add('gx-rail-icon');
    const label = document.createElement('span');
    label.className = 'gx-rail-label';
    label.textContent = page.label;
    link.append(glyph, label);
    rail.insertBefore(link, firstTool);
  }
  const divider = document.createElement('div');
  divider.className = 'gx-rail-sep';
  rail.insertBefore(divider, firstTool);
}

/** Show startup failures without inserting error strings as HTML. */
function showPatentError(error) {
  console.error(error);
  const message = document.createElement('pre');
  message.className = 'patent-error';
  message.textContent = error.stack || error.message;
  document.body.replaceChildren(message);
}
void bootPatents().catch(showPatentError);
