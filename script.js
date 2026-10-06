/* ==========================================================================
   DOCUGREEN | script.js
   JavaScript vanilla, sin dependencias. Cada módulo es independiente.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     CONFIGURACIÓN: completa estos datos para activar los accesos directos
     y el envío real del formulario. Mientras estén vacíos, los accesos
     llevan al formulario y el envío se simula en la página.
     --------------------------------------------------------------------- */
  const CONFIG = {
    whatsapp: '18097923000',  // Número con código de país, solo dígitos
    instagram: 'docugreenrd', // Usuario sin @
    email: 'docugreenrd@gmail.com',
    formEndpoint: '',  // Opcional: URL (Formspree, backend propio) que recibe un POST JSON
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = () => motionQuery.matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------------------------------------------------------------------
     Año del footer
     --------------------------------------------------------------------- */
  function initYear() {
    const el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------------
     Titulares: máscara por palabra (se anima con la clase .is-in)
     --------------------------------------------------------------------- */
  function splitText(root) {
    const state = { i: 0 };

    const makeWord = (word) => {
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.style.setProperty('--i', state.i++);
      inner.textContent = word;
      w.appendChild(inner);
      return w;
    };

    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
            else frag.appendChild(makeWord(part));
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') return;
          if (child.classList.contains('inline-img')) {
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.style.setProperty('--i', state.i++);
            child.replaceWith(w);
            w.appendChild(inner);
            inner.appendChild(child);
          } else {
            walk(child);
          }
        }
      });
    };

    walk(root);
  }

  function initSplit() {
    $$('.split').forEach((el) => splitText(el));
  }

  /* ---------------------------------------------------------------------
     Reveal con IntersectionObserver
     --------------------------------------------------------------------- */
  function initReveal() {
    const targets = $$('[data-reveal], .split');
    if (!targets.length) return;

    if (!hasIO || prefersReduced()) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((t) => io.observe(t));
  }

  /* ---------------------------------------------------------------------
     Navegación: fondo sólido, ocultar al bajar, enlace activo
     --------------------------------------------------------------------- */
  function initNav() {
    const nav = $('#nav');
    if (!nav) return;

    // Estado sólido mediante un centinela (sin escuchar scroll)
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;';
    document.body.prepend(sentinel);

    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        nav.classList.toggle('is-solid', !entry.isIntersecting);
      }).observe(sentinel);
    }

    // El nav permanece siempre visible (sin ocultarse al hacer scroll).

    // Enlace activo según la sección visible
    if (hasIO) {
      const links = $$('.nav__links a');
      const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
      const sections = Array.from(map.keys()).map((id) => document.getElementById(id)).filter(Boolean);
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.removeAttribute('aria-current'));
          const link = map.get(entry.target.id);
          if (link) link.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => spy.observe(s));
    }
  }

  /* ---------------------------------------------------------------------
     Menú mobile
     --------------------------------------------------------------------- */
  function initMenu() {
    const nav = $('#nav');
    const toggle = $('.nav__toggle');
    const menu = $('#menu');
    if (!nav || !toggle || !menu) return;

    const label = $('.nav__toggle-text', toggle);
    const focusables = () => [toggle, ...$$('a[href]', menu)];
    let open = false;

    const setOpen = (value) => {
      open = value;
      menu.classList.toggle('is-open', open);
      nav.classList.toggle('is-menu-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      if (label) label.textContent = open ? label.dataset.close : label.dataset.open;
      menu.toggleAttribute('inert', !open);
    };

    menu.setAttribute('inert', '');
    toggle.addEventListener('click', () => setOpen(!open));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Si se agranda la ventana, cerramos el menú
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches && open) setOpen(false); });
  }

  /* ---------------------------------------------------------------------
     Servicios: lista interactiva (hover/foco en desktop, toque en mobile)
     --------------------------------------------------------------------- */
  function initServices() {
    const root = $('.services');
    if (!root) return;

    const items = $$('.svc', root);
    const imgs = $$('.svc-stage__img', root);
    const capNum = $('#stage-num');
    const capName = $('#stage-name');
    const desktop = window.matchMedia('(min-width: 960px)');
    let current = 0;
    let hoverTimer = null;

    const showStage = (next, prev) => {
      imgs.forEach((img, k) => {
        img.classList.remove('is-prev');
        if (k === next) img.classList.add('is-active');
        else if (k === prev) { img.classList.remove('is-active'); img.classList.add('is-prev'); }
        else img.classList.remove('is-active');
      });
      const name = $('.svc__name', items[next]).textContent;
      const num = $('.svc__num', items[next]).textContent;
      if (capNum) capNum.textContent = num;
      if (capName) capName.textContent = name;
    };

    const activate = (i, { allowClose = false } = {}) => {
      if (i === current) {
        if (allowClose && !desktop.matches) {
          const it = items[i];
          const willOpen = !it.classList.contains('is-active');
          it.classList.toggle('is-active', willOpen);
          $('.svc__btn', it).setAttribute('aria-expanded', String(willOpen));
        }
        return;
      }
      const prev = current;
      items.forEach((it, k) => {
        const on = k === i;
        it.classList.toggle('is-active', on);
        $('.svc__btn', it).setAttribute('aria-expanded', String(on));
      });
      current = i;
      showStage(i, prev);
    };

    items.forEach((item, i) => {
      const btn = $('.svc__btn', item);
      btn.addEventListener('click', () => activate(i, { allowClose: true }));
      btn.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !desktop.matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => activate(i), 70);
      });
      btn.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
      btn.addEventListener('focus', () => { if (desktop.matches) activate(i); });
    });

    // Enlaces "Cotizar este servicio": preseleccionan el tipo de servicio del formulario
    $$('[data-service]', root).forEach((link) => {
      link.addEventListener('click', () => {
        const select = $('#f-service');
        if (!select) return;
        select.value = link.dataset.service;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Al volver a desktop, garantizamos que haya un servicio abierto
    desktop.addEventListener('change', (e) => {
      if (e.matches && !items.some((it) => it.classList.contains('is-active'))) {
        items[current].classList.add('is-active');
        $('.svc__btn', items[current]).setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Canales de contacto (WhatsApp, Instagram, Email)
     --------------------------------------------------------------------- */
  function initChannels() {
    const urls = {
      whatsapp: CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola DocuGreen, quiero cotizar un proyecto.')}` : '',
      instagram: CONFIG.instagram ? `https://instagram.com/${CONFIG.instagram.replace(/^@/, '')}` : '',
      email: CONFIG.email ? `mailto:${CONFIG.email}` : '',
    };
    $$('[data-channel]').forEach((a) => {
      const url = urls[a.dataset.channel];
      if (url) {
        a.setAttribute('href', url);
        if (url.startsWith('mailto:')) { a.removeAttribute('target'); a.removeAttribute('rel'); }
      } else {
        // Sin dato configurado: llevamos al formulario
        a.setAttribute('href', '#f-name');
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Formulario: validación, estados y envío
     --------------------------------------------------------------------- */
  function initForm() {
    const form = $('#quote-form');
    if (!form) return;

    const status = $('#form-status');
    const success = $('#form-success');
    const successName = $('#success-name');
    const resetBtn = $('#form-reset');
    const submitBtn = $('button[type="submit"]', form);
    const submitLabel = $('.btn__label', submitBtn);

    const rules = {
      name: (v) => {
        if (!v.trim()) return 'Escribe tu nombre.';
        if (v.trim().length < 2) return 'El nombre es demasiado corto.';
        return '';
      },
      email: (v) => {
        if (!v.trim()) return 'Escribe tu correo electrónico.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Revisa el formato del correo. Ej: nombre@correo.com';
        return '';
      },
      phone: (v) => {
        const digits = v.replace(/\D/g, '');
        if (!v.trim()) return 'Escribe un teléfono o número de WhatsApp.';
        if (!/^[\d\s+()\-.]+$/.test(v.trim())) return 'Usa solo números, espacios, + y guiones.';
        if (digits.length < 7 || digits.length > 15) return 'Revisa el número, parece incompleto.';
        return '';
      },
      service: (v) => (v ? '' : 'Selecciona el tipo de servicio.'),
      message: (v) => {
        if (!v.trim()) return 'Cuéntanos brevemente sobre tu proyecto.';
        if (v.trim().length < 10) return 'Agrega un poco más de detalle (mínimo 10 caracteres).';
        return '';
      },
    };

    const fieldEl = (name) => $(`[data-field="${name}"]`, form);
    const inputEl = (name) => form.elements[name];

    const setState = (name, message) => {
      const wrap = fieldEl(name);
      const input = inputEl(name);
      const err = $('.field__error', wrap);
      const invalid = Boolean(message);
      wrap.classList.toggle('is-invalid', invalid);
      wrap.classList.toggle('is-valid', !invalid && Boolean(input.value.trim()));
      input.setAttribute('aria-invalid', String(invalid));
      err.textContent = message;
    };

    const validate = (name) => {
      const message = rules[name](inputEl(name).value);
      setState(name, message);
      return !message;
    };

    const touched = new Set();
    Object.keys(rules).forEach((name) => {
      const input = inputEl(name);
      input.addEventListener('blur', () => { touched.add(name); validate(name); });
      const live = () => { if (touched.has(name) || fieldEl(name).classList.contains('is-invalid')) validate(name); };
      input.addEventListener('input', live);
      input.addEventListener('change', () => { touched.add(name); validate(name); });
    });

    const setStatus = (text, isError = false) => {
      status.textContent = text;
      status.classList.toggle('is-error', isError);
    };

    const setLoading = (loading) => {
      form.classList.toggle('is-loading', loading);
      form.setAttribute('aria-busy', String(loading));
      submitBtn.disabled = loading;
      submitLabel.textContent = loading ? submitLabel.dataset.loading : submitLabel.dataset.default;
    };

    const serviceLabel = () => {
      const select = inputEl('service');
      return select.options[select.selectedIndex]?.text || '';
    };

    const buildMessage = (data) => [
      'Hola DocuGreen, quiero solicitar una cotización.',
      '',
      `Nombre: ${data.name}`,
      `Correo: ${data.email}`,
      `Teléfono / WhatsApp: ${data.phone}`,
      `Servicio: ${serviceLabel()}`,
      '',
      `Proyecto: ${data.message}`,
    ].join('\n');

    const send = async (data) => {
      // 1) Endpoint propio (Formspree, API, etc.)
      if (CONFIG.formEndpoint) {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, service: serviceLabel() }),
        });
        if (!res.ok) throw new Error('Respuesta no válida del servidor');
        return;
      }
      // 2) WhatsApp con el mensaje prellenado
      if (CONFIG.whatsapp) {
        const url = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage(data))}`;
        window.open(url, '_blank', 'noopener');
        return;
      }
      // 3) Correo del cliente
      if (CONFIG.email) {
        const url = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Solicitud de cotización')}&body=${encodeURIComponent(buildMessage(data))}`;
        window.location.href = url;
        return;
      }
      // 4) Sin configuración: simulación local
      console.warn('[DocuGreen] El formulario no tiene destino. Completa CONFIG en script.js (whatsapp, email o formEndpoint).');
      await new Promise((resolve) => setTimeout(resolve, 900));
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('');

      const names = Object.keys(rules);
      names.forEach((n) => touched.add(n));
      const results = names.map((n) => [n, validate(n)]);
      const firstInvalid = results.find(([, ok]) => !ok);
      if (firstInvalid) {
        setStatus('Revisa los campos marcados para continuar.', true);
        inputEl(firstInvalid[0]).focus();
        return;
      }

      // Honeypot: si un bot lo llena, fingimos éxito sin enviar
      if (form.elements.website && form.elements.website.value) {
        showSuccess('');
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      delete data.website;

      setLoading(true);
      try {
        await send(data);
        showSuccess(data.name.trim().split(/\s+/)[0]);
      } catch (err) {
        console.error(err);
        setStatus('No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.', true);
      } finally {
        setLoading(false);
      }
    });

    function showSuccess(firstName) {
      successName.textContent = firstName ? `, ${firstName}` : '';
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ block: 'center', behavior: prefersReduced() ? 'auto' : 'smooth' });
    }

    resetBtn.addEventListener('click', () => {
      form.reset();
      touched.clear();
      Object.keys(rules).forEach((n) => setState(n, ''));
      $$('.field', form).forEach((f) => f.classList.remove('is-valid', 'is-invalid'));
      setStatus('');
      success.hidden = true;
      form.hidden = false;
      inputEl('name').focus();
    });
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  function init() {
    initYear();
    initSplit();
    initReveal();
    initNav();
    initMenu();
    initServices();
    initChannels();
    initForm();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
