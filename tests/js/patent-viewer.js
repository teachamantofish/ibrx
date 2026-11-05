/** Overview: Browser smoke test for the static patent graph. Run via playwright-cli run-code. */
async (page) => {
  const errors = [];
  /** Capture runtime errors during the tested navigation. */
  function recordError(error) { errors.push(String(error)); }
  page.on('pageerror', recordError);
  /** Fail immediately when an observed UI state is incorrect. */
  function check(condition, message) { if (!condition) throw new Error(message); }
  await page.goto('http://127.0.0.1:8874/patents/');
  await page.evaluate(() => localStorage.removeItem('ibrx.patent-graph.settings.v3'));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController);
  const initial = await page.evaluate(() => {
    const c = document.getElementById('galaxy').galaxyController;
    return { nodes: c.store.data.nodes.length, links: c.store.data.links.length,
      lost: c.renderer.renderer.getContext().isContextLost() };
  });
  check(initial.nodes === 1567 && initial.links === 1738 && !initial.lost, 'Graph did not render completely');
  check(await page.locator('.gx-data-panel').evaluate(el => el.classList.contains('is-open')), 'Data panel not open on load');
  const expectedTags = await page.evaluate(async () => {
    const response = await fetch('data/tag-rules.json');
    if (!response.ok) throw new Error('Tag configuration missing');
    const rules = await response.json();
    return [...rules.categories.map(rule => rule.tag), rules.unmatched.cancerTag, rules.unmatched.otherTag].sort();
  });
  const visibleTags = await page.locator('.gx-tag-name').allTextContents();
  check(JSON.stringify(visibleTags.sort()) === JSON.stringify(expectedTags), 'Missing Tag Controls categories');
  const aiTag = page.locator('.gx-tag-check').filter({hasText:'AI & computer vision'}).locator('input');
  await aiTag.check();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController.settings.tagLens === JSON.stringify(['tag:AI & computer vision']));
  const vaccineTag = page.locator('.gx-tag-check').filter({hasText:'Vaccines'}).locator('input');
  await vaccineTag.check();
  check(await aiTag.isChecked() && await vaccineTag.isChecked(), 'Multiple tags not checked');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ibrx.patent-graph.settings.v3')).tagLens === JSON.stringify(['tag:AI & computer vision', 'tag:Vaccines']));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController);
  check(await aiTag.isChecked() && await vaccineTag.isChecked(), 'Multiple tags not persisted');
  await vaccineTag.uncheck();
  await aiTag.uncheck();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController.settings.tagLens === null);

  await page.getByRole('button', {name:'Data',exact:true}).click();
  check(await page.getByPlaceholder('Search patents…').isVisible(), 'Search hidden with closed Data');
  await page.getByRole('button', {name:'Data',exact:true}).click();
  await page.getByRole('combobox', {name:'Label configuration'}).selectOption('type');
  check(await page.evaluate(() => {
    const c = document.getElementById('galaxy').galaxyController;
    return c.store.data.nodes.every(node => node.name === node.tags.join(', '));
  }), 'Category labels do not use tags');
  await page.getByRole('combobox', {name:'Label configuration'}).selectOption('title');
  check(await page.evaluate(() => {
    const c = document.getElementById('galaxy').galaxyController;
    return c.store.data.nodes.every(node => node.name === node.metadata.title);
  }), 'Title labels do not use patent titles');
  await page.getByPlaceholder('Search patents…').fill('path:applications/09900379.md');
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController.store.data.nodes.length === 1);
  await page.getByPlaceholder('Search patents…').fill('');
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController.store.data.nodes.length === 1567);
  await page.getByRole('combobox', {name: 'Label configuration'}).selectOption('filename');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ibrx.patent-graph.settings.v3')).labelField === 'filename');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController?.settings.labelField === 'filename');
  check(await page.evaluate(() => document.getElementById('galaxy').galaxyController.store.data.nodes.every(node => node.name === 'Family')), 'Family labels incorrect');
  await page.evaluate(() => document.getElementById('galaxy').galaxyController.selectNode(0, false));
  await page.getByRole('tabpanel', {name: 'Data'}).getByRole('cell', {name:'7074904', exact:true}).waitFor();
  check(await page.getByRole('tab', {name:'File',exact:true}).count() === 0, 'File tab still present');
  check(await page.locator('.gx-inspector-fields td').filter({hasText:/^None supplied$/i}).count() === 0, 'Empty fields remain');
  check(await page.getByRole('link', {name:'https://patents.google.com/patent/US7074904',exact:true}).getAttribute('href') === 'https://patents.google.com/patent/US7074904', 'Patent URL not linked');
  const hover = await page.evaluate(() => {
    const c = document.getElementById('galaxy').galaxyController;
    c.overlay.setHover(0);
    return c.overlay.hoverEl.innerText;
  });
  check(hover.includes('Grant date: 2006-07-11') && hover.includes('Expiry date: 2016-01-12'), 'Hover dates missing');
  check(hover.split('MHC COMPLEXES AND USES THEREOF').length === 2, 'Hover title repeated');
  await page.getByRole('tab', {name:'Ontology', exact:true}).click();
  check(await page.getByRole('tabpanel', {name:'Ontology'}).innerText().then(text => text.includes('parent-application')), 'Ontology missing');
  await page.evaluate(() => document.getElementById('galaxy').galaxyController.clearSelection());
  await page.getByRole('button', {name: 'Themes', exact: true}).click();
  await page.locator('select').filter({has:page.locator('option[value="minimal"]')}).selectOption('minimal');
  await page.setViewportSize({width: 390, height: 844});
  await page.waitForFunction(() => document.querySelector('canvas').getBoundingClientRect().width === 390);
  check(await page.getByRole('button', {name:'Themes', exact:true}).isVisible(), 'Mobile rail missing');
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(() => localStorage.removeItem('ibrx.patent-graph.settings.v3'));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController);
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController.layout.isSettled());
  await page.waitForTimeout(1600);
  const presentation = await page.evaluate(() => {
    const c = document.getElementById('galaxy').galaxyController;
    const nodes = c.store.data.nodes;
    const points = nodes.map((node, index) => c.renderer.projectNode(index, innerWidth, innerHeight));
    const padding = [Math.min(...points.map(p => p.x)), innerWidth - Math.max(...points.map(p => p.x)), Math.min(...points.map(p => p.y)), innerHeight - Math.max(...points.map(p => p.y))];
    const family = nodes.findIndex(n => n.id.startsWith('families/') && n.degree === 1);
    const application = nodes.findIndex(n => n.id.startsWith('applications/') && n.degree === 1);
    const bigger = nodes.findIndex(n => n.id.startsWith('families/') && n.degree > 1);
    return {padding, starfield:c.renderer.starfieldEnabled, double:c.renderer.nodeRadius(family) / c.renderer.nodeRadius(application), grows:c.renderer.nodeRadius(bigger) > c.renderer.nodeRadius(family)};
  });
  check(presentation.padding.every(value => value >= 100), 'Graph padding under 100px: ' + presentation.padding);
  check(!presentation.starfield && presentation.double === 2 && presentation.grows, 'Starfield or family sizing incorrect');
  check(await page.title() === 'ImmunityBio Patent Galaxy: knowledge graph database', 'Page title incorrect');
  check(errors.length === 0, errors.join('\n'));
  page.off('pageerror', recordError);
  return { ...initial, tags: 'passed', filter: 'passed', inspector: 'passed', persistence: 'passed', themes: 'passed', resize: 'passed' };
}
