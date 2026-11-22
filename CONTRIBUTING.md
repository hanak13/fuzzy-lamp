# Contributing to Whiteboard

Thank you for taking the time to contribute! This document covers everything you need to get started.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Quick Start](#quick-start)
3. [Development Workflow](#development-workflow)
4. [Pull Request Guidelines](#pull-request-guidelines)
5. [Code Style](#code-style)
6. [How to Add a New Shape](#how-to-add-a-new-shape)
7. [Reporting Bugs](#reporting-bugs)

---

## Code of Conduct

Be respectful, constructive, and kind. Contributions of all skill levels are welcome.

---

## Quick Start

### 1. Fork the repository

Click **Fork** on GitHub to create your own copy.

### 2. Clone your fork

```bash
git clone https://github.com/hanak13/fuzzy-lamp.git
cd fuzzy-lamp
```

### 3. Set up the development environment

```bash
# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Start the development server

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

The `--reload` flag restarts the server automatically when Python files change.
Frontend changes (HTML / CSS / JS) take effect immediately on browser refresh — no restart needed.

---

## Development Workflow

### Create a feature branch

Always branch off `master` using a descriptive name:

```bash
# Bug fix
git checkout -b fix/eraser-circle-overlap

# New feature
git checkout -b feat/grid-snap

# Documentation
git checkout -b docs/user-guide-shapes
```

### Make your changes

- Keep commits small and focused — one logical change per commit.
- Write a clear commit message:

```
feat(shapes): add Gantt chart shape to static/shapes.json
fix(eraser): prevent circle eraser from deleting grid lines
docs(readme): add macOS setup instructions
```

Format: `<type>(<scope>): <short description>`
Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

### Push your branch

```bash
git push origin feat/your-feature-name
```

---

## Pull Request Guidelines

1. Open a PR against the `master` branch of the original repo.
2. Fill in the PR description:
   - **What** was changed and **why**.
   - **How** to test it (steps to reproduce or verify).
   - Screenshots or a short screen recording for visual changes.
3. Keep the PR focused — avoid unrelated cleanup in the same PR.
4. All `console.error` / `console.warn` calls must have a meaningful message; remove any `console.log` debug statements before submitting.
5. The server must start cleanly (`uvicorn app:app`) with no Python errors before submitting.

---

## Code Style

### Python (`app.py`, `db.py`)

- Follow **PEP 8** — 4-space indentation, max 100 characters per line.
- Use type hints for all function signatures.
- Use `f-strings` for string formatting.
- No bare `except:` — always catch a specific exception type.
- Error messages inside export routes should use `print(...)` only for now (logging refactor is on the roadmap).

### JavaScript (`static/js/*.js`)

- Code is split across 15 modular subsystems in `static/js/` (`core.js`, `tools.js`, `shapes.js`, `notes.js`, `icons.js`, `ui.js`, `slides.js`, `modes.js`, `steps.js`, `objects.js`, `interactions.js`, `commands.js`, `boards.js`, `export.js`, `collab.js`).
- 4-space indentation, single quotes for strings.
- No `var` — use `const` and `let`.
- No `console.log` in committed code; `console.error` / `console.warn` are acceptable for real error paths.
- DOM lookups happen once at the top of each module's IIFE or `initUI()` method.
- Shared properties and cross-module APIs are namespaced under `window.WhiteboardApp` with clean backward-compatible window bindings.
- Keep the `EXTRA_PROPS` array up to date with any new custom properties added to canvas objects.

### CSS (`static/css/style.css`)

- Use CSS custom properties (`--variable-name`) from `:root` for all colours and shadows.
- Dark-mode overrides live in the `body.dark-theme { }` block at the bottom of the file.
- BEM-style class names for new components: `.block__element--modifier`.

### HTML (`templates/index.html`)

- All interactive elements need a `title` attribute for accessibility.
- Keep IDs unique and descriptive (`btn-minimize-top-bar`, not `btn1`).
- No inline `style` attributes except for one-time display toggling (`style="display: none;"`).

---

## How to Add a New Shape

Shapes are stored as plain JSON in `static/shapes.json`. No Python or backend changes are needed.

### Shape object schema

```jsonc
{
  "id": "my_new_shape",           // unique snake_case identifier
  "name": "My New Shape",         // displayed in the shapes panel
  "category": "General",          // category pill in the sidebar
  "tags": ["keyword1", "keyword2"],
  "viewBox": "0 0 100 100",       // SVG viewBox matching the path coordinates
  "path": "M 10 10 L 90 10 ..."   // SVG path data (d attribute)
}
```

### Step-by-step

1. Open `static/shapes.json`.
2. Find the correct category array (or create a new one at the bottom).
3. Add your shape object following the schema above.
4. Open the app in your browser, search for the shape name in the Shapes panel, and verify it renders correctly.
5. Verify fill colour, border colour, and text-inside behaviour work as expected by clicking the shape onto the canvas.
6. Commit with message: `feat(shapes): add <Shape Name> to <Category> category`

### Tips

- Keep SVG paths normalised to a `0 0 100 100` viewBox where possible — the app scales them automatically.
- Complex multi-path shapes can be combined as a single `path` with subpaths separated by `M` moves.
- Test your shape at multiple zoom levels to check for aliasing or clipping issues.

---

## Reporting Bugs

1. Search [existing issues](https://github.com/hanak13/fuzzy-lamp/issues) first.
2. If none match, open a new issue with:
   - **Browser + OS** (e.g. Chrome 124 on Windows 11)
   - **Steps to reproduce**
   - **Expected behaviour**
   - **Actual behaviour** (paste any console errors)
   - **Screenshots** if relevant
