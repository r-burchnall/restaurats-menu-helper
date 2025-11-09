#!/usr/bin/env bun
/// <reference path="./types.d.ts" />

import { Command } from "commander";
import prompts from "prompts";
import type { Choice } from "prompts";

type ProcessedIngredient = string;

type MenuItem = {
  name: string;
  processed: ProcessedIngredient[];
};

type DataFileSchema = {
  items: MenuItem[];
};

const SAMPLE_MENU: MenuItem[] = [
  {
    name: "chef special mushroom soup",
    processed: [
      "raw sliced chicken",
      "well-done steak",
      "sliced carrot",
      "raw sliced mushroom",
      "raw sliced potato",
    ],
  },
  {
    name: "grilled veggie platter",
    processed: [
      "sliced zucchini",
      "sliced bell pepper",
      "sliced eggplant",
      "olive oil drizzle",
      "sea salt",
    ],
  },
  {
    name: "spicy chicken tacos",
    processed: [
      "shredded chicken",
      "chopped onion",
      "chopped cilantro",
      "sliced jalapeño",
      "warm tortilla",
    ],
  },
  {
    name: "classic beef burger",
    processed: [
      "medium beef patty",
      "sliced tomato",
      "sliced onion",
      "leaf lettuce",
      "toasted bun",
    ],
  },
  {
    name: "margherita pizza",
    processed: [
      "rolled pizza dough",
      "tomato sauce",
      "fresh mozzarella slices",
      "basil leaves",
      "olive oil drizzle",
    ],
  },
  {
    name: "soba noodle salad",
    processed: [
      "boiled soba noodles",
      "julienned cucumber",
      "julienned carrot",
      "toasted sesame",
      "soy-sesame dressing",
    ],
  },
  {
    name: "butter garlic prawns",
    processed: [
      "cleaned prawns",
      "minced garlic",
      "melted butter",
      "chopped parsley",
      "lemon wedge",
    ],
  },
  {
    name: "caesar salad",
    processed: [
      "chopped romaine",
      "croutons",
      "shaved parmesan",
      "caesar dressing",
      "lemon wedge",
    ],
  },
  {
    name: "vegan buddha bowl",
    processed: [
      "steamed quinoa",
      "roasted chickpeas",
      "sliced avocado",
      "steamed broccoli",
      "tahini drizzle",
    ],
  },
  {
    name: "fish and chips",
    processed: [
      "battered white fish",
      "thick-cut fries",
      "lemon wedge",
      "tartar sauce",
      "sea salt",
    ],
  },
];

function uniqueSorted<T>(items: T[]): T[] {
  return Array.from(new Set(items)).sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}

async function loadMenuFromFile(path: string): Promise<MenuItem[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Data file not found: ${path}`);
  }
  const raw = await file.text();
  const json = JSON.parse(raw) as DataFileSchema | MenuItem[];
  if (Array.isArray(json)) {
    return json;
  }
  if (json && Array.isArray(json.items)) {
    return json.items;
  }
  throw new Error(
    "Invalid data file format. Expected { items: MenuItem[] } or MenuItem[]",
  );
}

async function promptMenuSelection(
  items: MenuItem[],
  max: number,
): Promise<MenuItem[]> {
  const choices: Choice[] = items.map((item, index) => ({
    title: item.name,
    value: index,
  }));

  // Prompt for selection with searchable multi-select
  const { selectedIndexes } = await prompts(
    {
      type: "autocompleteMultiselect",
      name: "selectedIndexes",
      message: `Select up to ${max} menu items`,
      hint: "Type to search • ↑/↓ to navigate • Space to toggle • Enter to confirm",
      limit: 10,
      choices,
      // 'max' is honored by multiselect prompts in 'prompts'
      max,
    } as any,
    {
      onCancel: () => {
        process.exit(0);
      },
    },
  );

  if (!selectedIndexes || selectedIndexes.length === 0) {
    return [];
  }

  if (selectedIndexes.length > max) {
    console.error(`Please select at most ${max} items.`);
    process.exit(1);
  }

  // Confirm the selection
  const selectionPreview = selectedIndexes
    .map((i: number) => items[i]?.name)
    .filter(Boolean)
    .join(", ");

  const { proceed } = await prompts(
    {
      type: "confirm",
      name: "proceed",
      message:
        selectedIndexes.length === 0
          ? "No items selected. Proceed?"
          : `Confirm ${selectedIndexes.length} item(s): ${selectionPreview}?`,
      initial: true,
    },
    {
      onCancel: () => {
        process.exit(0);
      },
    },
  );

  if (!proceed) {
    console.log("Selection cancelled.");
    process.exit(0);
  }

  return selectedIndexes.map((i: number) => items[i]);
}

async function runCli(argv: string[]) {
  const program = new Command();

  program
    .name("menu-cli")
    .description(
      "Select up to N menu items with search, then print unique processed ingredients.",
    )
    .option("-m, --max <number>", "maximum number of items to select", "8")
    .option(
      "-d, --data <path>",
      "path to JSON file with menu items (MenuItem[] or { items: MenuItem[] })",
    )
    .action(async (opts: { max: string; data?: string }) => {
      const max =
        Number.isFinite(Number(opts.max)) && Number(opts.max) > 0
          ? Number(opts.max)
          : 8;

      let items: MenuItem[] = SAMPLE_MENU;
      const defaultDataPath = "./menu.json";
      if (opts.data) {
        try {
          items = await loadMenuFromFile(opts.data);
        } catch (err) {
          console.error(
            `Failed to load data from "${opts.data}": ${(err as Error).message}`,
          );
          process.exit(1);
        }
      } else {
        try {
          items = await loadMenuFromFile(defaultDataPath);
        } catch {
          // fall back to SAMPLE_MENU silently if default file doesn't exist or is invalid
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        console.error("No menu items available.");
        process.exit(1);
      }

      const selectedItems = await promptMenuSelection(items, max);

      const uniqueProcessed = uniqueSorted(
        selectedItems.flatMap((it) => it.processed),
      );

      console.log("\nUnique processed ingredients:");
      if (uniqueProcessed.length === 0) {
        console.log("(none)");
      } else {
        for (const ingredient of uniqueProcessed) {
          console.log(`- ${ingredient}`);
        }
      }
      console.log("");
    });

  await program.parseAsync(argv);
}

runCli(process.argv);


