/** Overview: Config-driven patent charts; one OR category filter updates every aggregation. */
const CONFIG_PATH = 'data/patent-overview.config.json';

/** Fetch a required JSON resource and fail visibly on missing or malformed data. */
async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

/** Create an element using text content rather than interpolated HTML. */
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Count discrete values without double counting application records. */
function countBy(records, field) {
  const counts = new Map();
  for (const record of records) {
    const key = record[field];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** Draw accessible horizontal bars with exact visible values. */
function bars(host, entries, colors, onSelect) {
  const max = Math.max(1, ...entries.map(entry => entry[1]));
  if (!entries.length) host.append(element('p', 'empty', 'No applications in this selection.'));
  for (const [label, count] of entries) {
    const row = element(onSelect ? 'button' : 'div', 'bar-row');
    row.append(element('span', '', label));
    const track = element('span', 'bar-track');
    const fill = element('span', 'bar-fill');
    fill.style.setProperty('--width', `${count / max * 100}%`);
    if (colors[label]) fill.style.setProperty('--color', colors[label]);
    track.append(fill);
    row.append(track, element('span', 'bar-count', count));
    row.setAttribute('aria-label', `${label}: ${count} applications`);
    if (onSelect) {
      row.type = 'button';
      row.title = `Show only ${label}`;
      row.addEventListener('click', () => onSelect(label));
    }
    host.append(row);
  }
}

/** Draw mutually exclusive status stacks for each filing year. */
function years(host, records, config) {
  const dated = records.filter(record => record.year !== null);
  const counts = countBy(dated, 'year');
  const max = Math.max(1, ...counts.values());
  const scroll = element('div', 'year-scroll');
  const plot = element('div', 'year-plot');
  const presentYears = [...counts.keys()].map(Number);
  const calendarYears = presentYears.length ? Array.from({length:Math.max(...presentYears)-Math.min(...presentYears)+1}, (_,index)=>String(Math.min(...presentYears)+index)) : [];
  for (const year of calendarYears) {
    const column = element('div', 'year');
    const total = counts.get(year) || 0;
    column.append(element('span', 'year-total', total));
    const stack = element('div', 'year-stack');
    stack.style.setProperty('--height', `${total / max * 155}px`);
    const groups = countBy(dated.filter(record => record.year === year), 'status');
    column.setAttribute('aria-label', `${year}: ${total} applications`);
    for (const [status, color] of Object.entries(config.statusColors)) {
      const count = groups.get(status) || 0;
      if (!count) continue;
      const segment = element('div', 'year-segment');
      segment.style.setProperty('--height', `${count / total * 100}%`);
      segment.style.setProperty('--color', color);
      segment.title = `${year} · ${status}: ${count}`;
      stack.append(segment);
    }
    column.append(stack, element('span', 'year-label', year));
    plot.append(column);
  }
  if (!dated.length) host.append(element('p', 'empty', 'No dated applications in this selection.'));
  else { scroll.append(plot); host.append(scroll); }
  const legend = element('div', 'legend');
  for (const [status, color] of Object.entries(config.statusColors)) {
    const label = element('span');
    const swatch = element('i');
    swatch.style.setProperty('--color', color);
    label.append(swatch, document.createTextNode(status));
    legend.append(label);
  }
  host.append(legend, element('p', 'note', `${records.length - dated.length} applications have no filing date and are excluded from this chart.`));
}

/** Draw a symmetric overlap matrix; each application contributes once per category pair. */
function heatmap(host, records, tags) {
  const matrix = tags.map(a => tags.map(b => records.filter(record => record.tags.includes(a) && record.tags.includes(b)).length));
  const max = Math.max(1, ...matrix.flat());
  const scroll = element('div', 'matrix-scroll');
  const table = element('table');
  table.setAttribute('aria-label', 'Applications shared by category');
  const head = element('thead');
  const header = element('tr');
  header.append(element('th', '', 'Category'));
  tags.forEach(tag => { const th = element('th'); th.scope = 'col'; th.append(element('span', '', tag)); header.append(th); });
  head.append(header);
  const body = element('tbody');
  tags.forEach((tag, i) => {
    const row = element('tr');
    const label = element('th', '', tag); label.scope = 'row'; row.append(label);
    tags.forEach((other, j) => {
      const count = matrix[i][j];
      const cell = element('td', count ? '' : 'zero', count);
      cell.style.setProperty('--cell', count ? `hsl(188 60% ${15 + 24 * count / max}%)` : '#142136');
      cell.title = `${tag} × ${other}: ${count} applications`;
      cell.setAttribute('aria-label', cell.title);
      row.append(cell);
    });
    body.append(row);
  });
  table.append(head, body); scroll.append(table); host.append(scroll);
  return matrix;
}

/** Load validated source records, construct controls, and wire every chart to shared state. */
async function boot() {
  const config = await readJson(CONFIG_PATH);
  const [graph, rules] = await Promise.all([readJson(config.dataset), readJson(config.tags)]);
  const tags = [...rules.categories.map(rule => rule.tag), rules.unmatched.cancerTag, rules.unmatched.otherTag];
  const records = graph.files.filter(node => node.path.startsWith('applications/')).map(node => {
    const row = node.sourceRecord;
    if (!row.application_number || !node.tags.length || node.tags.some(tag => !tags.includes(tag))) throw new Error(`Invalid application ${node.path}`);
    if (!(row.status in config.statusMap)) throw new Error(`Unmapped status: ${row.status}`);
    if (row.filing_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.filing_date)) throw new Error(`Invalid filing date: ${row.filing_date}`);
    return {id:row.application_number, tags:[...new Set(node.tags)], year:row.filing_date ? row.filing_date.slice(0,4) : null, status:config.statusMap[row.status], family:row.family_id};
  });
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('Duplicate application records');
  const selected = new Set(tags);
  const controls = new Map();
  const hosts = new Map();
  for (const chart of config.charts) {
    const card = element('section', 'chart');
    card.id = chart.id;
    card.append(element('h2', '', chart.title), element('p', '', chart.note));
    const host = element('div', 'chart-content'); card.append(host); hosts.set(chart.id,host);
    document.getElementById('charts').append(card);
  }
  /** Apply one category as a shortcut from the category bar chart. */
  function isolate(tag) { selected.clear(); selected.add(tag); render(); }
  /** Recompute every chart from the same unique filtered applications. */
  function render() {
    controls.forEach((input, tag) => { input.checked = selected.has(tag); });
    const filtered = records.filter(record => record.tags.some(tag => selected.has(tag)));
    document.getElementById('message').textContent = `${filtered.length.toLocaleString()} of ${records.length.toLocaleString()} applications · ${selected.size} of ${tags.length} tags selected`;
    const families = countBy(filtered.filter(record => record.family), 'family');
    const metrics = document.getElementById('metrics'); metrics.replaceChildren();
    for (const [value, label] of [[filtered.length,'Applications in selection'],[families.size,'Families represented'],[filtered.filter(record=>record.year!==null).length,'Applications with filing dates']]) {
      const metric=element('div','metric');metric.append(element('strong','',value.toLocaleString()),element('span','',label));metrics.append(metric);
    }
    hosts.forEach(host=>host.replaceChildren());
    const categories=tags.map(tag=>[tag,filtered.filter(record=>record.tags.includes(tag)).length]).sort((a,b)=>b[1]-a[1]);
    bars(hosts.get('categories'),categories,{},isolate);
    years(hosts.get('years'),filtered,config);
    bars(hosts.get('statuses'),[...countBy(filtered,'status')].sort((a,b)=>b[1]-a[1]),config.statusColors);
    bars(hosts.get('families'),[...families].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,config.familyLimit),{});
    const matrix=heatmap(hosts.get('overlap'),filtered,tags);
    window.patentOverview={total:records.length,selected:[...selected],count:filtered.length,categories,statuses:Object.fromEntries(countBy(filtered,'status')),years:Object.fromEntries(countBy(filtered.filter(record=>record.year!==null),'year')),families:Object.fromEntries(families),matrix,tags};
  }
  for (const tag of tags) {
    const label=element('label','tag');const input=element('input');input.type='checkbox';input.checked=true;
    label.append(input,element('span','',tag),element('small','',records.filter(record=>record.tags.includes(tag)).length));
    input.addEventListener('change',()=>{if(input.checked)selected.add(tag);else selected.delete(tag);render();});
    controls.set(tag,input);document.getElementById('tags').append(label);
  }
  document.getElementById('all').addEventListener('click',()=>{tags.forEach(tag=>selected.add(tag));render();});
  document.getElementById('none').addEventListener('click',()=>{selected.clear();render();});
  render();
}

/** Report data/configuration failures without showing misleading empty charts. */
function showError(error) {
  const message=document.getElementById('message');message.textContent=`Unable to load overview: ${error.message}`;message.classList.add('error');
  document.querySelectorAll('button,input').forEach(control=>{control.disabled=true;});
  console.error(error);
}
void boot().catch(showError);
