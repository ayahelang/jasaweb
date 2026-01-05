// =========================================
// CONFIG
// =========================================
// =========================================
// CONFIG
// =========================================
const COUNTDOWN_START = 5; // ⬅️ TAMBAHKAN INI
const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;
const READ_SPEED_WPM = IS_MOBILE ? 6 : 7;
const MIN_PAUSE = IS_MOBILE ? 2200 : 2100;
const MAX_PAUSE = IS_MOBILE ? 8000 : 7500;
const SCROLL_DURATION = IS_MOBILE ? 1300 : 1250;

// =========================================
// STATE
// =========================================
let soundEnabled = false;
let countdownInterval = null;
let isRunning = false;
let stopSignal = false;

// =========================================
// CACHE DOM (lebih ringan)
// =========================================
const SECTIONS = document.querySelectorAll("header, section");
const FOOTER = document.querySelector("footer");

// =========================================
// TEXT TO SPEECH
// =========================================
async function speakText(text, container) {
    return new Promise(async resolve => {
        if (!soundEnabled || !text || !container) return resolve();

        speechSynthesis.cancel();

        wrapWords(container);
        const words = Array.from(container.querySelectorAll(".tts-word"));

        const u = new SpeechSynthesisUtterance(text);
        u.lang = "id-ID";
        u.rate = 1.15;

        let index = 0;
        const intervalTime = Math.max(60, 60000 / READ_SPEED_WPM / 18);

        const highlightInterval = setInterval(() => {
            if (index > 0) words[index - 1]?.classList.remove("active");
            if (words[index]) {
                words[index].classList.add("active");
            }
            index++;
            if (index >= words.length) {
                clearInterval(highlightInterval);
            }
        }, intervalTime);

        u.onend = () => {
            clearInterval(highlightInterval);
            clearHighlights(container);
            resolve();
        };

        u.onerror = () => {
            clearInterval(highlightInterval);
            clearHighlights(container);
            resolve();
        };

        speechSynthesis.speak(u);
    });
}

// =========================================
// UTILITIES
// =========================================
const delay = ms => new Promise(r => setTimeout(r, ms));

const countWords = text =>
    text ? text.trim().split(/\s+/).length : 0;

const readTime = words =>
    Math.min(Math.max((words / READ_SPEED_WPM) * 60000, MIN_PAUSE), MAX_PAUSE);

function smoothScrollTo(targetY, duration) {
    const startY = window.scrollY;
    const diff = targetY - startY;
    let start;

    function step(t) {
        if (!start) start = t;
        const p = Math.min((t - start) / duration, 1);
        const eased = p < 0.5
            ? 4 * p * p * p
            : 1 - Math.pow(-2 * p + 2, 3) / 2;

        window.scrollTo(0, startY + diff * eased);
        if (p < 1 && !stopSignal) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function centerY(el) {
    const r = el.getBoundingClientRect();
    return r.top + window.pageYOffset - innerHeight / 2 + r.height / 2;
}

// =========================================
// TEXT HIGHLIGHT UTILITIES
// =========================================
function wrapWords(element) {
    if (!element || element.dataset.wrapped) return;

    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    const textNodes = [];

    while (node = walker.nextNode()) {
        if (node.nodeValue.trim()) {
            textNodes.push(node);
        }
    }

    textNodes.forEach(textNode => {
        const words = textNode.nodeValue.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        words.forEach(word => {
            if (word.trim()) {
                const span = document.createElement("span");
                span.className = "tts-word";
                span.textContent = word;
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(word));
            }
        });

        textNode.parentNode.replaceChild(fragment, textNode);
    });

    element.dataset.wrapped = "true";
}

function clearHighlights(container) {
    container.querySelectorAll(".tts-word.active")
        .forEach(w => w.classList.remove("active"));
}

// =========================================
// FLOATING BUTTONS
// =========================================
function createFloatingButtons() {
    document.getElementById("startPresentation")?.remove();

    const autoplay = document.createElement("button");
    autoplay.className = "floating-btn floating-autoplay show";
    autoplay.textContent = "🔊 Autoplay ulang";

    autoplay.onclick = () => restartPresentation(true);

    const wa = document.createElement("a");
    wa.className = "floating-btn floating-whatsapp show";
    wa.href = "https://wa.me/6285158822803";
    wa.target = "_blank";
    wa.textContent = "Chat WhatsApp";

    document.body.append(autoplay, wa);
}

// =========================================
// PRESENTATION FLOW
// =========================================
async function runPresentation() {
    stopSignal = false;
    isRunning = true;

    for (const section of SECTIONS) {
        if (stopSignal) return;

        const text = section.innerText;
        const target = centerY(section);

        smoothScrollTo(target, SCROLL_DURATION);
        await delay(SCROLL_DURATION + 300);

        if (soundEnabled) {
            await speakText(text, section);
        } else {
            await delay(readTime(countWords(text)));
        }
    }

    speechSynthesis.cancel();

    if (FOOTER) {
        smoothScrollTo(
            FOOTER.getBoundingClientRect().top +
            pageYOffset -
            innerHeight / 2,
            1200
        );
    }

    isRunning = false;
    showQuickMenu();
}

// =========================================
// START / RESTART
// =========================================
function startPresentation(withSound) {
    if (isRunning) return;

    soundEnabled = withSound;
    clearInterval(countdownInterval);

    createFloatingButtons();
    runPresentation();
}

function restartPresentation(withSound) {
    stopSignal = true;
    speechSynthesis.cancel();

    soundEnabled = withSound;

    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
        runPresentation();
    }, 600);
}

