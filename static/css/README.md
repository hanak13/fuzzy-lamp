# Whiteboard Stylesheet Architecture (`static/css/`)

`style.css` is a **rule-free `@import` manifest** that loads 25 topic-scoped CSS files in load-order-critical sequence.

## Agent Navigation Rules

1. **`style.css` contains only `@imports`** — never add CSS rules directly to `style.css`.
2. **Search before reading**: Run `rg "selector-name" static/css` (or `git grep "selector-name" static/css/`) and read only the matching topic file.
3. **Shared primitives** live in:
   - `base.css` (`:root` variables, reset, `user-select`)
   - `layout-toolbar.css` (`.btn`, `.tool-btn`, `.action-btn`)
4. **Global overrides load last**: `theme-dark.css`, then `collab-core.css`, `collab-share.css`, `collab-roles.css`. Do not move these earlier in `style.css`.
5. **Keep section banner comments** in place; they serve as the map for navigating each file.

## Class → File Cheatsheet

| Selector Prefix / Pattern | File |
|---|---|
| `:root`, `*`, `html, body`, `user-select` | `base.css` |
| `.btn`, `.tool-btn`, `.toolbar-*`, `.prop-*` | `layout-toolbar.css` |
| `.top-bar-*`, `.brand-*`, `.autosave-*`, `.download-*`, `.frame-*` | `layout-topbar.css`, `layout-topbar-menus.css` |
| `.slide-*`, `.presenter-*`, `.fs-*` | `feature-slides.css`, `feature-presenter.css` |
| `.eraser-*` | `feature-eraser.css` |
| `.sidebar-*`, `.drawer-*` | `layout-sidebar-left.css` |
| `.right-boards-*`, `.boards-*` | `layout-sidebar-right.css` |
| `.shapes-*`, `.category-*`, `.my-shapes*` | `panel-shapes.css` |
| `#canvas-container`, `#zoom-widget` | `layout-canvas.css` |
| `.notes-*`, `.sticky-*` | `panel-notes.css` |
| `.modal-*`, `.toast-*`, `.shortcuts-*` | `ui-modals.css` |
| `.context-menu*` | `ui-context-menu.css` |
| `.templates-*` | `panel-templates.css` |
| `.stickers-*` | `panel-stickers.css` |
| `.stepbox-*` | `feature-stepbox.css` |
| `.minimized-*`, `.panel-restore-*` | `feature-minimize.css` |
| `body.dark-theme`, `[data-theme]` | `theme-dark.css` |
| `.media-*` | `panel-media.css` |
| `.objects-*` | `panel-objects.css` |
| `.icons-*` | `panel-icons.css` |
| `.collab-*`, `.view-only-*`, `.teacher-*` | `collab-core.css`, `collab-share.css`, `collab-roles.css` |
