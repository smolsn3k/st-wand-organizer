# Wand Organizer

A SillyTavern extension that lets you **show/hide** and **reorder** the items in the Magic Wand (Extensions) menu. Works on desktop and mobile. Available in **English** and **Русский**.

## Features

- Adds a **Wand Organizer** drawer to the Extensions tab.
- Lists every item currently in the Magic Wand menu.
- **Checkbox** to show or hide each item.
- **Drag and drop** reordering using the handle (≡) on the right of each row. Works with mouse and touch, and the list auto-scrolls when you drag near the top or bottom edge.
- **Language selector**: Auto (follows your browser), English, or Русский.
- **Show all**: unhides everything.
- **Reset order**: restores the order items had when the page first loaded.
- **Rescan**: re-reads the wand menu if something looks out of date.
- Settings are saved automatically and persist across reloads.
- Items added later by other extensions are picked up automatically.
- Empty placeholder entries (from disabled/inactive extensions) are not listed.

## Installation

### Option 1: Manual

1. Copy the `wand-organizer` folder into one of:
   - `SillyTavern/public/scripts/extensions/third-party/`
   - `SillyTavern/data/<your-user>/extensions/`
2. Restart or reload SillyTavern.

### Option 2: From a GitHub repo (easiest on mobile/Termux)

1. Upload the folder contents to a GitHub repository.
2. In SillyTavern, open **Extensions → Install extension**.
3. Paste the repository URL and install.

The folder should contain:

```
wand-organizer/
├── manifest.json
├── index.js
├── style.css
└── README.md
```

## Usage

1. Open the **Extensions** tab (the stacked-blocks icon).
2. Expand **Wand Organizer**.
3. Untick an item to hide it from the wand menu; tick it to show it again.
4. Press and hold the **≡ handle** on the right of a row, then drag it up or down. Release to drop. The wand menu updates immediately.
5. Change the language with the **Language** dropdown if you want to override Auto.

## Notes

- Hiding is **visual only**. The extension itself keeps running; it just isn't shown in the wand menu.
- Dragging only works from the handle, so scrolling the list by touching a row's name still works normally.
- Some extensions put several buttons inside one wrapper. Those buttons move together as a group.
- Items are identified by their element ID, or by their label if they have none. If an extension renames its button, it may show up as a new entry.
- If an item doesn't appear, make sure its extension is enabled, then press **Rescan**.

## Troubleshooting

| Problem | Fix |
|---|---|
| Extension doesn't show up | Check the folder path and that `manifest.json` is inside the folder. Reload the page. |
| An item is missing from the list | Enable its extension, then press **Rescan**. |
| Order doesn't apply | Press **Rescan**, or reload the page. |
| Page scrolls instead of dragging | Make sure you're touching the ≡ handle, not the item name. |
| Want to undo everything | Press **Show all** and **Reset order**. |
| Settings feel stuck | Remove the `wandOrganizer` entry from your SillyTavern settings and reload. |

## License

Free to use and modify.
