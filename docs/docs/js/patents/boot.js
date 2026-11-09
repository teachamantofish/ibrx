/** Overview: Static patent host and configured timeline navigation, embedded by the import script. */
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
  const timeline = rail.createEl('a', {cls:'gx-rail-item', attr:{href:config.timelineLink.href, 'aria-label':config.timelineLink.label, title:config.timelineLink.label}});
  timeline.createSpan({cls:'gx-rail-glyph'}).appendChild(svgIcon(config.timelineLink.icon));
  timeline.createSpan({cls:'gx-rail-label', text:config.timelineLink.label});
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

/** Show startup failures without inserting error strings as HTML. */
function showPatentError(error) {
  console.error(error);
  const message = document.createElement('pre');
  message.className = 'patent-error';
  message.textContent = error.stack || error.message;
  document.body.replaceChildren(message);
}
void bootPatents().catch(showPatentError);
