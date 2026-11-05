/** Verify real toolbar search and measured CPC badge layout. */
async page => {
  await page.goto('http://127.0.0.1:8874/patents/');
  await page.waitForFunction(() => document.getElementById('galaxy').galaxyController);
  await page.setViewportSize({width:1440,height:900});
  const search = page.getByPlaceholder('Search patents…');
  await search.fill('multiple myeloma');
  await page.waitForFunction(() => {
    const nodes=document.getElementById('galaxy').galaxyController.store.data.nodes;
    return nodes.length>0 && nodes.every(n=>n.metadata.title.toLowerCase().includes('multiple myeloma'));
  });
  const found = await page.evaluate(() => {
    const c=document.getElementById('galaxy').galaxyController;
    const index=c.store.data.nodes.findIndex(n=>n.id.startsWith('applications/') && n.metadata.type);
    c.selectNode(index,false);
    return c.store.data.nodes.length;
  });
  const layout = await page.locator('.gx-source-head').evaluate(head => {
    if (head.children.length !== 1 || !head.firstElementChild.classList.contains('gx-source-title-row')) throw new Error('Inspector header is not title-only');
    return {titleOnly:true};
  });
  await page.screenshot({path:'/tmp/patent-cpc-fixed.png'});
  await page.evaluate(()=>document.getElementById('galaxy').galaxyController.clearSelection());
  await search.fill('zzzz-no-such-patent');
  await page.waitForFunction(()=>document.getElementById('galaxy').galaxyController.store.data.nodes.length===0);
  await search.fill('');
  await page.waitForFunction(()=>document.getElementById('galaxy').galaxyController.store.data.nodes.length===1567);
  return {titleSearchResults:found,layout,emptyAndReset:'passed'};
}