// =========================================
// COUNTDOWN
// =========================================
function startCountdown() {
    const el = document.getElementById("countdown");
    let c = el ? parseInt(el.textContent) || 5 : 5;

    countdownInterval = setInterval(() => {
        c--;
        if (el) el.textContent = c;

        if (c <= 0) {
            clearInterval(countdownInterval);
            startPresentation(false);
            document.getElementById("startPresentation")?.remove();
        }
    }, 1000);
}

// =========================================
// HERO BUTTON
// =========================================
document.getElementById("startPresentation")?.addEventListener("click", () => {
    startPresentation(true);
});

// =========================================
// AUTO START
// =========================================
window.addEventListener("load", startCountdown);

// =========================================
// INTERSECTION OBSERVER
// =========================================
const observer = new IntersectionObserver(
    entries =>
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add("show");
                observer.unobserve(e.target);
            }
        }),
    { threshold: 0.3 }
);

document.querySelectorAll(".animate").forEach(el => observer.observe(el));

// =========================================
// SHOW QUICK MENU AFTER PRESENTATION
// =========================================
function showQuickMenu() {
    const menu = document.getElementById("quickMenu");
    if (!menu) return;

    menu.classList.add("show");
    startQuickMenuAttention();
}

// =========================================
// QUICK MENU ATTENTION LOGIC
// =========================================
let quickMenuTimer = null;

function startQuickMenuAttention() {
    const menu = document.getElementById("quickMenu");
    if (!menu) return;

    clearTimeout(quickMenuTimer);

    quickMenuTimer = setTimeout(() => {
        menu.classList.add("attention");
    }, 2000);
}

function stopQuickMenuAttention() {
    const menu = document.getElementById("quickMenu");
    if (!menu) return;

    menu.classList.remove("attention");
    clearTimeout(quickMenuTimer);
}

// Hover detection
document.addEventListener("mouseover", e => {
    if (e.target.closest("#quickMenu")) {
        stopQuickMenuAttention();
    }
});

document.addEventListener("mouseout", e => {
    if (e.target.closest("#quickMenu")) {
        startQuickMenuAttention();
    }
});

// =========================================
// FAST SMOOTH LOCAL NAVIGATION (EASE IN OUT)
// =========================================
document.addEventListener("click", e => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;

    const id = link.getAttribute("href").slice(1);
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();

    const y =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        innerHeight / 2 +
        target.offsetHeight / 2;

    smoothScrollTo(y, 700); // ⬅️ cepat tapi elegan
});