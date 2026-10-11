(() => {
  const root = document.documentElement;
  const nav = document.getElementById('main-nav');
  const menuToggle = document.getElementById('menu-toggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setMenu(open) {
    if (!nav || !menuToggle) return;
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'بستن فهرست' : 'باز کردن فهرست');
    document.body.classList.toggle('nav-open', open);
  }

  menuToggle?.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 850) setMenu(false);
  }, { passive: true });

  // Native dialog for the application draft.
  const dialog = document.getElementById('application-dialog');
  const form = document.getElementById('application-form');
  const toast = document.getElementById('toast');
  let toastTimer = 0;
  const draftKey = 'x-capital-application-draft';

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4400);
  }

  function openApplication() {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => form?.querySelector('input')?.focus({ preventScroll: true }), 40);
  }

  document.querySelectorAll('[data-open-application]').forEach((button) => {
    button.addEventListener('click', openApplication);
  });
  document.querySelectorAll('[data-close-application]').forEach((button) => {
    button.addEventListener('click', () => dialog?.close());
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  try {
    const savedDraft = JSON.parse(window.localStorage.getItem(draftKey) || 'null');
    if (savedDraft && form) {
      for (const [name, value] of Object.entries(savedDraft)) {
        const field = form.elements.namedItem(name);
        if (field && typeof value === 'string') field.value = value;
      }
    }
  } catch {
    // Storage can be unavailable in private browsing; the form remains usable.
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const draft = Object.fromEntries(new FormData(form).entries());
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      dialog?.close();
      showToast('پیش‌نویس در همین مرورگر ذخیره شد؛ هیچ پیامی ارسال نشده است.');
    } catch {
      showToast('ذخیره‌سازی مرورگر در دسترس نیست؛ اطلاعات را پیش از بستن صفحه کپی کنید.');
    }
  });

  // The page content stays visible at all times; the 3D object carries the motion.
  // A tiny playback control for the independent 3D scene and its no-WebGL fallback.
  const stage = document.getElementById('crystal-stage');
  const sceneToggle = document.getElementById('crystal-toggle');
  let scenePaused = reduceMotion.matches;

  function setScenePaused(paused) {
    scenePaused = Boolean(paused);
    if (sceneToggle) {
      sceneToggle.classList.toggle('is-paused', scenePaused);
      sceneToggle.setAttribute('aria-pressed', String(scenePaused));
      sceneToggle.setAttribute('aria-label', scenePaused ? 'شروع چرخش کریستال' : 'توقف چرخش کریستال');
      sceneToggle.title = scenePaused ? 'شروع چرخش' : 'توقف چرخش';
    }
    stage?.classList.toggle('is-paused', scenePaused);
    document.dispatchEvent(new CustomEvent('crystal:toggle', { detail: { paused: scenePaused } }));
  }

  sceneToggle?.addEventListener('click', () => setScenePaused(!scenePaused));
  document.addEventListener('crystal:ready', () => setScenePaused(scenePaused), { once: true });
  reduceMotion.addEventListener?.('change', (event) => {
    if (event.matches) setScenePaused(true);
  });
  setScenePaused(scenePaused);

  const fieldButtons = [...document.querySelectorAll('[data-field-index]')];
  const focusVisual = document.getElementById('focus-visual');
  const focusImage = document.getElementById('focus-image');
  const focusCurrent = document.getElementById('focus-current');
  const focusVisualEn = document.getElementById('focus-visual-en');
  const focusVisualTitle = document.getElementById('focus-visual-title');
  const focusVisualCopy = document.getElementById('focus-visual-copy');
  const fields = [
    { image: 'assets/images/sector-ai.jpg', en: 'INTELLIGENCE', title: 'هوش مصنوعی و داده', copy: 'ابزارها و مدل‌هایی که تصمیم‌گیری و تجربه‌ی محصول را معنادار بهتر می‌کنند.' },
    { image: 'assets/images/sector-health.jpg', en: 'HEALTH', title: 'سلامت و زیست‌فناوری', copy: 'راه‌حل‌هایی برای دسترسی بهتر، تشخیص دقیق‌تر و کیفیت مراقبت.' },
    { image: 'assets/images/sector-energy.jpg', en: 'CLIMATE', title: 'انرژی و اقلیم', copy: 'فناوری‌هایی برای بهره‌وری بیشتر و سازگاری هوشمندانه‌تر با اقلیم.' },
    { image: 'assets/images/sector-fintech.jpg', en: 'FINANCIAL SYSTEMS', title: 'مالی و زیرساخت دیجیتال', copy: 'زیرساخت‌ها و خدماتی که اقتصاد دیجیتال را دسترس‌پذیرتر می‌کنند.' },
    { image: 'assets/images/sector-education.jpg', en: 'LEARNING', title: 'آموزش و آینده‌ی کار', copy: 'راه‌های تازه برای یادگیری، مهارت‌آموزی و آماده‌شدن برای کار آینده.' },
    { image: 'assets/images/sector-agriculture.jpg', en: 'FOOD SYSTEMS', title: 'کشاورزی و غذا', copy: 'نوآوری در زنجیره‌ی غذا؛ از تولید پایدار تا دسترسی کارآمدتر.' },
    { image: 'assets/images/sector-logistics.jpg', en: 'MOVEMENT', title: 'لجستیک و زنجیره‌ی تأمین', copy: 'راه‌حل‌هایی برای جابه‌جایی، تجارت و زنجیره‌های تأمین تاب‌آور.' },
    { image: 'assets/images/sector-manufacturing.jpg', en: 'INDUSTRY', title: 'صنعت و تولید پیشرفته', copy: 'نرم‌افزار، سخت‌افزار و فرایندهایی برای تولید هوشمندتر.' },
  ];
  let fieldSwap = 0;
  let selectedField = -1;

  function activateField(index) {
    const field = fields[index];
    if (!field || index === selectedField) return;
    selectedField = index;
    const ticket = ++fieldSwap;
    fieldButtons.forEach((button) => {
      const active = Number(button.dataset.fieldIndex) === index;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (focusVisual && !reduceMotion.matches) focusVisual.classList.add('is-changing');

    const updateCaption = () => {
      if (ticket !== fieldSwap) return;
      if (focusCurrent) focusCurrent.textContent = String(index + 1).padStart(2, '0');
      if (focusVisualEn) focusVisualEn.textContent = field.en;
      if (focusVisualTitle) focusVisualTitle.textContent = field.title;
      if (focusVisualCopy) focusVisualCopy.textContent = field.copy;
    };
    if (!focusImage) {
      updateCaption();
      return;
    }
    const preload = new Image();
    preload.onload = () => {
      if (ticket !== fieldSwap) return;
      focusImage.src = field.image;
      updateCaption();
      requestAnimationFrame(() => focusVisual?.classList.remove('is-changing'));
    };
    preload.onerror = () => {
      updateCaption();
      focusVisual?.classList.remove('is-changing');
    };
    preload.src = field.image;
  }

  fieldButtons.forEach((button) => {
    const index = Number(button.dataset.fieldIndex);
    button.addEventListener('mouseenter', () => activateField(index));
    button.addEventListener('focus', () => activateField(index));
    button.addEventListener('click', () => activateField(index));
  });

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Expose just the motion preference for progressive enhancement in the 3D module.
  root.dataset.reduceMotion = String(reduceMotion.matches);
})();
