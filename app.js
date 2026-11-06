const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);
let activeDays = 7;
let sourceFilter = 'all';
let importedRecords = null;
let demoRecords = buildDemoRecords();
let toastTimer;

const $ = selector => document.querySelector(selector);
const numberFormat = new Intl.NumberFormat();

function buildDemoRecords() {
  const rows = [];
  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    const wave = Math.sin(offset * 1.27);
    const steps = Math.round(7100 + wave * 1850 + ((offset * 391) % 1400));
    rows.push({ date, metric: 'steps', value: steps, source: 'Pitta’s Apple Watch' });
    rows.push({ date, metric: 'energy', value: Math.round(385 + wave * 68 + ((offset * 13) % 48)), source: 'Pitta’s Apple Watch' });
    rows.push({ date, metric: 'exercise', value: Math.round(32 + wave * 11 + ((offset * 7) % 17)), source: 'Pitta’s Apple Watch' });
    rows.push({ date, metric: 'restingHeartRate', value: Math.round(61 + Math.cos(offset * .74) * 3 + ((offset * 3) % 3)), source: 'Pitta’s Apple Watch' });
    rows.push({ date, metric: 'sleep', value: Math.round((6.8 + Math.sin(offset * .61) * .8 + ((offset * 9) % 8) / 20) * 60) / 60, source: 'Pitta’s Apple Watch' });
  }
  return rows;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateLabel(date, options = { weekday: 'short' }) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
