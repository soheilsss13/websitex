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

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Expose just the motion preference for progressive enhancement in the 3D module.
  root.dataset.reduceMotion = String(reduceMotion.matches);
})();
