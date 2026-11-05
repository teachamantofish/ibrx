/** Overview: Verify per-node family labels and anchored, non-overlapping category/title labels. */
async page => {
  await page.goto('http://127.0.0.1:8874/patents/');
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>document.getElementById('galaxy').galaxyController);
  const select=page.getByRole('combobox',{name:'Label configuration'});
  await select.selectOption('title');
  await select.selectOption('filename');
  await page.waitForFunction(()=>document.getElementById('galaxy').galaxyController.overlay.hubEls.length===579);
  const family=await page.evaluate(()=>{
    const c=document.getElementById('galaxy').galaxyController;
    const labels=c.overlay.hubEls;
    if(labels.some(label=>!c.store.data.nodes[label.index].id.startsWith('families/')||label.el.textContent!==c.store.data.nodes[label.index].metadata.title))throw new Error('Family labels have wrong nodes');
    if(new Set(labels.map(label=>label.el.dataset.nodeId)).size!==579)throw new Error('Repeated names collapsed');
    return labels.length;
  });
  const results={family};
  for(const mode of ['type','title']) {
    await select.selectOption(mode);
    await page.waitForTimeout(700);
    results[mode]=await page.evaluate(()=>{
      const c=document.getElementById('galaxy').galaxyController;
      c.overlay.update(innerWidth,innerHeight);
      const visible=c.overlay.hubEls.filter(label=>label.el.style.opacity==='1');
      if(visible.length<2)throw new Error('Missing visible labels');
      const boxes=visible.map(label=>label.el.getBoundingClientRect());
      for(let i=0;i<visible.length;i++) {
        const point=c.renderer.projectNode(visible[i].index,innerWidth,innerHeight);
        const box=boxes[i];
        if(Math.abs((box.left+box.right)/2-point.x)>1||Math.abs(box.bottom-(point.y-6))>1)throw new Error('Label detached from node');
        for(let j=i+1;j<boxes.length;j++) {
          const b=boxes[j];
          if(box.left<b.right-1&&box.right>b.left+1&&box.top<b.bottom-1&&box.bottom>b.top+1)throw new Error('Labels overlap');
        }
      }
      return {eligible:c.overlay.hubEls.length,visible:visible.length};
    });
  }
  return results;
}
