import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE = 'wandOrganizer';
const MENU = '#extensionsMenu';
const HIDE_CLASS = 'wandorg-hidden';

/* ---------- translations ---------- */

const I18N = {
    en: {
        title: 'Wand Organizer',
        hint: 'Tick an item to show it in the magic wand menu. Hold and drag the handle to reorder.',
        showAll: 'Show all',
        resetOrder: 'Reset order',
        rescan: 'Rescan',
        language: 'Language',
        auto: 'Auto',
        empty: 'No wand items found yet.',
        drag: 'Drag to reorder',
    },
    ru: {
        title: 'Организатор волшебной палочки',
        hint: 'Отметьте пункты, которые должны отображаться в меню волшебной палочки. Удерживайте и перетаскивайте ручку, чтобы изменить порядок.',
        showAll: 'Показать все',
        resetOrder: 'Сбросить порядок',
        rescan: 'Обновить',
        language: 'Язык',
        auto: 'Авто',
        empty: 'Пункты меню пока не найдены.',
        drag: 'Перетащите, чтобы изменить порядок',
    },
};

function currentLang() {
    const l = getSettings().lang;
    if (l === 'en' || l === 'ru') return l;
    return (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function t(key) {
    return I18N[currentLang()][key] ?? I18N.en[key] ?? key;
}

function applyTranslations() {
    $('.wandorg-settings [data-i18n]').each(function () {
        $(this).text(t($(this).data('i18n')));
    });
}

/* ---------- settings ---------- */

function getSettings() {
    if (!extension_settings[MODULE]) extension_settings[MODULE] = {};
    const s = extension_settings[MODULE];
    if (!s.hidden || typeof s.hidden !== 'object') s.hidden = {};
    if (!Array.isArray(s.order)) s.order = [];
    if (!s.lang) s.lang = 'auto';
    return s;
}

/* ---------- reading the wand menu ---------- */

function getText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim() || el.title || el.id || '(unnamed)';
}

function getIconClass(el) {
    const icon = el.querySelector('[class*="fa-"]');
    if (!icon) return 'fa-solid fa-puzzle-piece';
    const cls = [...icon.classList].filter(c => c.startsWith('fa'));
    return cls.length ? cls.join(' ') : 'fa-solid fa-puzzle-piece';
}

/** Returns every selectable entry currently in the magic wand menu. */
function getItems() {
    const menu = document.querySelector(MENU);
    if (!menu) return [];

    const items = [];
    const seen = new Set();

    for (const top of menu.children) {
        let leaves = top.matches('.list-group-item')
            ? [top]
            : [...top.querySelectorAll('.list-group-item')];
        if (!leaves.length) leaves = [top];

        for (const el of leaves) {
            // skip empty placeholders (containers of disabled/inactive extensions)
            const hasContent = (el.textContent || '').trim() || el.title;
            if (!hasContent) continue;

            let key = el.id || getText(el);
            if (seen.has(key)) key = `${key}#${seen.size}`;
            seen.add(key);
            items.push({ el, top, key, label: getText(el), icon: getIconClass(el) });
        }
    }
    return items;
}

/* ---------- applying hide / order ---------- */

let observer = null;
let dragging = false;
const originalOrder = [];

/** Physically reorder the menu's children to match the saved order. */
function reorderDom(items, s) {
    const menu = document.querySelector(MENU);
    if (!menu) return;

    const rank = new Map();
    for (const { top, key } of items) {
        const r = s.order.indexOf(key);
        rank.set(top, Math.min(rank.get(top) ?? Infinity, r));
    }

    const current = [...menu.children];
    const sorted = [...current].sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9));
    if (sorted.every((el, i) => el === current[i])) return;

    sorted.forEach(el => menu.appendChild(el));
    observer?.takeRecords(); // ignore our own DOM changes
}

function apply() {
    if (dragging) return;

    const s = getSettings();
    const items = getItems();
    let changed = false;

    // remember the order items first appeared in (used by "Reset order")
    for (const { key } of items) {
        if (!originalOrder.includes(key)) originalOrder.push(key);
    }

    // make sure every present item has a slot in the saved order
    for (const { key } of items) {
        if (!s.order.includes(key)) {
            s.order.push(key);
            changed = true;
        }
    }

    for (const { el, top, key } of items) {
        el.classList.toggle(HIDE_CLASS, !!s.hidden[key]);
        top.style.order = '';
    }

    reorderDom(items, s);

    // hide wrapper containers whose entries are all hidden
    const tops = new Set(items.map(i => i.top));
    for (const top of tops) {
        if (top.matches('.list-group-item')) continue;
        const mine = items.filter(i => i.top === top);
        top.classList.toggle(HIDE_CLASS, mine.length > 0 && mine.every(i => s.hidden[i.key]));
    }

    if (changed) saveSettingsDebounced();
}

/* ---------- drag and drop (mouse + touch) ---------- */

function getScrollParent(el) {
    let p = el.parentElement;
    while (p && p !== document.body) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
        p = p.parentElement;
    }
    return document.scrollingElement || document.documentElement;
}

function commitListOrder(listEl) {
    const s = getSettings();
    const keys = [...listEl.children].map(r => r.dataset.key).filter(Boolean);
    const stale = s.order.filter(k => !keys.includes(k));
    s.order = [...keys, ...stale];
    saveSettingsDebounced();
    apply();
}