function recordsInScope() {
  const records = importedRecords || demoRecords;
  return sourceFilter === 'watch' ? records.filter(record => /watch/i.test(record.source || '')) : records;
}
function aggregateDays(records) {
  const map = new Map();
  for (const record of records) {
    const key = dateKey(record.date);
    if (!map.has(key)) map.set(key, { date: new Date(record.date), steps: 0, energy: 0, exercise: 0, heartValues: [], sleep: 0 });
    const day = map.get(key);
    if (record.metric === 'steps') day.steps += record.value;
    if (record.metric === 'energy') day.energy += record.value;
    if (record.metric === 'exercise') day.exercise += record.value;
    if (record.metric === 'restingHeartRate' || (record.metric === 'heartRate' && day.heartValues.length === 0)) day.heartValues.push(record.value);
    if (record.metric === 'sleep') day.sleep += record.value;
  }
  return [...map.values()].sort((a, b) => a.date - b.date);
}
function average(values) {
  const valid = values.filter(value => Number.isFinite(value) && value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
function percentageChange(current, previous, invert = false) {
  if (!current || !previous) return null;
  const change = ((current - previous) / previous) * 100;
  const display = `${change > 0 ? '+' : ''}${Math.round(change)}%`;
  return { display, good: invert ? change <= 0 : change >= 0 };
}
function setText(selector, value) { $(selector).textContent = value; }
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function drawSparkline(container, values, color) {
  container.replaceChildren();
  if (values.length < 2 || values.every(value => !value)) return;
  const width = 180, height = 28, pad = 3;
  const valid = values.map(value => value || 0);
  const min = Math.min(...valid), max = Math.max(...valid) || min + 1;
  const points = valid.map((value, index) => `${pad + index * (width - pad * 2) / (valid.length - 1)},${height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const line = document.createElementNS(svg.namespaceURI, 'polyline');
  line.setAttribute('points', points); line.setAttribute('fill', 'none'); line.setAttribute('stroke', color); line.setAttribute('stroke-width', '2'); line.setAttribute('stroke-linecap', 'round'); line.setAttribute('stroke-linejoin', 'round');
  svg.append(line); container.append(svg);
}
function drawStepsChart(days) {
  const root = $('#steps-chart'); root.replaceChildren();
  const width = 620, height = 170, left = 40, top = 10, bottom = 28, plotHeight = height - top - bottom;
  const maxValue = Math.max(10000, Math.ceil(Math.max(...days.map(day => day.steps), 0) / 2000) * 2000);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('preserveAspectRatio', 'none');
  for (let tick = 0; tick <= 4; tick++) {
    const y = top + plotHeight * tick / 4;
    const line = document.createElementNS(svg.namespaceURI, 'line'); line.setAttribute('x1', String(left)); line.setAttribute('x2', String(width)); line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y)); line.setAttribute('class', 'chart-grid-line'); svg.append(line);
    const label = document.createElementNS(svg.namespaceURI, 'text'); label.setAttribute('x', '0'); label.setAttribute('y', String(y + 3)); label.setAttribute('class', 'chart-label'); label.textContent = `${Math.round(maxValue * (4 - tick) / 4 / 1000)}k`; svg.append(label);
  }
  const slot = (width - left - 8) / Math.max(days.length, 1), barWidth = Math.min(22, slot * .54);
  days.forEach((day, index) => {
    const x = left + index * slot + (slot - barWidth) / 2;
    const barHeight = Math.max(2, day.steps / maxValue * plotHeight);
    const bar = document.createElementNS(svg.namespaceURI, 'rect'); bar.setAttribute('x', String(x)); bar.setAttribute('y', String(top + plotHeight - barHeight)); bar.setAttribute('width', String(barWidth)); bar.setAttribute('height', String(barHeight)); bar.setAttribute('class', `chart-bar${index === days.length - 1 ? ' active' : ''}`); bar.setAttribute('rx', '4');
    const title = document.createElementNS(svg.namespaceURI, 'title'); title.textContent = `${dateLabel(day.date, { month: 'short', day: 'numeric' })}: ${numberFormat.format(day.steps)} steps`; bar.append(title); svg.append(bar);
    if (index % (days.length > 12 ? 5 : 1) === 0 || index === days.length - 1) {
      const text = document.createElementNS(svg.namespaceURI, 'text'); text.setAttribute('x', String(x + barWidth / 2)); text.setAttribute('y', String(height - 5)); text.setAttribute('text-anchor', 'middle'); text.setAttribute('class', 'chart-label'); text.textContent = dateLabel(day.date); svg.append(text);
    }
  });
  root.append(svg);
}
function renderSleepWeek(days) {
  const root = $('#sleep-week'); root.replaceChildren();
  const recent = days.slice(-7);
  const maxHours = Math.max(8, ...recent.map(day => day.sleep));
  recent.forEach(day => {
    const bar = document.createElement('div'); bar.className = 'sleep-day';
    const fill = document.createElement('i'); fill.style.height = `${Math.max(4, day.sleep / maxHours * 34)}px`; fill.title = `${day.sleep.toFixed(1)} hours`;
    const label = document.createElement('small'); label.textContent = dateLabel(day.date).slice(0, 1);
    bar.append(fill, label); root.append(bar);
  });
}
function render() {
  const allDays = aggregateDays(recordsInScope());
  const visible = allDays.slice(-activeDays);
  const previous = allDays.slice(-activeDays * 2, -activeDays);
  const meanSteps = average(visible.map(day => day.steps));
  const meanEnergy = average(visible.map(day => day.energy));
  const meanExercise = average(visible.map(day => day.exercise));
  const meanHeart = average(visible.map(day => average(day.heartValues)));
  const meanSleep = average(visible.map(day => day.sleep));
  const oldSteps = average(previous.map(day => day.steps));
  const oldHeart = average(previous.map(day => average(day.heartValues)));

  setText('#steps-value', meanSteps == null ? '—' : numberFormat.format(Math.round(meanSteps)));
  setText('#energy-value', meanEnergy == null ? '—' : numberFormat.format(Math.round(meanEnergy)));
  setText('#exercise-value', meanExercise == null ? '—' : Math.round(meanExercise));
  setText('#heart-value', meanHeart == null ? '—' : Math.round(meanHeart));
  setText('#sleep-value', meanSleep == null ? '—' : meanSleep.toFixed(1));
  const stepChange = percentageChange(meanSteps, oldSteps);
  const heartChange = percentageChange(meanHeart, oldHeart, true);
  setText('#steps-change', stepChange ? stepChange.display : 'NEW');
  setText('#heart-change', heartChange ? heartChange.display : 'NEW');
  $('#steps-change').className = `trend-chip${stepChange?.good ? '' : ' negative'}`;
  $('#heart-change').className = `trend-chip${heartChange?.good ? '' : ' negative'}`;
  $('#energy-meter').style.width = `${Math.min(100, (meanEnergy || 0) / 700 * 100)}%`;
  $('#exercise-meter').style.width = `${Math.min(100, (meanExercise || 0) / 60 * 100)}%`;
  setText('#exercise-goal', meanExercise == null ? 'daily average' : `${Math.round((meanExercise / 30) * 100)}% of 30 min goal`);
  const sleepPercent = meanSleep ? Math.min(100, meanSleep / 8 * 100) : 0;
  $('#sleep-ring').style.strokeDashoffset = String(308 * (1 - sleepPercent / 100));
  setText('#sleep-consistency', meanSleep == null ? 'No sleep data' : meanSleep >= 7.5 ? 'Steady recovery' : meanSleep >= 6.5 ? 'Room to recharge' : 'Short nights lately');
  const shownDates = visible.map(day => day.date);
  setText('#date-range', shownDates.length ? `${dateLabel(shownDates[0], { month: 'short', day: 'numeric' })} — ${dateLabel(shownDates[shownDates.length - 1], { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No dates in this range');
  const best = visible.reduce((winner, day) => !winner || day.steps > winner.steps ? day : winner, null);
  setText('#best-day', best ? dateLabel(best.date, { weekday: 'short' }) : '—');
  setText('#step-total', numberFormat.format(visible.reduce((sum, day) => sum + day.steps, 0)));
  drawStepsChart(visible);
  drawSparkline($('#steps-sparkline'), visible.map(day => day.steps), '#5a805f');
  drawSparkline($('#heart-sparkline'), visible.map(day => average(day.heartValues)), '#c77980');
  renderSleepWeek(visible);
  renderInsight(visible, meanSteps, meanSleep, meanExercise);
  setText('#data-status', importedRecords ? `Imported data · ${allDays.length} days` : 'Sample data · 30 days');
  setText('#source-note', importedRecords ? 'LOCAL INSIGHT' : 'DEMO INSIGHT');
  $('.activity-panel').setAttribute('aria-label', `Movement analytics, ${visible.length} days`);
}
function renderInsight(days, steps, sleep, exercise) {
  const weekdays = days.filter(day => ![0, 6].includes(day.date.getDay()));
  const weekends = days.filter(day => [0, 6].includes(day.date.getDay()));
  const weekdaySteps = average(weekdays.map(day => day.steps));
  const weekendSteps = average(weekends.map(day => day.steps));
  let message = 'Your recent data is ready to explore. Keep checking in to spot patterns over time.';
  if (steps == null) message = 'No matching records found. Try “All sources” or import an Apple Health export.';
  else if (weekendSteps && weekdaySteps && weekendSteps > weekdaySteps * 1.12) message = `You move more on weekends: ${numberFormat.format(Math.round(weekendSteps - weekdaySteps))} extra steps per day on average.`;
  else if (sleep != null && sleep >= 7.5 && exercise != null && exercise >= 30) message = 'Your week pairs regular movement with a solid sleep average. A steady rhythm is taking shape.';
  else if (sleep != null && sleep < 6.5) message = 'Your average sleep is under 6.5 hours. This is a pattern to notice, not a diagnosis.';
  setText('#insight-text', message);
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const split = line => {
    const cells = []; let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
      else cell += char;
    }
    cells.push(cell.trim()); return cells;
  };
  const headers = split(lines.shift()).map(value => value.toLowerCase().replace(/[\s-]+/g, '_'));
  const rows = lines.map(split);
  const index = names => headers.findIndex(header => names.includes(header));
  const dateCol = index(['date', 'day', 'start_date', 'startdate']);
  if (dateCol < 0) throw new Error('CSV must have a date column.');
  const map = [
    { metric: 'steps', names: ['steps', 'step_count'] },
    { metric: 'energy', names: ['active_energy', 'active_energy_kcal', 'energy_kcal', 'activeenergyburned'] },
    { metric: 'exercise', names: ['exercise_minutes', 'exercise_min', 'exercise_time'] },
    { metric: 'restingHeartRate', names: ['resting_heart_rate', 'resting_hr', 'restingheartrate'] },
    { metric: 'sleep', names: ['sleep_hours', 'sleep_duration_hours', 'sleep'] }
  ];
  const records = [];
  for (const row of rows) {
    const date = new Date(row[dateCol]); if (Number.isNaN(date.getTime())) continue;
    for (const item of map) {
      const col = index(item.names); if (col < 0) continue;
      const value = Number(row[col]); if (!Number.isFinite(value) || value <= 0) continue;
      records.push({ date, metric: item.metric, value, source: row[index(['source', 'source_name', 'sourcename'])] || 'Imported CSV' });
    }
  }
  if (!records.length) throw new Error('No supported health metrics were found in the CSV.');
  return records;
}
function parseAppleHealthXml(xml) {
  const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
  if (documentXml.querySelector('parsererror')) throw new Error('Could not read this XML export.');
  const records = [];
  const types = {
    HKQuantityTypeIdentifierStepCount: 'steps',
    HKQuantityTypeIdentifierActiveEnergyBurned: 'energy',
    HKQuantityTypeIdentifierAppleExerciseTime: 'exercise',
    HKQuantityTypeIdentifierRestingHeartRate: 'restingHeartRate',
    HKQuantityTypeIdentifierHeartRate: 'heartRate'
  };
  documentXml.querySelectorAll('Record').forEach(node => {
    const type = node.getAttribute('type');
    const metric = types[type];
    if (!metric) return;
    const rawDate = node.getAttribute('startDate');
    const date = new Date(rawDate);
    const value = Number(node.getAttribute('value'));
    if (Number.isNaN(date.getTime()) || !Number.isFinite(value)) return;
    const unit = (node.getAttribute('unit') || '').toLowerCase();
    let normalized = value;
    if (metric === 'energy' && unit.includes('kj')) normalized *= .239006;
    if ((metric === 'heartRate' || metric === 'restingHeartRate') && unit !== 'count/min') return;
    records.push({ date, metric, value: normalized, source: node.getAttribute('sourceName') || 'Apple Health' });
  });
  documentXml.querySelectorAll('Record[type="HKCategoryTypeIdentifierSleepAnalysis"]').forEach(node => {
    const valueName = node.getAttribute('value') || '';
    if (!/asleep/i.test(valueName) || /in.?bed|awake/i.test(valueName)) return;
    const start = new Date(node.getAttribute('startDate'));
    const end = new Date(node.getAttribute('endDate'));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;
    const source = node.getAttribute('sourceName') || 'Apple Health';
    records.push({ date: start, metric: 'sleep', value: (end - start) / 3600000, source });
  });
  if (!records.length) throw new Error('No supported activity, heart-rate, or sleep records were found.');
  return records;
}
async function importHealthFile(file) {
  try {
    const content = await file.text();
    importedRecords = file.name.toLowerCase().endsWith('.xml') ? parseAppleHealthXml(content) : parseCsv(content);
    render();
    showToast(`Loaded ${numberFormat.format(importedRecords.length)} readings locally.`);
  } catch (error) {
    importedRecords = null;
    render();
    showToast(error.message || 'Could not read that file.');
  }
}

$('#import-button').addEventListener('click', () => $('#health-file').click());
$('#health-file').addEventListener('change', event => {
  const file = event.target.files && event.target.files[0];
  if (file) importHealthFile(file);
  event.target.value = '';
});
$('#reset-demo').addEventListener('click', () => { importedRecords = null; sourceFilter = 'all'; $('#source-filter').value = 'all'; render(); showToast('Demo data restored.'); });
$('.range-tabs').addEventListener('click', event => {
  const button = event.target.closest('button[data-days]'); if (!button) return;
  activeDays = Number(button.dataset.days);
  document.querySelectorAll('.range-button').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  render();
});
$('#source-filter').addEventListener('change', event => { sourceFilter = event.target.value; render(); });
render();
