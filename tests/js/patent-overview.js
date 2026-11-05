/** Overview: Verify chart counts against source data, shared filters, and responsive layout. */
async page => {
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:8874/patent-overview.html');
  await page.waitForFunction(()=>window.patentOverview);
  /** Compare rendered aggregates to independent source-record calculations. */
  async function verify() {
    return page.evaluate(async()=>{
      const data=await (await fetch('patents/data/patents.json')).json();
      const state=window.patentOverview;
      const rows=data.files.filter(n=>n.path.startsWith('applications/')&&n.tags.some(t=>state.selected.includes(t)));
      if(state.count!==rows.length)throw new Error('Filtered count mismatch');
      if(Object.values(state.statuses).reduce((a,b)=>a+b,0)!==rows.length)throw new Error('Status total mismatch');
      if(Object.values(state.years).reduce((a,b)=>a+b,0)!==rows.filter(n=>n.sourceRecord.filing_date).length)throw new Error('Year total mismatch');
      if(Object.values(state.families).reduce((a,b)=>a+b,0)!==rows.length)throw new Error('Family total mismatch');
      state.tags.forEach((a,i)=>state.tags.forEach((b,j)=>{
        const expected=rows.filter(n=>n.tags.includes(a)&&n.tags.includes(b)).length;
        if(state.matrix[i][j]!==expected)throw new Error('Overlap mismatch');
      }));
      if(document.querySelectorAll('#charts > section').length!==5)throw new Error('Missing charts');
      return rows.length;
    });
  }
  if(await verify()!==988)throw new Error('Initial total must exclude family nodes');
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  if(await verify()!==0)throw new Error('Clear all not empty');
  await page.getByRole('checkbox',{name:'AI & computer vision',exact:false}).check();
  const ai=await verify();
  await page.getByRole('checkbox',{name:'Biomanufacturing & automation',exact:false}).check();
  const combined=await verify();
  if(combined<ai)throw new Error('OR selection decreased count');
  await page.getByRole('button',{name:'Vaccines:',exact:false}).click();
  if(!(await page.evaluate(()=>window.patentOverview.selected.length===1&&window.patentOverview.selected[0]==='Vaccines')))throw new Error('Category click did not isolate');
  await verify();
  await page.getByRole('button',{name:'Select all',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Mobile page overflow');
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'/tmp/patent-overview.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  return {initial:988,ai,combined,charts:5,filters:'passed',matrix:'passed',mobile:'passed'};
}
