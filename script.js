(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toFa = (value) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  // First-visit opening curtain.
  const loader = document.getElementById('loader');
  try {
    if (sessionStorage.getItem('x-visited')) {
      loader?.classList.add('is-done');
      document.body.classList.add('is-loaded');
    } else {
      sessionStorage.setItem('x-visited', '1');
      window.setTimeout(() => {
        loader?.classList.add('is-done');
        document.body.classList.add('is-loaded');
      }, prefersReducedMotion ? 250 : 1380);
    }
  } catch {
    window.setTimeout(() => {
      loader?.classList.add('is-done');
      document.body.classList.add('is-loaded');
    }, prefersReducedMotion ? 250 : 1380);
  }

  // Sticky header, chapter clock, and reading progress.
  const header = document.getElementById('site-header');
  const progressFill = document.getElementById('scroll-progress-fill');
  const clockTime = document.getElementById('clock-time');
  const clockChapter = document.getElementById('clock-chapter');
  const clockDot = document.getElementById('clock-dot');
  const chapters = [...document.querySelectorAll('[data-scene]')];
  const lightSections = [...document.querySelectorAll('.light-section, .dawn-section')];
  const hero = document.getElementById('home');
  const mobileApply = document.getElementById('mobile-apply-bar');
  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  function updateScrollState() {
    const scrollY = window.scrollY;
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = clamp(scrollY / total);
    if (progressFill) progressFill.style.width = `${ratio * 100}%`;
    document.documentElement.style.setProperty('--clock-progress', `${ratio * 100}%`);
    if (clockDot) clockDot.style.top = `${ratio * 100}%`;
    if (clockTime) {
      const minutes = Math.round(150 * ratio) + (4 * 60 + 10);
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      clockTime.textContent = `${toFa(String(hours).padStart(2, '0'))}:${toFa(String(remainder).padStart(2, '0'))}`;
    }

    const chapterLine = window.innerHeight * 0.48;
    const activeChapter = chapters.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= chapterLine && rect.bottom > chapterLine;
    });
    if (activeChapter && clockChapter) clockChapter.textContent = activeChapter.dataset.scene;

    const isLight = lightSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 95 && rect.bottom > 95;
    });
    header?.classList.toggle('light-on', isLight);
    header?.classList.toggle('is-scrolled', scrollY > 48);
    if (scrollY > 280 && scrollY > lastScrollY + 7) header?.classList.add('is-hidden');
    else if (scrollY < lastScrollY - 5 || scrollY < 40) header?.classList.remove('is-hidden');
    if (mobileApply && hero) {
      const heroRect = hero.getBoundingClientRect();
      const pastHero = heroRect.bottom < window.innerHeight * 0.55;
      mobileApply.classList.toggle('is-visible', pastHero && !document.getElementById('apply-dialog')?.open);
    }
    lastScrollY = scrollY;
    scrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScrollState);
      scrollTicking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', updateScrollState, { passive: true });
  updateScrollState();

  // Full-screen navigation.
  const menu = document.getElementById('full-menu');
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  function setMenu(open) {
    if (!menu || !menuToggle) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
    document.body.classList.toggle('menu-open', open);
    if (open) menuClose?.focus({ preventScroll: true });
    else menuToggle.focus({ preventScroll: true });
  }
  menuToggle?.addEventListener('click', () => setMenu(!menu?.classList.contains('is-open')));
  menuClose?.addEventListener('click', () => setMenu(false));
  menu?.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('is-open')) setMenu(false);
  });

  // Soft reveal as each chapter enters the viewport.
  const revealTargets = document.querySelectorAll(
    '.section-heading, .manifesto-statement, .manifesto-foot, .sector-explorer, .value-card, .journey-card, .dawn-intro, .metric-card, .portfolio-card, .criteria-card, .criteria-aside, .runway-card, .tool-mini, .about-copy, .about-visual, .insight-card, .network-title, .network-orbit, .final-content'
  );
  revealTargets.forEach((element) => element.classList.add('reveal'));
  document.querySelectorAll('.value-card, .journey-card, .portfolio-card, .tool-mini, .insight-card').forEach((element, index) => {
    element.dataset.delay = String(index % 4);
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((element) => revealObserver.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  }

  const metricCounters = [...document.querySelectorAll('[data-count]')];
  if (metricCounters.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const target = Number(element.dataset.count);
        const startedAt = performance.now();
        const duration = 850;
        const animateCount = (now) => {
          const progress = clamp((now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = toFa(String(Math.round(target * eased)).padStart(2, '0'));
          if (progress < 1) window.requestAnimationFrame(animateCount);
        };
        window.requestAnimationFrame(animateCount);
        observer.unobserve(element);
      });
    }, { threshold: .7 });
    metricCounters.forEach((counter) => countObserver.observe(counter));
  }

  // Scroll-scrubbed manifesto word fill.
  const manifesto = document.querySelector('.manifesto-section');
  const manifestoWords = [...document.querySelectorAll('.manifesto-word')];
  function updateManifesto() {
    if (!manifesto || !manifestoWords.length) return;
    const rect = manifesto.getBoundingClientRect();
    const scrollRange = Math.max(1, rect.height - window.innerHeight * 0.9);
    const progress = clamp((window.innerHeight * 0.55 - rect.top) / scrollRange);
    const litCount = Math.ceil(progress * (manifestoWords.length + 1));
    manifestoWords.forEach((word, index) => word.classList.toggle('is-lit', index < litCount));
  }
  window.addEventListener('scroll', () => window.requestAnimationFrame(updateManifesto), { passive: true });
  updateManifesto();

  // Small animated crystal, built locally on canvas (no external 3D/CDN dependency).
  const canvas = document.getElementById('crystal-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      [-1, goldenRatio, 0], [1, goldenRatio, 0], [-1, -goldenRatio, 0], [1, -goldenRatio, 0],
      [0, -1, goldenRatio], [0, 1, goldenRatio], [0, -1, -goldenRatio], [0, 1, -goldenRatio],
      [goldenRatio, 0, -1], [goldenRatio, 0, 1], [-goldenRatio, 0, -1], [-goldenRatio, 0, 1]
    ];
    const normalize = (v) => {
      const length = Math.hypot(v[0], v[1], v[2]) || 1;
      return v.map((part) => part / length);
    };
    const vertices = rawVertices.map(normalize);
    const edges = [];
    for (let i = 0; i < vertices.length; i += 1) {
      for (let j = i + 1; j < vertices.length; j += 1) {
        const dx = vertices[i][0] - vertices[j][0];
        const dy = vertices[i][1] - vertices[j][1];
        const dz = vertices[i][2] - vertices[j][2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < 1.06) edges.push([i, j]);
      }
    }
    const faces = [];
    for (let i = 0; i < vertices.length; i += 1) {
      for (let j = i + 1; j < vertices.length; j += 1) {
        for (let k = j + 1; k < vertices.length; k += 1) {
          const hasEdge = (a, b) => edges.some(([one, two]) => (one === a && two === b) || (one === b && two === a));
          if (!hasEdge(i, j) || !hasEdge(j, k) || !hasEdge(k, i)) continue;
          const center = [0, 1, 2].map((axis) => (vertices[i][axis] + vertices[j][axis] + vertices[k][axis]) / 3);
          const normal = normalize([
            (vertices[j][1] - vertices[i][1]) * (vertices[k][2] - vertices[i][2]) - (vertices[j][2] - vertices[i][2]) * (vertices[k][1] - vertices[i][1]),
            (vertices[j][2] - vertices[i][2]) * (vertices[k][0] - vertices[i][0]) - (vertices[j][0] - vertices[i][0]) * (vertices[k][2] - vertices[i][2]),
            (vertices[j][0] - vertices[i][0]) * (vertices[k][1] - vertices[i][1]) - (vertices[j][1] - vertices[i][1]) * (vertices[k][0] - vertices[i][0])
          ]);
          if (normal[0] * center[0] + normal[1] * center[1] + normal[2] * center[2] < 0) faces.push({ ids: [i, k, j], normal: normal.map((part) => -part), center });
          else faces.push({ ids: [i, j, k], normal, center });
        }
      }
    }
    const particles = Array.from({ length: window.innerWidth < 700 ? 50 : 115 }, (_, index) => ({
      angle: Math.random() * Math.PI * 2,
      radius: .22 + Math.random() * .7,
      speed: .00012 + Math.random() * .0004,
      size: .45 + Math.random() * 1.15,
      alpha: .17 + Math.random() * .52,
      gold: index % 9 === 0
    }));
    let canvasWidth = 1;
    let canvasHeight = 1;
    let dpr = 1;
    let pointerX = 0;
    let pointerY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let isInView = true;
    let rafId = 0;
    let lastFrameTime = 0;

    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rotatePoint(point, rx, ry, rz) {
      let [x, y, z] = point;
      const cosY = Math.cos(ry); const sinY = Math.sin(ry);
      [x, z] = [x * cosY - z * sinY, x * sinY + z * cosY];
      const cosX = Math.cos(rx); const sinX = Math.sin(rx);
      [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];
      const cosZ = Math.cos(rz); const sinZ = Math.sin(rz);
      [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];
      return [x, y, z];
    }

    function drawCrystal(timestamp = 0) {
      if (!isInView) { rafId = 0; return; }
      const delta = Math.min(40, timestamp - (lastFrameTime || timestamp));
      lastFrameTime = timestamp;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const rect = hero?.getBoundingClientRect();
      const heroTravel = rect ? clamp(-rect.top / Math.max(window.innerHeight * .85, 1)) : 0;
      const explode = prefersReducedMotion ? 0 : clamp((heroTravel - .12) / .82) * .75;
      if (!prefersReducedMotion) {
        mouseX += (pointerX - mouseX) * .045;
        mouseY += (pointerY - mouseY) * .045;
      }
      const time = prefersReducedMotion ? 0 : timestamp * .00018;
      const bob = prefersReducedMotion ? 0 : Math.sin(timestamp * .00065) * .035;
      const rotationY = time + mouseX * .34;
      const rotationX = -.16 + mouseY * .27 + Math.sin(time * .8) * .08;
      const rotationZ = .12 + Math.sin(time * .43) * .045;
      const unit = Math.min(canvasWidth, canvasHeight) * (.285 + explode * .17);
      const centerX = canvasWidth * .5;
      const centerY = canvasHeight * (.51 + bob);
      const perspective = 3.6;
      const movedVertices = vertices.map((point) => rotatePoint(point, rotationX, rotationY, rotationZ));
      const project = (point) => {
        const depth = perspective / (perspective - point[2] * .38);
        return [centerX + point[0] * unit * depth, centerY - point[1] * unit * depth, point[2]];
      };
      const transformedFaces = faces.map((face) => {
        const normal = rotatePoint(face.normal, rotationX, rotationY, rotationZ);
        const center = rotatePoint(face.center, rotationX, rotationY, rotationZ);
        const offset = explode * .77;
        const push = [center[0] * offset, center[1] * offset, center[2] * offset];
        const points = face.ids.map((id) => {
          const v = movedVertices[id];
          return project([v[0] + push[0], v[1] + push[1], v[2] + push[2]]);
        });
        return { normal, center, points, depth: center[2] };
      }).sort((a, b) => a.depth - b.depth);

      // A small, low-contrast field of warm and cool dust.
      particles.forEach((particle) => {
        if (!prefersReducedMotion) particle.angle += particle.speed * delta;
        const drift = (particle.angle % (Math.PI * 2));
        const px = centerX + Math.cos(drift) * canvasWidth * particle.radius * .43;
        const py = ((particle.angle * 34 + particle.radius * canvasHeight * .9) % (canvasHeight + 20)) - 10;
        ctx.beginPath();
        ctx.fillStyle = particle.gold ? `rgba(226,185,107,${particle.alpha * .7})` : `rgba(192,218,223,${particle.alpha * .5})`;
        ctx.arc(px, py, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      transformedFaces.forEach(({ normal, points, depth }) => {
        const facing = Math.max(0, normal[2]);
        const tealLight = Math.max(0, normal[0] * -.56 + normal[1] * .54);
        const light = .045 + facing * .11 + tealLight * .08;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach((point) => ctx.lineTo(point[0], point[1]));
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.round(9 + tealLight * 5)},${Math.round(34 + facing * 18)},${Math.round(57 + facing * 28)},${light + (explode * .08)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${tealLight > .36 ? '31,168,154' : '226,185,107'},${.26 + facing * .32})`;
        ctx.lineWidth = .7 + facing * .38;
        ctx.stroke();
        if (facing > .5) {
          ctx.strokeStyle = `rgba(255,245,220,${.08 + facing * .09})`;
          ctx.lineWidth = .55;
          ctx.stroke();
        }
      });

      // Gold heart and its light falloff.
      const pulse = prefersReducedMotion ? 1 : .92 + (Math.sin(timestamp * .00155) + 1) * .065;
      const coreRadius = Math.min(canvasWidth, canvasHeight) * .052 * pulse;
      const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 4.4);
      halo.addColorStop(0, 'rgba(255,239,194,.58)');
      halo.addColorStop(.18, 'rgba(226,185,107,.35)');
      halo.addColorStop(1, 'rgba(226,185,107,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 4.4, 0, Math.PI * 2);
      ctx.fill();
      const core = ctx.createRadialGradient(centerX - coreRadius * .24, centerY - coreRadius * .26, coreRadius * .05, centerX, centerY, coreRadius);
      core.addColorStop(0, '#fff4d1');
      core.addColorStop(.34, '#e2b96b');
      core.addColorStop(.83, 'rgba(226,185,107,.83)');
      core.addColorStop(1, 'rgba(226,185,107,.14)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,214,.68)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      if (!prefersReducedMotion) rafId = window.requestAnimationFrame(drawCrystal);
    }

    sizeCanvas();
    if (!prefersReducedMotion) rafId = window.requestAnimationFrame(drawCrystal);
    else drawCrystal(0);
    window.addEventListener('resize', () => {
      sizeCanvas();
      if (prefersReducedMotion) drawCrystal(0);
    }, { passive: true });
    canvas.addEventListener('pointermove', (event) => {
      const box = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - box.left) / box.width - .5) * 2;
      pointerY = ((event.clientY - box.top) / box.height - .5) * 2;
    }, { passive: true });
    const canvasObserver = new IntersectionObserver((entries) => {
      isInView = entries[0].isIntersecting;
      if (isInView && !prefersReducedMotion && !rafId) rafId = window.requestAnimationFrame(drawCrystal);
    }, { threshold: 0 });
    canvasObserver.observe(canvas);
  }

  // Selectable industry facet worlds.
  const sectorData = [
    { title: 'هوش مصنوعی', glyph: '✳', tag: 'SYSTEMS THAT LEARN', image: 'assets/images/sector-ai.jpg', copy: 'ابزارها و محصولاتی که از داده، تصمیم‌های بهتر و تجربه‌های انسانی‌تر می‌سازند.', caption: 'ما به مسئله‌های واقعی نگاه می‌کنیم، نه فقط فناوری تازه.' },
    { title: 'فین‌تک', glyph: '◉', tag: 'MONEY, REWIRED', image: 'assets/images/sector-fintech.jpg', copy: 'راهکارهایی برای دسترسی ساده‌تر، شفاف‌تر و هوشمندانه‌تر به خدمات مالی.', caption: 'اعتماد، امنیت و دسترسی؛ از همان روز اول.' },
    { title: 'سلامت و درمان', glyph: '✚', tag: 'CARE, REIMAGINED', image: 'assets/images/sector-health.jpg', copy: 'تجربه‌های مراقبتی که کیفیت، دسترسی و پیشگیری را در کنار هم می‌بینند.', caption: 'فناوری در خدمت تجربه‌ی بهتر برای انسان.' },
    { title: 'انرژی و محیط‌زیست', glyph: '☼', tag: 'A LIGHTER FOOTPRINT', image: 'assets/images/sector-energy.jpg', copy: 'نوآوری‌هایی برای مصرف بهینه‌تر منابع و ساختن آینده‌ای پایدارتر.', caption: 'رشد، بدون فراموش‌کردن هزینه‌ی محیطی.' },
    { title: 'کشاورزی و غذا', glyph: '⌘', tag: 'GROW WITH CARE', image: 'assets/images/sector-agriculture.jpg', copy: 'از مزرعه تا سفره؛ بهبود زنجیره‌ی تأمین و کاهش اتلاف در تولید غذا.', caption: 'کارایی بیشتر، تاب‌آوری بیشتر.' },
    { title: 'صنعت و تولید', glyph: '⬡', tag: 'INDUSTRY, EVOLVED', image: 'assets/images/sector-manufacturing.jpg', copy: 'داده، اتوماسیون و محصولات نو برای تولیدی انعطاف‌پذیرتر و رقابت‌پذیرتر.', caption: 'مسیر تحول دیجیتال از کف کارخانه می‌گذرد.' },
    { title: 'آموزش و منابع انسانی', glyph: '✦', tag: 'LEARNING FORWARD', image: 'assets/images/sector-education.jpg', copy: 'ابزارهایی برای یادگیری مؤثرتر، فرصت برابرتر و تیم‌های آماده‌ی آینده.', caption: 'رشد سازمان از رشد آدم‌ها آغاز می‌شود.' },
    { title: 'تجارت و لجستیک', glyph: '↗', tag: 'MOVE WHAT MATTERS', image: 'assets/images/sector-logistics.jpg', copy: 'شبکه‌ها و تجربه‌هایی برای جابه‌جایی هوشمندتر کالا، داده و ارزش.', caption: 'سرعت، دیدپذیری و اعتماد در سراسر زنجیره.' }
  ];
  const sectorButtons = [...document.querySelectorAll('.sector-item')];
  const sectorVisual = document.getElementById('sector-visual');
  const sectorPanel = document.querySelector('.sector-display');
  sectorPanel?.setAttribute('id', 'sector-panel');
  sectorButtons.forEach((button, index) => {
    button.id = `sector-tab-${index + 1}`;
    button.setAttribute('aria-controls', 'sector-panel');
  });
  function selectSector(index, focus = false) {
    const bounded = (index + sectorData.length) % sectorData.length;
    const data = sectorData[bounded];
    sectorButtons.forEach((button, current) => {
      const active = current === bounded;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      if (focus && active) button.focus();
    });
    if (!data || !sectorVisual) return;
    sectorVisual.dataset.sector = String(bounded);
    if (data.image) sectorVisual.style.setProperty('--sector-image', `url("${data.image}")`);
    else sectorVisual.style.removeProperty('--sector-image');
    sectorPanel?.setAttribute('aria-labelledby', sectorButtons[bounded]?.id || '');
    document.getElementById('sector-title').textContent = data.title;
    document.getElementById('sector-glyph').textContent = data.glyph;
    document.getElementById('sector-tag').textContent = data.tag;
    document.getElementById('sector-copy').textContent = data.copy;
    document.getElementById('sector-caption').textContent = data.caption;
    document.getElementById('sector-visual-index').textContent = String(bounded + 1).padStart(2, '0');
  }
  sectorButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectSector(index));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); selectSector(index + 1, true); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); selectSector(index - 1, true); }
      if (event.key === 'Home') { event.preventDefault(); selectSector(0, true); }
      if (event.key === 'End') { event.preventDefault(); selectSector(sectorData.length - 1, true); }
    });
  });
  selectSector(0);

  // The horizontal five-step path remains swipeable and keyboard-friendly.
  const journeyTrack = document.getElementById('journey-track');
  const journeyCards = [...document.querySelectorAll('.journey-card')];
  const journeyCurrent = document.getElementById('journey-current');
  const journeyFill = document.getElementById('journey-line-fill');
  const journeyNode = document.getElementById('journey-node');
  let journeyIndex = 0;
  function setJourneyIndex(index) {
    journeyIndex = clamp(index, 0, journeyCards.length - 1);
    journeyCards.forEach((card, cardIndex) => card.classList.toggle('is-current', cardIndex === journeyIndex));
    if (journeyCurrent) journeyCurrent.textContent = String(journeyIndex + 1).padStart(2, '0').replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    const percent = journeyCards.length > 1 ? (journeyIndex / (journeyCards.length - 1)) * 100 : 0;
    if (journeyFill) journeyFill.style.width = `${percent}%`;
    if (journeyNode) journeyNode.style.right = `${percent}%`;
  }
  function goToJourney(index) {
    const next = clamp(index, 0, journeyCards.length - 1);
    journeyCards[next]?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    setJourneyIndex(next);
  }
  document.getElementById('journey-next')?.addEventListener('click', () => goToJourney(journeyIndex + 1));
  document.getElementById('journey-prev')?.addEventListener('click', () => goToJourney(journeyIndex - 1));
  if (journeyTrack && 'IntersectionObserver' in window) {
    const journeyObserver = new IntersectionObserver((entries) => {
      const best = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) setJourneyIndex(journeyCards.indexOf(best.target));
    }, { root: journeyTrack, threshold: [.35, .55, .75] });
    journeyCards.forEach((card) => journeyObserver.observe(card));
  }
  setJourneyIndex(0);

  // Portfolio category filter.
  const filterButtons = [...document.querySelectorAll('.filter-chip')];
  const portfolioCards = [...document.querySelectorAll('.portfolio-card')];
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    portfolioCards.forEach((card) => {
      card.classList.toggle('is-filtered-out', filter !== 'all' && card.dataset.category !== filter);
    });
  }));

  // Expandable fit criteria.
  document.querySelectorAll('.criteria-card').forEach((card) => {
    const button = card.querySelector('.criteria-trigger');
    const body = card.querySelector('.criteria-body');
    const open = card.classList.contains('is-open');
    button?.setAttribute('aria-expanded', String(open));
    body?.setAttribute('aria-hidden', String(!open));
    button?.addEventListener('click', () => {
      const nextOpen = !card.classList.contains('is-open');
      card.classList.toggle('is-open', nextOpen);
      button.setAttribute('aria-expanded', String(nextOpen));
      body?.setAttribute('aria-hidden', String(!nextOpen));
    });
  });

  // Runway calculator and SVG chart.
  const cashRange = document.getElementById('cash-range');
  const burnRange = document.getElementById('burn-range');
  const cashOutput = document.getElementById('cash-output');
  const burnOutput = document.getElementById('burn-output');
  const runwayResult = document.getElementById('runway-result');
  const chartLine = document.getElementById('chart-line');
  const chartArea = document.getElementById('chart-area');
  const chartEnd = document.getElementById('chart-end');
  const formatFaInteger = (number) => Math.round(number).toLocaleString('fa-IR');
  function updateRangeTrack(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percent = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, #1fa89a 0%, #1fa89a ${percent}%, #e1e5e2 ${percent}%, #e1e5e2 100%)`;
  }
  function updateRunway() {
    if (!cashRange || !burnRange) return;
    const cash = Number(cashRange.value);
    const burn = Number(burnRange.value);
    const months = cash / Math.max(burn, 1);
    if (cashOutput) cashOutput.textContent = formatFaInteger(cash);
    if (burnOutput) burnOutput.textContent = formatFaInteger(burn);
    if (runwayResult) runwayResult.innerHTML = `${months.toLocaleString('fa-IR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} <i>ماه</i>`;
    updateRangeTrack(cashRange);
    updateRangeTrack(burnRange);

    const points = [];
    const plotLeft = 38;
    const plotWidth = 372;
    const plotTop = 20;
    const plotHeight = 126;
    const horizon = 12;
    for (let step = 0; step <= 8; step += 1) {
      const month = (horizon / 8) * step;
      const remaining = Math.max(0, cash - burn * month) / cash;
      const x = plotLeft + (month / horizon) * plotWidth;
      const y = plotTop + (1 - remaining) * plotHeight;
      points.push([x, y]);
    }
    const pointString = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    chartLine?.setAttribute('points', pointString);
    const linePath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    chartArea?.setAttribute('d', `${linePath} L ${plotLeft + plotWidth} 146 L ${plotLeft} 146 Z`);
    const endPoint = points[points.length - 1];
    chartEnd?.setAttribute('cx', endPoint[0].toFixed(1));
    chartEnd?.setAttribute('cy', endPoint[1].toFixed(1));
  }
  cashRange?.addEventListener('input', updateRunway);
  burnRange?.addEventListener('input', updateRunway);
  updateRunway();

  // Pointer light, custom ring, and magnetic buttons (desktop only).
  const cursor = document.getElementById('custom-cursor');
  const cursorLabel = document.getElementById('cursor-label');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && cursor) {
    document.documentElement.classList.add('has-custom-cursor');
    let cursorX = -100;
    let cursorY = -100;
    let ringX = -100;
    let ringY = -100;
    document.addEventListener('pointermove', (event) => {
      const wasVisible = cursor.classList.contains('is-visible');
      cursorX = event.clientX;
      cursorY = event.clientY;
      if (!wasVisible) { ringX = cursorX; ringY = cursorY; }
      cursor.classList.add('is-visible');
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      ringX += (cursorX - ringX) * .35;
      ringY += (cursorY - ringY) * .35;
      cursor.style.setProperty('--ring-offset-x', `${ringX - cursorX}px`);
      cursor.style.setProperty('--ring-offset-y', `${ringY - cursorY}px`);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    document.querySelectorAll('button,a,.portfolio-card,.journey-card,.sector-item').forEach((target) => {
      target.addEventListener('pointerenter', () => {
        cursor.classList.add('is-hovering');
        if (cursorLabel) cursorLabel.textContent = target.matches('.portfolio-card') ? 'مشاهده' : target.matches('.journey-card,.sector-item') ? 'بکشید' : target.hasAttribute('data-open-application') ? 'ارسال' : 'کلیک';
      });
      target.addEventListener('pointerleave', () => cursor.classList.remove('is-hovering'));
    });
  }
  document.querySelectorAll('.spotlight-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });
  if (finePointer && !prefersReducedMotion) {
    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        if (distance < 80) button.style.transform = `translate(${dx * .1}px, ${dy * .1}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  // Accessible multi-step application demo. It intentionally stores only locally.
  const dialog = document.getElementById('apply-dialog');
  const applicationForm = document.getElementById('application-form');
  const steps = [...document.querySelectorAll('.application-step')];
  const formNext = document.getElementById('form-next');
  const formBack = document.getElementById('form-back');
  const formProgressFill = document.getElementById('form-progress-fill');
  const formStepLabel = document.getElementById('form-step-label');
  const formProgressPercent = document.getElementById('form-progress-percent');
  const formActions = document.getElementById('form-actions');
  const formProgress = document.querySelector('.form-progress');
  const formSuccess = document.getElementById('form-success');
  const draftKey = 'x-venture-application-draft';
  const stepNames = ['اطلاعات تماس', 'ایده و محصول', 'نیاز به سرمایه و تأیید'];
  let currentStep = 0;

  function resetApplicationView() {
    formSuccess?.setAttribute('hidden', '');
    formProgress?.removeAttribute('hidden');
    formActions?.removeAttribute('hidden');
    steps.forEach((step) => {
      step.querySelectorAll('.has-error').forEach((field) => field.classList.remove('has-error'));
      step.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
    });
    displayStep(0);
  }
  function openApplication() {
    setMenu(false);
    if (!dialog) return;
    resetApplicationView();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('dialog-open');
    mobileApply?.classList.remove('is-visible');
    window.setTimeout(() => dialog.querySelector('input')?.focus({ preventScroll: true }), 100);
  }
  document.querySelectorAll('[data-open-application]').forEach((button) => button.addEventListener('click', openApplication));
  function closeApplication() {
    if (dialog?.open) dialog.close();
    else dialog?.removeAttribute('open');
    document.body.classList.remove('dialog-open');
    updateScrollState();
  }
  document.getElementById('dialog-close')?.addEventListener('click', closeApplication);
  document.getElementById('dialog-done')?.addEventListener('click', closeApplication);
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    updateScrollState();
  });

  function restoreDraft() {
    if (!applicationForm) return;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
      Object.entries(draft).forEach(([name, value]) => {
        const input = applicationForm.elements.namedItem(name);
        if (!input) return;
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = value;
      });
      const summary = applicationForm.elements.namedItem('summary');
      if (summary) document.getElementById('summary-count').textContent = toFa(summary.value.length);
    } catch { /* local storage may be unavailable; the form can still be used */ }
  }
  function saveDraft() {
    if (!applicationForm) return;
    const consent = applicationForm.elements.namedItem('consent');
    if (!consent?.checked) {
      try { localStorage.removeItem(draftKey); } catch { /* optional convenience */ }
      return;
    }
    const data = {};
    [...applicationForm.elements].forEach((input) => {
      if (!input.name || input.type === 'button') return;
      data[input.name] = input.type === 'checkbox' ? input.checked : input.value;
    });
    try { localStorage.setItem(draftKey, JSON.stringify(data)); } catch { /* optional convenience */ }
  }
  restoreDraft();
  applicationForm?.addEventListener('input', (event) => {
    if (event.target.name === 'summary') document.getElementById('summary-count').textContent = toFa(event.target.value.length);
    saveDraft();
  });
  applicationForm?.addEventListener('change', saveDraft);

  function displayStep(index) {
    currentStep = clamp(index, 0, steps.length - 1);
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });
    const percent = Math.round(((currentStep + 1) / steps.length) * 100);
    if (formProgressFill) formProgressFill.style.width = `${percent}%`;
    if (formProgressPercent) formProgressPercent.textContent = `${toFa(percent)}٪`;
    if (formStepLabel) formStepLabel.textContent = `گام ${toFa(currentStep + 1)} از ${toFa(steps.length)} · ${stepNames[currentStep]}`;
    if (formBack) formBack.disabled = currentStep === 0;
    if (formNext) formNext.innerHTML = currentStep === steps.length - 1 ? 'پایان و ذخیره‌ی محلی <span class="arrow">✓</span>' : 'ادامه <span class="arrow">↙</span>';
  }
  function validateCurrentStep() {
    const step = steps[currentStep];
    if (!step) return false;
    let firstInvalid = null;
    step.querySelectorAll('input,select,textarea').forEach((input) => {
      const field = input.closest('.form-field,.consent-field');
      const error = field?.querySelector('.field-error');
      let message = '';
      const value = input.value.trim();
      if (input.type === 'checkbox') {
        if (input.required && !input.checked) message = 'برای ادامه، تأیید این مورد لازم است.';
      } else if (input.required && !value) {
        message = 'تکمیل این فیلد لازم است.';
      } else if (input.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        message = 'ایمیل را با قالب درست وارد کنید.';
      } else if (input.name === 'phone' && value) {
        const normalized = value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
        const digits = normalized.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) message = 'شماره‌ی موبایل را کامل وارد کنید.';
      } else if (input.name === 'website' && value && !input.checkValidity()) {
        message = 'لینک را با قالبی مثل https://example.com وارد کنید.';
      } else if (input.name === 'name' && value.length < 3) {
        message = 'نام را کامل‌تر وارد کنید.';
      }
      if (field) field.classList.toggle('has-error', Boolean(message));
      if (error) error.textContent = message;
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
      return false;
    }
    return true;
  }
  formNext?.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    saveDraft();
    if (currentStep < steps.length - 1) {
      displayStep(currentStep + 1);
      steps[currentStep].querySelector('input,select,textarea')?.focus({ preventScroll: true });
    } else {
      formProgress?.setAttribute('hidden', '');
      steps.forEach((step) => { step.hidden = true; });
      formActions?.setAttribute('hidden', '');
      formSuccess?.removeAttribute('hidden');
    }
  });
  formBack?.addEventListener('click', () => {
    if (currentStep > 0) displayStep(currentStep - 1);
  });
  applicationForm?.addEventListener('input', (event) => {
    const field = event.target.closest('.form-field,.consent-field');
    if (field?.classList.contains('has-error')) {
      field.classList.remove('has-error');
      const error = field.querySelector('.field-error');
      if (error) error.textContent = '';
    }
  });
  displayStep(0);
})();
