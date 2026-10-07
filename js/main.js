/* EasyPills Learning Studio · interacciones (sin dependencias) */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;

  /* ---------- Cabecera: sombra al hacer scroll ---------- */
  const header = document.querySelector("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const toggleLabel = toggle.querySelector(".menu-toggle-label");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Cerrar" : "Menú";
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Hero: titular rotativo (problema → solución, en bucle) ----------
     Con "reducir movimiento" no rota: se ven las tres frases a la vez (ver CSS). */
  const rotator = document.querySelector("[data-rotator]");
  const rotatorControls = document.querySelector("[data-rotator-controls]");
  if (rotator && rotatorControls && !reduceMotion) {
    const items = [...rotator.querySelectorAll(".rotator-item")];
    const dots = [...rotatorControls.querySelectorAll(".rotator-dots i")];
    const pauseButton = rotatorControls.querySelector("[data-rotator-toggle]");
    const durations = [2600, 3000, 4800];   // pregunta, pregunta, solución (ms)
    let current = 0;
    let timer = null;
    let paused = false;

    const show = (next) => {
      items.forEach((el, i) => {
        el.classList.toggle("is-leaving", i === current && i !== next);
        el.classList.toggle("is-active", i === next);
      });
      dots.forEach((d, i) => d.classList.toggle("is-active", i === next));
      current = next;
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || document.hidden) return;
      timer = setTimeout(() => { show((current + 1) % items.length); schedule(); }, durations[current]);
    };

    rotator.classList.add("is-rotating");
    rotatorControls.hidden = false;
    show(0);
    schedule();
    pauseButton.addEventListener("click", () => {
      paused = !paused;
      pauseButton.classList.toggle("is-paused", paused);
      pauseButton.setAttribute("aria-label", paused ? "Reanudar la animación del titular" : "Pausar la animación del titular");
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);
  }

  /* ---------- Entrada progresiva de los bloques ---------- */
  const reveals = [...document.querySelectorAll(".reveal")];
  reveals.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 5) * 90}ms`);
  });
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Menú: marca la sección visible ---------- */
  const navLinks = [...document.querySelectorAll(".nav-list a")];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
  if (hasIO) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => l.removeAttribute("aria-current"));
        const link = navLinks[sections.indexOf(entry.target)];
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => s && spy.observe(s));
    const contact = document.getElementById("contacto");
    if (contact) spy.observe(contact);
    // Arriba del todo (hero visible) no hay ninguna sección marcada
    const hero = document.querySelector(".hero");
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) navLinks.forEach((l) => l.removeAttribute("aria-current"));
    }, { rootMargin: "0px 0px -60% 0px" }).observe(hero);
  }

  /* ---------- Vídeo de marca: se reproduce al verlo ---------- */
  const video = document.querySelector("[data-autoplay-video]");
  const replay = document.querySelector("[data-video-replay]");
  if (video && replay) {
    const play = () => {
      replay.hidden = true;
      video.play().catch(() => { replay.hidden = false; });
    };
    if (hasIO && !reduceMotion) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && video.paused && !video.ended) play();
        else if (!entry.isIntersecting && !video.paused) video.pause();
      }, { threshold: 0.55 }).observe(video);
    } else {
      replay.innerHTML = '<span aria-hidden="true">▶</span> Ver animación';
      replay.hidden = false;
    }
    video.addEventListener("ended", () => {
      replay.innerHTML = '<span aria-hidden="true">↺</span> Ver otra vez';
      replay.hidden = false;
    });
    replay.addEventListener("click", () => { video.currentTime = 0; play(); });
  }

  /* ---------- Formulario de contacto (nombre, correo y teléfono) ----------
     Provisional: abre el correo del visitante con sus datos ya escritos.
     Sustituir por un servicio de formularios antes de publicar. */
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    const error = form.querySelector("[data-form-error]");
    const status = form.querySelector("[data-form-status]");
    const messages = {
      nombre: "Escribe tu nombre, por favor.",
      email: "Revisa tu correo electrónico: parece que falta algo.",
      telefono: "Escribe un teléfono de contacto (al menos 9 cifras).",
      privacidad: "Para enviarlo necesitamos que aceptes la política de privacidad.",
    };
    const isInvalid = (el) => {
      if (el.type === "checkbox") return !el.checked;
      if (el.type === "tel") return el.value.replace(/\D/g, "").length < 9;
      return !el.value.trim() || !el.checkValidity();
    };
    form.addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      error.hidden = true;
      status.hidden = true;
      const invalid = [...form.querySelectorAll("[required]")].find(isInvalid);
      if (invalid) {
        invalid.setAttribute("aria-invalid", "true");
        error.textContent = messages[invalid.name] || "Revisa los campos marcados.";
        error.hidden = false;
        invalid.focus();
        return;
      }
      if (form.hasAttribute("data-preview")) {
        status.textContent = "Vista previa: el formulario todavía no está conectado. En la web publicada, aquí nos llegarán tus datos.";
        status.hidden = false;
        return;
      }
      const data = new FormData(form);
      const body = [
        "Hola, me gustaría que me contactarais.",
        "",
        `Nombre: ${data.get("nombre")}`,
        `Correo: ${data.get("email")}`,
        `Teléfono: ${data.get("telefono")}`,
      ].join("\n");
      const subject = `Contacto desde la web · ${data.get("nombre")}`;
      window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "¡Gracias! Se abrirá tu correo con tus datos listos para enviar.";
      status.hidden = false;
    });
  }

  /* ---------- Enlaces pendientes (páginas legales, LinkedIn) ---------- */
  document.querySelectorAll("[data-todo]").forEach((a) => {
    a.title = "Pendiente de crear";
    a.addEventListener("click", (e) => e.preventDefault());
  });

  /* ---------- Año del pie ---------- */
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