function enableDrag(handleEl, rowEl, listEl) {
    handleEl.addEventListener('contextmenu', e => e.preventDefault());

    handleEl.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();

        dragging = true;
        handleEl.setPointerCapture(e.pointerId);
        rowEl.classList.add('wandorg-dragging');

        const grabOffset = e.clientY - rowEl.getBoundingClientRect().top;
        const scroller = getScrollParent(listEl);
        const isDoc = scroller === document.scrollingElement || scroller === document.documentElement;
        let lastY = e.clientY;
        let raf = null;

        const place = (desiredTop) => {
            rowEl.style.transform = '';
            const natural = rowEl.getBoundingClientRect().top;
            rowEl.style.transform = `translateY(${desiredTop - natural}px)`;
        };

        const update = () => {
            const desiredTop = lastY - grabOffset;
            place(desiredTop);

            const center = desiredTop + rowEl.offsetHeight / 2;

            let next = rowEl.nextElementSibling;
            while (next && center > next.getBoundingClientRect().top + next.offsetHeight / 2) {
                listEl.insertBefore(next, rowEl);
                next = rowEl.nextElementSibling;
            }

            let prev = rowEl.previousElementSibling;
            while (prev && center < prev.getBoundingClientRect().top + prev.offsetHeight / 2) {
                listEl.insertBefore(rowEl, prev);
                prev = rowEl.previousElementSibling;
            }

            place(desiredTop);
        };

        const loop = () => {
            // auto-scroll when dragging near the top/bottom edge
            const rect = isDoc ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
            const top = Math.max(rect.top, 0);
            const bottom = Math.min(rect.bottom, window.innerHeight);
            const edge = 70;
            let speed = 0;
            if (lastY < top + edge) speed = -Math.ceil((top + edge - lastY) / 5);
            else if (lastY > bottom - edge) speed = Math.ceil((lastY - (bottom - edge)) / 5);
            if (speed) scroller.scrollTop += speed;

            update();
            raf = requestAnimationFrame(loop);
        };

        const onMove = (ev) => { lastY = ev.clientY; };

        const end = () => {
            cancelAnimationFrame(raf);
            handleEl.removeEventListener('pointermove', onMove);
            handleEl.removeEventListener('pointerup', end);
            handleEl.removeEventListener('pointercancel', end);
            rowEl.style.transform = '';
            rowEl.classList.remove('wandorg-dragging');
            dragging = false;
            commitListOrder(listEl);
        };

        handleEl.addEventListener('pointermove', onMove);
        handleEl.addEventListener('pointerup', end);
        handleEl.addEventListener('pointercancel', end);
        raf = requestAnimationFrame(loop);
    });
}

/* ---------- settings UI ---------- */

function renderList() {
    if (dragging) return;

    const $list = $('#wandorg_list');
    if (!$list.length) return;

    const s = getSettings();
    const items = getItems().sort((a, b) => s.order.indexOf(a.key) - s.order.indexOf(b.key));

    $list.empty();

    if (!items.length) {
        $list.append($('<div class="wandorg-empty"></div>').text(t('empty')));
        return;
    }

    const listEl = $list[0];

    for (const item of items) {
        const $row = $('<div class="wandorg-row"></div>');
        $row[0].dataset.key = item.key;

        const $label = $('<label class="wandorg-label"></label>');
        const $cb = $('<input type="checkbox">').prop('checked', !s.hidden[item.key]);
        const $icon = $('<i class="wandorg-icon"></i>').addClass(item.icon);
        const $text = $('<span class="wandorg-text"></span>').text(item.label);
        $label.append($cb, $icon, $text);

        $cb.on('change', function () {
            if (this.checked) delete s.hidden[item.key];
            else s.hidden[item.key] = true;
            saveSettingsDebounced();
            apply();
        });

        const $handle = $('<div class="wandorg-handle fa-solid fa-grip-lines"></div>').attr('title', t('drag'));
        enableDrag($handle[0], $row[0], listEl);

        $row.append($label, $handle);
        $list.append($row);
    }
}

function buildUI() {
    const html = `
    <div class="wandorg-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b data-i18n="title"></b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <small class="wandorg-hint" data-i18n="hint"></small>

                <div class="wandorg-lang">
                    <span data-i18n="language"></span>
                    <select id="wandorg_lang" class="text_pole">
                        <option value="auto" data-i18n="auto"></option>
                        <option value="en">English</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>

                <div class="wandorg-actions">
                    <div id="wandorg_show_all" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-eye"></i><span data-i18n="showAll"></span>
                    </div>
                    <div id="wandorg_reset_order" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-rotate-left"></i><span data-i18n="resetOrder"></span>
                    </div>
                    <div id="wandorg_refresh" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-arrows-rotate"></i><span data-i18n="rescan"></span>
                    </div>
                </div>
                <div id="wandorg_list"></div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);

    $('#wandorg_lang').val(getSettings().lang).on('change', function () {
        getSettings().lang = String(this.value);
        saveSettingsDebounced();
        applyTranslations();
        renderList();
    });

    applyTranslations();

    $('.wandorg-settings .inline-drawer-toggle').on('click', () => setTimeout(renderList, 50));

    $('#wandorg_show_all').on('click', () => {
        getSettings().hidden = {};
        saveSettingsDebounced();
        apply();
        renderList();
    });

    $('#wandorg_reset_order').on('click', () => {
        getSettings().order = [...originalOrder];
        saveSettingsDebounced();
        apply();
        renderList();
    });

    $('#wandorg_refresh').on('click', () => {
        apply();
        renderList();
    });
}

/* ---------- init ---------- */

let timer = null;
function scheduleApply() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        if (dragging) return;
        apply();
        if ($('#wandorg_list').is(':visible')) renderList();
    }, 150);
}

jQuery(() => {
    getSettings();
    buildUI();
    apply();

    // other extensions add their wand items at various times, so keep watching
    const target = document.querySelector(MENU) || document.body;
    observer = new MutationObserver(scheduleApply);
    observer.observe(target, { childList: true, subtree: true });

    // a couple of delayed passes for late-loading extensions
    setTimeout(apply, 2000);
    setTimeout(apply, 6000);
});
