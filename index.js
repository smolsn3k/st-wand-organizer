import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE = 'wandOrganizer';
const MENU = '#extensionsMenu';
const HIDE_CLASS = 'wandorg-hidden';

/* ---------- settings ---------- */

function getSettings() {
    if (!extension_settings[MODULE]) extension_settings[MODULE] = {};
    const s = extension_settings[MODULE];
    if (!s.hidden || typeof s.hidden !== 'object') s.hidden = {};
    if (!Array.isArray(s.order)) s.order = [];
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
            let key = el.id || getText(el);
            if (seen.has(key)) key = `${key}#${seen.size}`;
            seen.add(key);
            items.push({ el, top, key, label: getText(el), icon: getIconClass(el) });
        }
    }
    return items;
}

/* ---------- applying hide / order ---------- */

function apply() {
    const s = getSettings();
    const items = getItems();
    let changed = false;

    // make sure every present item has a slot in the saved order
    for (const { key } of items) {
        if (!s.order.includes(key)) {
            s.order.push(key);
            changed = true;
        }
    }

    for (const { el, top, key } of items) {
        el.classList.toggle(HIDE_CLASS, !!s.hidden[key]);
        top.style.order = String(s.order.indexOf(key));
    }

    // hide wrapper containers whose entries are all hidden
    const tops = new Set(items.map(i => i.top));
    for (const top of tops) {
        if (top.matches('.list-group-item')) continue;
        const mine = items.filter(i => i.top === top);
        top.classList.toggle(HIDE_CLASS, mine.length > 0 && mine.every(i => s.hidden[i.key]));
    }

    if (changed) saveSettingsDebounced();
}

/* ---------- settings UI ---------- */

function renderList() {
    const $list = $('#wandorg_list');
    if (!$list.length) return;

    const s = getSettings();
    const items = getItems().sort((a, b) => s.order.indexOf(a.key) - s.order.indexOf(b.key));

    $list.empty();

    if (!items.length) {
        $list.append('<div class="wandorg-empty">No wand items found yet.</div>');
        return;
    }

    items.forEach((item, i) => {
        const $row = $('<div class="wandorg-row"></div>');

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

        const $btns = $('<div class="wandorg-btns"></div>');
        const $up = $('<div class="menu_button wandorg-move fa-solid fa-arrow-up" title="Move up"></div>');
        const $down = $('<div class="menu_button wandorg-move fa-solid fa-arrow-down" title="Move down"></div>');
        if (i === 0) $up.addClass('disabled');
        if (i === items.length - 1) $down.addClass('disabled');

        const move = (dir) => {
            const j = i + dir;
            if (j < 0 || j >= items.length) return;
            const keys = items.map(x => x.key);
            [keys[i], keys[j]] = [keys[j], keys[i]];
            const stale = s.order.filter(k => !keys.includes(k));
            s.order = [...keys, ...stale];
            saveSettingsDebounced();
            apply();
            renderList();
        };
        $up.on('click', () => move(-1));
        $down.on('click', () => move(1));

        $btns.append($up, $down);
        $row.append($label, $btns);
        $list.append($row);
    });
}

function buildUI() {
    const html = `
    <div class="wandorg-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Wand Organizer</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <small class="wandorg-hint">Tick to show an item in the magic wand menu. Use the arrows to reorder.</small>
                <div class="wandorg-actions">
                    <div id="wandorg_show_all" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-eye"></i><span>Show all</span>
                    </div>
                    <div id="wandorg_reset_order" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-rotate-left"></i><span>Reset order</span>
                    </div>
                    <div id="wandorg_refresh" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-arrows-rotate"></i><span>Rescan</span>
                    </div>
                </div>
                <div id="wandorg_list"></div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);

    $('.wandorg-settings .inline-drawer-toggle').on('click', () => setTimeout(renderList, 50));

    $('#wandorg_show_all').on('click', () => {
        getSettings().hidden = {};
        saveSettingsDebounced();
        apply();
        renderList();
    });

    $('#wandorg_reset_order').on('click', () => {
        getSettings().order = [];
        saveSettingsDebounced();
        // order is rebuilt from the current DOM order... which we've been
        // overriding with CSS, so clear inline order first and re-read.
        getItems().forEach(({ top }) => (top.style.order = ''));
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
    new MutationObserver(scheduleApply).observe(target, { childList: true, subtree: true });

    // a couple of delayed passes for late-loading extensions
    setTimeout(apply, 2000);
    setTimeout(apply, 6000);
});
