# Resturats Menu Helper
_Easiest way: install with_  
```bash
curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/refs/heads/main/install.sh | bash
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## CLI: Select Menu Items and List Unique Processed Ingredients

Interactive CLI with search-ahead to pick up to 8 menu items. After confirming, it prints the unique processed ingredients needed.

Run with built-in sample data:

```bash
bun index.ts
```

Options:

- `--max <number>`: Maximum items to select (default: 8)
- `--data <path>`: Path to a JSON file containing menu items

Example:

```bash
bun index.ts --max 8 --data ./menu.json
```

Data file format can be either:

```json
{
  "items": [
    { "name": "chef special mushroom soup", "processed": ["raw sliced chicken", "well-done steak", "sliced carrot", "raw sliced mushroom", "raw sliced potato"] }
  ]
}
```

or:

```json
[
  { "name": "chef special mushroom soup", "processed": ["raw sliced chicken", "well-done steak", "sliced carrot", "raw sliced mushroom", "raw sliced potato"] }
]
```

## menu.json

A default `menu.json` is included at the repo root. The main CLI (`index.ts`) will automatically use `./menu.json` if present (or fall back to a built-in sample).

## Install (Linux/macOS) via curl | bash

This installs to `~/.local/share/restaurats-menu-helper` and creates shims `menu-cli` and `menu-manage` in `~/.local/bin`.

```bash
curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/refs/heads/main/install.sh | bash
```

Requirements: `bun`, `curl`, `tar`.

Update to latest:

```bash
curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/refs/heads/main/install.sh | bash
```

## Uninstall

Remove the installation and shims:

```bash
curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/refs/heads/main/uninstall.sh | bash
```

Or manually:

```bash
rm -rf ~/.local/share/restaurats-menu-helper
rm -f ~/.local/bin/menu-cli ~/.local/bin/menu-manage
```

## Manager CLI (menu-utils.ts)

Utility for managing `menu.json`:

- Interactive by default: pick an action, then use a search-ahead multiselect for processed ingredients, or interactively add to a menu item.
- Also supports non-interactive subcommands for scripting.

Run:

```bash
bun run menu-utils.ts --help
```

Scripts:

```bash
bun run manage
```

Examples:

- Interactive (default):

```bash
bun run manage
```

- List all distinct processed ingredients:

```bash
bun run menu-utils.ts list-processed
```

- Search processed ingredients by substring:

```bash
bun run menu-utils.ts search --query "mushroom"
```

- Add a processed ingredient to an existing item (globally unique by default):

```bash
bun run menu-utils.ts add-processed --item "chef special mushroom soup" "finely chopped parsley"
```

- Add to a new item (create the menu item if it doesn’t exist):

```bash
bun run menu-utils.ts add-processed --item "seasonal green salad" --create-item "extra virgin olive oil"
```

- Allow adding even if the ingredient exists elsewhere (bypass global uniqueness):

```bash
bun run menu-utils.ts add-processed --item "vegan buddha bowl" --force "lemon wedge"
```

## License

MIT © 2025 Ross. See `LICENSE` for details.
