# Wand Organizer

A SillyTavern extension that lets you **show/hide** and **reorder** the items in the Magic Wand (Extensions) menu. Works on desktop and mobile.

## Features

- Adds a **Wand Organizer** drawer to the Extensions tab.
- Lists every item currently in the Magic Wand menu.
- **Checkbox** to show or hide each item.
- **Up/down arrows** to reorder items (touch-friendly, no drag-and-drop needed).
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
4. Use the arrows to move items up or down. The wand menu updates immediately.

## Notes

- Hiding is **visual only**. The extension itself keeps running; it just isn't shown in the wand menu.
- Some extensions put several buttons inside one wrapper. Those buttons move together as a group.
- Items are identified by their element ID, or by their label if they have none. If an extension renames its button, it may show up as a new entry.
- If an item doesn't appear, make sure its extension is enabled, then press **Rescan**.

## Troubleshooting

| Problem | Fix |
|---|---|
| Extension doesn't show up | Check the folder path and that `manifest.json` is inside the folder. Reload the page. |
| An item is missing from the list | Enable its extension, then press **Rescan**. |
| Order doesn't apply | Press **Rescan**, or reload the page. |
| Want to undo everything | Press **Show all** and **Reset order**. |
| Settings feel stuck | Remove the `wandOrganizer` entry from your SillyTavern settings and reload. |

## License

Free to use and modify.
