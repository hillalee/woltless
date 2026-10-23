(function () {
  'use strict';

  const STORE_KEY = 'woltless-v1';
  const DEFAULT_PLACES = ["McDonald's", 'ג׳פניקה', 'Pizza Hut', 'בורגרסאלון', 'טאיזו', 'שווארמה מיקי'];
  const ORDINALS = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני', 'התשיעי', 'העשירי'];
  const MAX_AMOUNT = 2000;

  const hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.Flip) gsap.registerPlugin(Flip);

  let motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hasGsap) {
    gsap.matchMedia().add({ reduce: '(prefers-reduced-motion: reduce)' }, (context) => {
      motionOK = !context.conditions.reduce;
    });
  }
  const animate = () => hasGsap && motionOK;

  // Food bursts: decorative only, hidden from assistive tech and skipped under reduced motion

  const FOOD = ['🍔', '🍕', '🍣', '🌮', '🍜', '🥙', '🍟', '🥗', '🍩', '🧋'];
  const PLACE_FOOD = [
    [/mcdonald|בורגר|burger|מקדונלד/i, '🍔'],
    [/pizza|פיצה/i, '🍕'],
    [/ג׳פניקה|ג'פניקה|סושי|sushi/i, '🍣'],
    [/טאיזו|ראמן|נודלס|thai|תאי/i, '🍜'],
    [/שווארמה|פלאפל|shawarma/i, '🥙'],
    [/טאקו|taco|מקסיק/i, '🌮'],
    [/גלידה|קינוח|דונאט|donut/i, '🍩']
  ];

  function foodFor(place) {
    const match = PLACE_FOOD.find(([pattern]) => pattern.test(place || ''));
    return match ? match[1] : null;
  }

  // A manual popover joins the top layer above any open dialog, so bursts show over sheets too
  const burstLayer = document.createElement('div');
  burstLayer.className = 'burst-layer';
  burstLayer.setAttribute('aria-hidden', 'true');
  const canPopover = typeof burstLayer.showPopover === 'function';
  if (canPopover) burstLayer.setAttribute('popover', 'manual');
  document.body.appendChild(burstLayer);
  let liveBursts = 0;

  function raiseBurstLayer() {
    if (!canPopover) return;
    if (burstLayer.matches(':popover-open')) burstLayer.hidePopover();
    burstLayer.showPopover();
  }

  function burst(origin, emojis, count = 10) {
    if (!animate() || !origin) return;
    const box = origin.getBoundingClientRect();
    if (!box.width && !box.height) return;
    raiseBurstLayer();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const pool = Array.isArray(emojis) ? emojis : [emojis];
    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'food-burst';
      piece.textContent = pool[index % pool.length];
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      burstLayer.appendChild(piece);
      liveBursts += 1;
      const angle = (Math.PI * 2 * index) / count + gsap.utils.random(-0.3, 0.3);
      const distance = gsap.utils.random(60, 130);
      gsap.timeline({
        onComplete: () => {
          piece.remove();
          liveBursts -= 1;
          if (!liveBursts && canPopover && burstLayer.matches(':popover-open')) burstLayer.hidePopover();
        }
      })
        .fromTo(piece,
          { xPercent: -50, yPercent: -50, scale: 0.3, rotation: 0, autoAlpha: 1 },
          { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 30, scale: gsap.utils.random(0.9, 1.4), rotation: gsap.utils.random(-60, 60), duration: 0.55, ease: 'power3.out' })
        .to(piece, { y: '+=60', autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, '>-0.1');
    }
  }

  // Dates are kept as local YYYY-MM-DD strings.

  function toISO(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function fromISO(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(iso, count) {
    const date = fromISO(iso);
    date.setDate(date.getDate() + count);
    return toISO(date);
  }

  function daysBetween(fromIso, toIso) {
    const from = fromISO(fromIso);
    const to = fromISO(toIso);
    const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((utcTo - utcFrom) / 86400000);
  }

  function shortDate(iso) {
    const date = fromISO(iso);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  }

  const today = () => toISO(new Date());

  const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });
  const money = (value) => `₪${numberFormat.format(value)}`;

  function ordersLabel(count) {
    if (count === 0) return 'בלי הזמנות';
    if (count === 1) return 'הזמנה אחת';
    return `${count} הזמנות`;
  }

  function placeName(rank) {
    return rank <= ORDINALS.length ? `במקום ${ORDINALS[rank - 1]}` : `במקום ${rank}`;
  }

  const uid = () => Math.random().toString(36).slice(2, 10);

  // State

  function seed() {
    const start = addDays(today(), -22);
    return {
      competition: { id: uid(), name: 'האתגר של החבר׳ה', start, days: 31, prize: 100 },
      me: { id: 'me', name: 'ליאור' },
      friends: [
        { id: 'noa', name: 'נועה', total: 85, orders: 2 },
        { id: 'omer', name: 'עומר', total: 210, orders: 4 },
        { id: 'daniel', name: 'דניאל', total: 345, orders: 6 },
        { id: 'roni', name: 'רוני', total: 520, orders: 9 }
      ],
      orders: [
        { id: uid(), place: "McDonald's", amount: 65, date: addDays(start, 16) },
        { id: uid(), place: 'ג׳פניקה', amount: 42, date: addDays(start, 11) },
        { id: uid(), place: 'Pizza Hut', amount: 25, date: addDays(start, 4) }
      ]
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.competition && Array.isArray(parsed.orders) && Array.isArray(parsed.friends)) return parsed;
      }
    } catch (error) {
      // Storage blocked or corrupt: fall through to the seed.
    }
    const fresh = seed();
    save(fresh, true);
    return fresh;
  }

  function save(next, quiet) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (error) {
      if (!quiet) toast('לא הצלחנו לשמור בדפדפן הזה. השינוי יישאר עד שתסגרי את הדף.');
    }
  }

  let state = load();
  let demoMode = 'full';

  function viewData() {
    if (demoMode === 'empty') return { ...state, friends: [], orders: [] };
    return state;
  }

  function competitionInfo(data) {
    const { start, days } = data.competition;
    const end = addDays(start, days - 1);
    const now = today();
    const elapsed = daysBetween(start, now) + 1;
    return {
      start,
      end,
      days,
      dayIndex: Math.min(Math.max(elapsed, 0), days),
      notStarted: elapsed < 1,
      ended: elapsed > days,
      lastDay: now > end ? end : now
    };
  }

  function myTotal(data) {
    return data.orders.reduce((sum, order) => sum + order.amount, 0);
  }

  function ranking(data) {
    const people = data.friends.map((friend) => ({ ...friend, isMe: false }));
    people.push({ id: data.me.id, name: data.me.name, total: myTotal(data), orders: data.orders.length, isMe: true });
    people.sort((first, second) => first.total - second.total || Number(second.isMe) - Number(first.isMe));
    people.forEach((person, index) => {
      const previous = people[index - 1];
      person.rank = previous && previous.total === person.total ? previous.rank : index + 1;
    });
    return people;
  }

  // Elements

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const bind = (name) => $(`[data-bind="${name}"]`);

  const regions = {
    standing: $('[data-region="standing"]'),
    board: $('[data-region="board"]'),
    chart: $('[data-region="chart"]'),
    history: $('[data-region="history"]')
  };

  function stateBlock({ title, text, action, kind }) {
    const block = document.createElement('div');
    block.className = `state${kind ? ` state--${kind}` : ''}`;
    block.innerHTML = `<p class="state__title"></p>${text ? '<p class="state__text"></p>' : ''}`;
    block.querySelector('.state__title').textContent = title;
    if (text) block.querySelector('.state__text').textContent = text;
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn--secondary';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      block.appendChild(button);
    }
    return block;
  }

  function skeleton(rows) {
    const block = document.createElement('div');
    block.setAttribute('aria-busy', 'true');
    block.setAttribute('aria-label', 'טוען');
    for (let index = 0; index < rows; index += 1) {
      const line = document.createElement('span');
      line.className = `skeleton${index === rows - 1 ? ' skeleton--short' : ''}`;
      block.appendChild(line);
    }
    return block;
  }

  const retry = { label: 'לנסות שוב', onClick: () => setDemoMode('full') };

  // Competition header and progress

  function renderHeader(data) {
    const info = competitionInfo(data);
    bind('compName').textContent = data.competition.name;
    const prize = data.competition.prize ? `, פרס: שובר וולט ${money(data.competition.prize)}` : '';
    bind('compMeta').textContent = `${shortDate(info.start)} עד ${shortDate(info.end)}${prize}`;

    const bar = bind('progressBar');
    bar.setAttribute('aria-valuemax', String(info.days));
    bar.setAttribute('aria-valuenow', String(info.dayIndex));
    const share = info.dayIndex / info.days;
    const fill = $('.progress__fill', bar);
    fill.style.setProperty('--share', share.toFixed(3));
    if (hasGsap) gsap.set(fill, { scaleX: share });

    const left = info.days - info.dayIndex;
    if (info.notStarted) {
      bind('dayLabel').textContent = `מתחילה ב־${shortDate(info.start)}`;
      bind('daysLeft').textContent = `${info.days} ימים`;
    } else if (info.ended) {
      bind('dayLabel').textContent = 'התחרות הסתיימה';
      bind('daysLeft').textContent = `ב־${shortDate(info.end)}`;
    } else {
      bind('dayLabel').textContent = `יום ${info.dayIndex} מתוך ${info.days}`;
      bind('daysLeft').textContent = left === 0 ? 'היום האחרון' : left === 1 ? 'נשאר יום אחד' : `נשארו ${left} ימים`;
    }

    $$('[data-open="order"]').forEach((button) => {
      button.disabled = info.ended;
      button.title = info.ended ? 'התחרות הסתיימה' : '';
    });
  }

  // Standing: where am I and how much room is left

  function standingCopy(data) {
    const people = ranking(data);
    const me = people.find((person) => person.isMe);
    const info = competitionInfo(data);

    if (people.length === 1) {
      return {
        title: 'את לבד בתחרות',
        line: 'בלי חברים אין טבלה. שלחי קישור לקבוצה ותתחיל תחרות אמיתית.'
      };
    }

    const leader = people[0];
    const tiedAtTop = people.filter((person) => person.rank === 1 && !person.isMe);
    const nextBehind = people.find((person) => person.total > me.total);
    const cushion = nextBehind ? nextBehind.total - me.total : 0;

    if (info.ended) {
      return {
        title: me.rank === 1 ? 'ניצחת' : `סיימת ${placeName(me.rank)}`,
        line: me.rank === 1 ? `הוצאת הכי מעט: ${money(me.total)}.` : `${leader.name} במקום הראשון עם ${money(leader.total)}.`
      };
    }

    let title = `את ${placeName(me.rank)}`;
    let line;
    if (me.rank === 1 && tiedAtTop.length) {
      title = 'את חולקת את המקום הראשון';
      line = `יחד עם ${tiedAtTop.map((person) => person.name).join(' ו')}. ההזמנה הבאה תכריע.`;
    } else if (me.rank === 1) {
      line = `עוד ${money(cushion)} של הזמנות ואת משתווה ל${nextBehind.name}.`;
    } else {
      line = `${leader.name} בראש, בפער של ${money(me.total - leader.total)}.`;
      if (nextBehind) line += ` עוד ${money(cushion)} של הזמנות ואת משתווה ל${nextBehind.name}.`;
      else line += ' מכאן אפשר רק לעלות.';
    }
    return { title, line };
  }

  let shownRank = null;

  function renderStanding(data) {
    const region = regions.standing;
    region.replaceChildren();

    if (demoMode === 'loading') {
      region.setAttribute('aria-busy', 'true');
      region.append(skeleton(3));
      return;
    }
    region.removeAttribute('aria-busy');

    const people = ranking(data);
    const me = people.find((person) => person.isMe);
    const copy = demoMode === 'error'
      ? { title: 'המצב שלך לא נטען', line: 'החיבור נפל באמצע. הנתונים שלך לא נמחקו.' }
      : standingCopy(data);
    const showRank = demoMode !== 'error' && people.length > 1;
    const alone = data.friends.length === 0;

    region.innerHTML = `
      <div class="standing__top">
        ${showRank ? '<p class="standing__rank" aria-hidden="true"><span class="standing__num"></span><span class="standing__of"></span></p>' : ''}
        <h2 class="standing__title" id="standing-title"></h2>
      </div>
      <div class="standing__plate">
        <p class="standing__line"></p>
        ${demoMode === 'error' ? '' : `<dl class="standing__facts">
          <div><dt>הוצאת עד עכשיו</dt><dd data-bind="standingTotal"></dd></div>
          <div><dt>הזמנות</dt><dd data-bind="standingCount"></dd></div>
        </dl>`}
        <button class="btn btn--primary btn--wide" type="button"></button>
      </div>`;
    $('.standing__title', region).textContent = copy.title;
    $('.standing__line', region).textContent = copy.line;

    const button = $('.btn', region);
    if (demoMode === 'error') {
      button.textContent = retry.label;
      button.addEventListener('click', retry.onClick);
      return;
    }
    button.dataset.open = alone ? 'invite' : 'order';
    button.textContent = alone ? 'הזמנת חברים' : 'הוספת הזמנה';
    if (!alone && competitionInfo(data).ended) button.disabled = true;
    bind('standingTotal').textContent = money(myTotal(data));
    bind('standingCount').textContent = String(data.orders.length);

    if (showRank) {
      const number = $('.standing__num', region);
      number.textContent = String(me.rank);
      $('.standing__of', region).textContent = `מתוך ${people.length}`;
      if (shownRank !== null && shownRank !== me.rank && animate()) {
        gsap.fromTo(number, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.2)' });
      }
      shownRank = me.rank;
    }
  }

  // Leaderboard: one ranked list, each row carries its own bar

  const AVATAR_TONES = 5;
  const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.5 4 4-6.5 4 6.5 4.5-4-1.8 10H5.3z" fill="currentColor"/></svg>';

  function avatarTone(id) {
    let hash = 0;
    for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) % 997;
    return (hash % AVATAR_TONES) + 1;
  }

  function rowElement(person) {
    const row = document.createElement('li');
    row.className = 'row';
    row.dataset.id = person.id;
    row.innerHTML = `
      <span class="row__rank"></span>
      <span class="row__avatar" aria-hidden="true"><span class="row__initial"></span><span class="row__crown">${CROWN}</span></span>
      <span class="row__who"><span class="row__name"></span><span class="row__detail"></span></span>
      <span class="row__bar" aria-hidden="true"><span class="row__fill"></span></span>
      <span class="row__amount"></span>`;
    $('.row__avatar', row).style.setProperty('--tone', `var(--avatar-${avatarTone(person.id)})`);
    $('.row__initial', row).textContent = person.name.trim().charAt(0);
    return row;
  }

  function renderBoard(data, options = {}) {
    const region = regions.board;

    if (demoMode === 'loading') {
      region.replaceChildren(skeleton(5));
      return;
    }
    if (demoMode === 'error') {
      region.replaceChildren(stateBlock({ kind: 'error', title: 'לא הצלחנו לטעון את הטבלה', text: 'זה קורה כשהחיבור נופל. ההזמנות שלך שמורות.', action: retry }));
      return;
    }

    const people = ranking(data);
    if (people.length === 1) {
      region.replaceChildren(stateBlock({
        title: 'עוד אין מול מי להתחרות',
        text: 'כשחברים יצטרפו דרך הקישור, הם יופיעו כאן לפי כמה שהוציאו.',
        action: { label: 'הזמנת חברים', onClick: () => openSheet('invite') }
      }));
      return;
    }

    let list = $('.board__list[data-keyed]', region);
    if (!list) {
      list = document.createElement('ol');
      list.className = 'board__list';
      list.dataset.keyed = '';
      region.replaceChildren(list);
    }

    const flipState = options.flip && animate() && window.Flip ? Flip.getState($$('.row', list)) : null;
    const highest = Math.max(...people.map((person) => person.total), 1);
    const existing = new Map($$('.row', list).map((row) => [row.dataset.id, row]));

    people.forEach((person) => {
      const row = existing.get(person.id) || rowElement(person);
      existing.delete(person.id);
      row.classList.toggle('row--me', person.isMe);
      row.classList.toggle('row--leader', person.rank === 1);
      $('.row__rank', row).textContent = String(person.rank);
      $('.row__name', row).textContent = person.isMe ? `${person.name} (את)` : person.name;
      $('.row__initial', row).textContent = person.name.trim().charAt(0);
      $('.row__detail', row).textContent = ordersLabel(person.orders);
      $('.row__amount', row).textContent = money(person.total);

      const share = person.total / highest;
      const fill = $('.row__fill', row);
      fill.style.setProperty('--share', share.toFixed(3));
      if (animate() && options.flip) gsap.to(fill, { scaleX: share, duration: 0.5, ease: 'power3.out' });
      else if (hasGsap) gsap.set(fill, { scaleX: share });

      list.appendChild(row);
    });
    existing.forEach((row) => row.remove());

    if (flipState) Flip.from(flipState, { duration: 0.5, ease: 'power2.inOut' });
  }

  // Chart

  function buckets(data) {
    const info = competitionInfo(data);
    const size = 7;
    const count = Math.ceil(info.days / size);
    const values = new Array(count).fill(0);
    data.orders.forEach((order) => {
      const index = Math.floor(daysBetween(info.start, order.date) / size);
      if (index >= 0 && index < count) values[index] += order.amount;
    });
    const current = info.notStarted || info.ended ? -1 : Math.floor((info.dayIndex - 1) / size);
    const labels = values.map((value, index) => `שבוע ${index + 1}`);
    return { values, labels, current };
  }

  function renderChart(data, options = {}) {
    const region = regions.chart;

    if (demoMode === 'loading') {
      region.replaceChildren(skeleton(4));
      return;
    }
    if (demoMode === 'error') {
      region.replaceChildren(stateBlock({ kind: 'error', title: 'הגרף לא נטען', action: retry }));
      return;
    }
    if (data.orders.length === 0) {
      region.replaceChildren(stateBlock({ title: 'עוד אין מה להראות', text: 'כשתוסיפי הזמנה, היא תופיע כאן לפי התאריך שלה.' }));
      return;
    }

    const { values, labels, current } = buckets(data);
    // Size the viewBox to the real box so axis text stays at 12px on phones
    const inner = region.clientWidth - 32;
    const width = inner > 0 ? Math.max(300, Math.round(inner)) : 600;
    const height = 220;
    const top = 28;
    const bottom = 28;
    const plot = height - top - bottom;
    const slot = width / values.length;
    const barWidth = Math.min(24, slot * 0.45);
    const highest = Math.max(...values, 1);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    const summary = values
      .map((value, index) => (value ? `${labels[index]}: ${money(value)}` : ''))
      .filter(Boolean)
      .join(', ');
    svg.setAttribute('aria-label', `הוצאות לפי שבוע. ${summary}`);

    const make = (tag, attributes, text) => {
      const node = document.createElementNS(svgNS, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      if (text !== undefined) node.textContent = text;
      svg.appendChild(node);
      return node;
    };

    make('line', { class: 'baseline', x1: 0, x2: width, y1: top + plot, y2: top + plot });

    values.forEach((value, index) => {
      const center = width - (index + 0.5) * slot;
      if (value > 0) {
        const barHeight = Math.max((value / highest) * plot, 2);
        make('rect', {
          class: `bar${index === current ? ' bar--now' : ''}`,
          x: center - barWidth / 2,
          y: top + plot - barHeight,
          width: barWidth,
          height: barHeight,
          rx: Math.min(6, barWidth / 2)
        });
        make('text', { class: 'value', x: center, y: top + plot - barHeight - 8, 'text-anchor': 'middle' }, money(value));
      }
      if (labels[index]) make('text', { x: center, y: height - 6, 'text-anchor': 'middle' }, labels[index]);
    });

    const caption = document.createElement('figcaption');
    caption.className = 'chart__caption';
    if (current < 0) caption.textContent = 'הגרף מתחיל באפס ומראה רק את ההזמנות שלך.';
    else if (values[current] > 0) caption.textContent = 'השבוע מסומן בכחול.';
    else caption.textContent = 'השבוע עוד בלי הזמנות. ככה ממשיכים.';

    region.replaceChildren(svg, caption);

    if (options.animate && animate()) {
      gsap.from($$('.bar', svg), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.35, ease: 'power2.out', stagger: 0.015 });
    }
  }

  // History

  function iconButton(label, path, extraClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-btn${extraClass ? ` ${extraClass}` : ''}`;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    return button;
  }

  function renderHistory(data) {
    const region = regions.history;

    if (demoMode === 'loading') {
      region.replaceChildren(skeleton(3));
      return;
    }
    if (demoMode === 'error') {
      region.replaceChildren(stateBlock({ kind: 'error', title: 'לא הצלחנו לטעון את ההזמנות', text: 'שום דבר לא נמחק.', action: retry }));
      return;
    }
    if (data.orders.length === 0) {
      const info = competitionInfo(data);
      region.replaceChildren(stateBlock({
        title: 'עוד אין הזמנות בתחרות הזאת',
        text: 'זה בדיוק המצב שרוצים להיות בו.',
        action: info.ended ? null : { label: 'הוספת הזמנה', onClick: () => openOrder() }
      }));
      return;
    }

    const list = document.createElement('ul');
    list.className = 'history__list';
    const sorted = [...data.orders].sort((first, second) => second.date.localeCompare(first.date));
    const ended = competitionInfo(data).ended;

    sorted.forEach((order) => {
      const item = document.createElement('li');
      item.className = 'order';
      item.dataset.id = order.id;
      item.innerHTML = '<div><p class="order__place"></p><p class="order__date"></p></div><span class="order__amount"></span><div class="order__actions"></div>';
      $('.order__place', item).textContent = order.place;
      $('.order__date', item).textContent = shortDate(order.date);
      $('.order__amount', item).textContent = money(order.amount);

      const actions = $('.order__actions', item);
      const edit = iconButton(`עריכת ${order.place}`, '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>');
      const remove = iconButton(`מחיקת ${order.place}`, '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'icon-btn--danger');
      edit.disabled = ended;
      remove.disabled = ended;
      edit.addEventListener('click', () => openOrder(order));
      remove.addEventListener('click', () => deleteOrder(order.id));
      actions.append(edit, remove);
      list.appendChild(item);
    });

    const total = document.createElement('p');
    total.className = 'history__total';
    total.innerHTML = '<span>סך הכל</span><span></span>';
    total.lastElementChild.textContent = money(myTotal(data));

    region.replaceChildren(list, total);
  }

  // My totals with a counting tick on change

  let shownTotal = null;

  function renderTotals(data) {
    const total = myTotal(data);
    const count = data.orders.length;
    const element = bind('myTotal');
    const previous = shownTotal;
    shownTotal = total;

    if (demoMode === 'loading') {
      element.textContent = '₪…';
      bind('myMeta').textContent = 'טוען';
      return;
    }

    if (previous !== null && previous !== total && animate()) {
      const counter = { value: previous };
      gsap.to(counter, {
        value: total,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => { element.textContent = money(Math.round(counter.value)); },
        onComplete: () => { element.textContent = money(total); }
      });
    } else {
      element.textContent = money(total);
    }

    const average = count ? Math.round(total / count) : 0;
    bind('myMeta').textContent = count ? `${ordersLabel(count)}, ממוצע ${money(average)} להזמנה` : 'בלי הזמנות עד עכשיו';
  }

  function renderAll(options = {}) {
    const data = viewData();
    renderHeader(data);
    renderStanding(data);
    renderBoard(data, options);
    renderChart(data, options);
    renderHistory(data);
    renderTotals(data);
  }

  // Toast

  const toastElement = $('.toast');
  const undoButton = $('[data-action="undo"]');
  let toastTimer = null;
  let undoAction = null;

  function toast(text, undo) {
    bind('toastText').textContent = text;
    undoAction = undo || null;
    undoButton.hidden = !undo;
    toastElement.hidden = false;
    if (animate()) gsap.fromTo(toastElement, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, ease: 'power3.out' });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 6000 : 3500);
  }

  function hideToast() {
    const done = () => {
      toastElement.hidden = true;
      if (hasGsap) gsap.set(toastElement, { clearProps: 'all' });
    };
    if (animate()) gsap.to(toastElement, { y: 12, autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: done });
    else done();
  }

  undoButton.addEventListener('click', () => {
    if (undoAction) undoAction();
    undoAction = null;
    hideToast();
  });

  // Sheets

  const sheets = {
    order: $('#sheet-order'),
    competition: $('#sheet-competition'),
    invite: $('#sheet-invite')
  };

  function openSheet(name) {
    const sheet = sheets[name];
    if (!sheet || sheet.open) return;
    if (name === 'invite') prepareInvite();
    if (name === 'competition') prepareCompetition();
    sheet.showModal();
    if (animate()) {
      const offset = window.innerWidth < 768 ? 48 : 12;
      gsap.fromTo(sheet, { y: offset, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.26, ease: 'power3.out' });
    }
  }

  function closeSheet(sheet) {
    if (!sheet.open) return;
    const done = () => {
      sheet.close();
      if (hasGsap) gsap.set(sheet, { clearProps: 'all' });
    };
    if (animate()) {
      const offset = window.innerWidth < 768 ? 48 : 12;
      gsap.to(sheet, { y: offset, autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: done });
    } else {
      done();
    }
  }

  Object.values(sheets).forEach((sheet) => {
    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) closeSheet(sheet);
    });
    sheet.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeSheet(sheet);
    });
    $$('[data-close]', sheet).forEach((button) => button.addEventListener('click', () => closeSheet(sheet)));
  });

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (!opener || opener.disabled) return;
    if (opener.dataset.open === 'order') openOrder();
    else openSheet(opener.dataset.open);
  });

  // Order sheet

  const orderForm = $('form', sheets.order);
  const placeInput = $('#order-place');
  const amountInput = $('#order-amount');
  const dateInput = $('#order-date');
  let editingId = null;

  function setError(input, message) {
    const error = $(`#${input.id}-error`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    error.hidden = !message;
    if (message) error.textContent = message;
  }

  function renderChips() {
    const holder = bind('chips');
    const recent = [...new Set([...state.orders.map((order) => order.place), ...DEFAULT_PLACES])].slice(0, 6);
    holder.replaceChildren(...recent.map((place) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.place = place;
      const food = foodFor(place);
      if (food) {
        const icon = document.createElement('span');
        icon.className = 'chip__food';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = food;
        chip.append(icon);
      }
      chip.append(place);
      chip.setAttribute('aria-pressed', String(placeInput.value.trim() === place));
      chip.addEventListener('click', () => {
        if (placeInput.value.trim() !== place) burst(chip, food || FOOD, 8);
        placeInput.value = place;
        setError(placeInput, '');
        syncChips();
        amountInput.focus();
      });
      return chip;
    }));
  }

  function syncChips() {
    $$('.chip', bind('chips')).forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.place === placeInput.value.trim()));
    });
  }

  placeInput.addEventListener('input', syncChips);

  function openOrder(order) {
    const info = competitionInfo(state);
    if (info.ended) return;
    editingId = order ? order.id : null;
    $('#order-title').textContent = order ? 'עריכת הזמנה' : 'הזמנה חדשה';
    bind('orderSubmit').textContent = order ? 'שמירה' : 'הוספה לטבלה';
    placeInput.value = order ? order.place : '';
    amountInput.value = order ? String(order.amount) : '';
    dateInput.min = info.start;
    dateInput.max = info.lastDay < info.start ? info.start : info.lastDay;
    dateInput.value = order ? order.date : dateInput.max;
    [placeInput, amountInput, dateInput].forEach((input) => setError(input, ''));
    renderChips();
    openSheet('order');
    placeInput.focus();
  }

  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const place = placeInput.value.trim();
    const amount = Math.round(parseFloat(amountInput.value.replace(',', '.')) * 100) / 100;
    const date = dateInput.value;

    const problems = [];
    setError(placeInput, place ? '' : 'צריך לכתוב ממה הזמנת.');
    if (!place) problems.push(placeInput);
    const amountOK = Number.isFinite(amount) && amount >= 1 && amount <= MAX_AMOUNT;
    setError(amountInput, amountOK ? '' : `סכום בין ₪1 ל־₪${MAX_AMOUNT}.`);
    if (!amountOK) problems.push(amountInput);
    const dateOK = date && date >= dateInput.min && date <= dateInput.max;
    setError(dateInput, dateOK ? '' : `תאריך בין ${shortDate(dateInput.min)} ל־${shortDate(dateInput.max)}.`);
    if (!dateOK) problems.push(dateInput);
    if (problems.length) {
      problems[0].focus();
      return;
    }

    if (demoMode !== 'full') setDemoMode('full', true);

    if (editingId) {
      state.orders = state.orders.map((order) => (order.id === editingId ? { ...order, place, amount, date } : order));
    } else {
      state.orders.push({ id: uid(), place, amount, date });
    }
    save(state);
    renderAll({ flip: true });
    closeSheet(sheets.order);

    const me = ranking(state).find((person) => person.isMe);
    toast(`${editingId ? 'ההזמנה עודכנה' : 'ההזמנה נוספה'}. את ${placeName(me.rank)}.`);
    const landing = $('[data-view="expenses"]').hidden ? $('.row--me .row__avatar') : bind('myTotal');
    setTimeout(() => burst(landing, foodFor(place) || FOOD, 12), 420);
  });

  function deleteOrder(id) {
    const index = state.orders.findIndex((order) => order.id === id);
    if (index < 0) return;
    const [removed] = state.orders.splice(index, 1);
    save(state);
    renderAll({ flip: true });
    toast(`${removed.place} נמחקה`, () => {
      state.orders.splice(index, 0, removed);
      save(state);
      renderAll({ flip: true });
    });
  }

  // New competition sheet

  const competitionForm = $('form', sheets.competition);
  const nameInput = $('#new-name');
  const startInput = $('#new-start');
  const prizeInput = $('#new-prize');
  let newDuration = 'month';

  function endFor(start, duration) {
    if (duration === 'week') return addDays(start, 6);
    const date = fromISO(start);
    date.setMonth(date.getMonth() + 1);
    date.setDate(date.getDate() - 1);
    return toISO(date);
  }

  function updateNewEnd() {
    if (!startInput.value) return;
    bind('newEnd').textContent = `מסתיימת ב־${shortDate(endFor(startInput.value, newDuration))}`;
  }

  function prepareCompetition() {
    nameInput.value = '';
    prizeInput.value = '';
    startInput.value = today();
    startInput.min = today();
    setError(nameInput, '');
    bind('meName').textContent = `${state.me.name} (את)`;
    updateNewEnd();
  }

  $$('[data-duration]', sheets.competition).forEach((button) => {
    button.addEventListener('click', () => {
      newDuration = button.dataset.duration === '7' ? 'week' : 'month';
      $$('[data-duration]', sheets.competition).forEach((other) => other.setAttribute('aria-checked', String(other === button)));
      updateNewEnd();
    });
  });

  startInput.addEventListener('change', updateNewEnd);

  competitionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    setError(nameInput, name ? '' : 'צריך לתת לתחרות שם.');
    if (!name) {
      nameInput.focus();
      return;
    }
    const start = startInput.value || today();
    const end = endFor(start, newDuration);
    const prize = parseInt(prizeInput.value, 10);
    const previous = state;

    state = {
      competition: { id: uid(), name, start, days: daysBetween(start, end) + 1, prize: Number.isFinite(prize) && prize > 0 ? prize : 0 },
      me: previous.me,
      friends: [],
      orders: []
    };
    if (demoMode !== 'full') setDemoMode('full', true);
    save(state);
    shownTotal = null;
    renderAll();
    closeSheet(sheets.competition);
    navigate('competition');
    toast('התחרות נוצרה. עכשיו צריך חברים.', () => {
      state = previous;
      save(state);
      renderAll();
    });
  });

  // Invite sheet

  const inviteInput = $('#invite-link');
  const shareButton = $('[data-action="share"]');

  function inviteLink() {
    return `${location.href.split('#')[0]}#/join/${state.competition.id}`;
  }

  function prepareInvite() {
    inviteInput.value = inviteLink();
    shareButton.hidden = typeof navigator.share !== 'function';
  }

  $('[data-action="copy"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteInput.value);
      toast('הקישור הועתק');
    } catch (error) {
      inviteInput.select();
      toast('לא הצלחנו להעתיק. הקישור מסומן, אפשר להעתיק ידנית.');
    }
  });

  shareButton.addEventListener('click', async () => {
    try {
      await navigator.share({ title: 'Woltless', text: `מצטרפים ל${state.competition.name}?`, url: inviteInput.value });
    } catch (error) {
      // Dismissing the share sheet is not an error worth showing.
    }
  });

  // Demo states

  const demoSelect = $('#demo-state');

  function setDemoMode(mode, silent) {
    demoMode = mode;
    demoSelect.value = mode;
    if (!silent) renderAll();
  }

  demoSelect.addEventListener('change', () => setDemoMode(demoSelect.value));

  $('[data-action="reset"]').addEventListener('click', () => {
    const previous = state;
    state = seed();
    save(state);
    setDemoMode('full', true);
    shownTotal = null;
    renderAll();
    toast('הנתונים אופסו לנתוני ההדגמה', () => {
      state = previous;
      save(state);
      renderAll();
    });
  });

  // Routing

  const views = $$('[data-view]');

  function navigate(name, fromHash) {
    const target = views.some((view) => view.dataset.view === name) ? name : 'competition';
    views.forEach((view) => { view.hidden = view.dataset.view !== target; });
    $$('[data-tab]').forEach((tab) => {
      if (tab.dataset.tab === target) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (!fromHash && location.hash !== `#/${target}`) history.replaceState(null, '', `#/${target}`);
    const active = views.find((view) => view.dataset.view === target);
    if (animate()) gsap.fromTo(active, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'all' });
    if (target === 'expenses') renderChart(viewData());
  }

  function routeFromHash() {
    const name = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (name === 'join') {
      navigate('competition');
      toast('הצטרפות דרך קישור תעבוד כשיהיה שרת. בינתיים זו ההדגמה.');
      return;
    }
    navigate(name || 'competition', true);
  }

  window.addEventListener('hashchange', routeFromHash);

  // Ambient food strip, two identical halves so the drift loops without a seam
  const strip = $('[data-region="foodStrip"]');
  if (strip) {
    const half = [];
    for (let round = 0; round < 3; round += 1) half.push(...[...FOOD].sort(() => Math.random() - 0.5));
    strip.replaceChildren(...[...half, ...half].map((emoji) => {
      const item = document.createElement('span');
      item.className = 'food-strip__item';
      item.textContent = emoji;
      return item;
    }));
    strip.addEventListener('click', (event) => {
      const item = event.target.closest('.food-strip__item');
      if (item) burst(item, [item.textContent], 8);
    });
  }

  regions.standing.addEventListener('click', (event) => {
    const number = event.target.closest('.standing__num');
    if (!number || !animate()) return;
    burst(number, gsap.utils.shuffle([...FOOD]), 14);
    gsap.fromTo(number, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!regions.chart.closest('[hidden]')) renderChart(viewData()); }, 150);
  });

  // First paint: the rank lands, then the board fills in from the leader down

  function intro() {
    if (!animate() || demoMode !== 'full') return;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .from('.standing__num', { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)' }, 0.1)
      .from('.standing__title', { y: 12, autoAlpha: 0, duration: 0.4 }, 0.2)
      .from('.standing__plate', { y: 20, autoAlpha: 0, duration: 0.5 }, 0.25)
      .from('.board__list .row', { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.06, clearProps: 'transform,opacity,visibility' }, 0.3);
    $$('.board__list .row__fill').forEach((fill, index) => {
      const share = Number(fill.style.getPropertyValue('--share')) || 0;
      timeline.fromTo(fill, { scaleX: 0 }, { scaleX: share, duration: 0.8 }, 0.45 + index * 0.06);
    });
  }

  renderAll();
  routeFromHash();
  intro();
})();
