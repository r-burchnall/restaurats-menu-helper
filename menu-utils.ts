#!/usr/bin/env bun
/// <reference path="./types.d.ts" />

import { Command } from "commander";
import prompts from "prompts";

type ProcessedIngredient = string;

type MenuItem = {
  name: string;
  processed: ProcessedIngredient[];
};

type DataFileSchema = {
  items: MenuItem[];
};

function uniqueSorted<T>(items: T[]): T[] {
  return Array.from(new Set(items)).sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}

async function readData(path: string): Promise<DataFileSchema> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return { items: [] };
  }
  const text = await file.text();
  const parsed = JSON.parse(text) as DataFileSchema | MenuItem[];
  if (Array.isArray(parsed)) {
    return { items: parsed };
  }
  if (parsed && Array.isArray(parsed.items)) {
    return parsed;
  }
  throw new Error(
    "Invalid data file format. Expected { items: MenuItem[] } or MenuItem[]",
  );
}

async function writeData(path: string, data: DataFileSchema): Promise<void> {
  const pretty = JSON.stringify(data, null, 2) + "\n";
  await Bun.write(path, pretty);
}

function getDistinctProcessed(data: DataFileSchema): string[] {
  return uniqueSorted(
    data.items.flatMap((item) => item.processed ?? []).filter(Boolean),
  );
}

function getItemNames(data: DataFileSchema): string[] {
  return uniqueSorted(data.items.map((it) => it.name));
}

function findItemsContaining(
  data: DataFileSchema,
  processedIngredient: string,
): string[] {
  const target = processedIngredient.toLowerCase();
  return data.items
    .filter((it) =>
      (it.processed ?? []).some((p) => p.toLowerCase() === target),
    )
    .map((it) => it.name);
}

async function interactiveSearchProcessed(
  data: DataFileSchema,
): Promise<void> {
  const distinct = getDistinctProcessed(data);
  if (distinct.length === 0) {
    console.log("No processed ingredients found.");
    return;
  }
  const choices = distinct.map((p, i) => ({ title: p, value: i }));
  const { selectedIndexes } = await prompts(
    {
      type: "autocompleteMultiselect",
      name: "selectedIndexes",
      message: "Search/select processed ingredients",
      hint: "Type to search • ↑/↓ navigate • Space toggle • Enter confirm",
      limit: 10,
      choices,
      max: 1000,
    } as any,
    { onCancel: () => process.exit(0) },
  );
  const picked = Array.isArray(selectedIndexes)
    ? selectedIndexes.map((i: number) => distinct[i])
    : [];
  if (picked.length === 0) {
    console.log("(none selected)");
    return;
  }
  console.log("\nSelected processed ingredients:");
  for (const p of picked) {
    console.log(`- ${p}`);
  }
  const { showWhere } = await prompts(
    {
      type: "confirm",
      name: "showWhere",
      message: "Show which menu items contain these?",
      initial: false,
    },
    { onCancel: () => process.exit(0) },
  );
  if (showWhere) {
    console.log("");
    for (const p of picked) {
      const items = findItemsContaining(data, p);
      if (items.length === 0) continue;
      console.log(`${p}:`);
      for (const n of items) console.log(`  - ${n}`);
    }
  }
  console.log("");
}

async function interactiveAddProcessed(
  dataPath: string,
  data: DataFileSchema,
): Promise<void> {
  const names = getItemNames(data);
  const choices = [
    { title: "⟨Create new menu item⟩", value: "__create__" },
    ...names.map((n, i) => ({ title: n, value: i })),
  ];
  const { itemSel } = await prompts(
    {
      type: "autocomplete",
      name: "itemSel",
      message: "Select a menu item (or choose to create)",
      limit: 10,
      choices,
    } as any,
    { onCancel: () => process.exit(0) },
  );
  let item: MenuItem | undefined;
  if (itemSel === "__create__") {
    const { newName } = await prompts(
      {
        type: "text",
        name: "newName",
        message: "Enter new menu item name",
        validate: (v: string) => (v.trim().length > 0 ? true : "Required"),
      },
      { onCancel: () => process.exit(0) },
    );
    const exists = data.items.find(
      (it) => it.name.toLowerCase() === String(newName).toLowerCase(),
    );
    if (exists) {
      item = exists;
    } else {
      item = { name: newName.trim(), processed: [] };
      data.items.push(item);
    }
  } else if (Number.isInteger(itemSel)) {
    const idx = Number(itemSel);
    item = data.items.find((_, i) => i === idx);
  }
  if (!item) {
    console.log("No item selected.");
    return;
  }
  const { ingredient } = await prompts(
    {
      type: "text",
      name: "ingredient",
      message: `Add processed ingredient to "${item.name}"`,
      validate: (v: string) => (v.trim().length > 0 ? true : "Required"),
    },
    { onCancel: () => process.exit(0) },
  );
  const text = String(ingredient).trim();
  if (text.length === 0) {
    console.log("Nothing to add.");
    return;
  }
  const global = getDistinctProcessed(data);
  const existsGlobally = global.some((s) => s.toLowerCase() === text.toLowerCase());
  if (existsGlobally) {
    const { force } = await prompts(
      {
        type: "confirm",
        name: "force",
        message:
          "This processed ingredient already exists elsewhere. Add to this item anyway?",
        initial: false,
      },
      { onCancel: () => process.exit(0) },
    );
    if (!force) {
      console.log("No changes made.");
      return;
    }
  }
  const alreadyInItem = (item.processed ?? []).some(
    (s) => s.toLowerCase() === text.toLowerCase(),
  );
  if (alreadyInItem) {
    console.log("Already present in this item. No changes made.");
    return;
  }
  item.processed = [...(item.processed ?? []), text];
  await writeData(dataPath, data);
  console.log(`Added "${text}" to "${item.name}".`);
}

async function run(argv: string[]) {
  const program = new Command();
  program
    .name("menu-utils")
    .description(
      "Manage menu.json: add unique processed items or search distinct processed items.",
    )
    .option("-d, --data <path>", "path to menu JSON", "./menu.json");

  // Default interactive action when invoked without subcommands
  program.action(async () => {
    const parent = (program as unknown as { opts: () => { data: string } }).opts();
    const dataPath = parent.data || "./menu.json";
    const data = await readData(dataPath);
    const { mode } = await prompts(
      {
        type: "select",
        name: "mode",
        message: "What would you like to do?",
        choices: [
          { title: "Search/select processed ingredients", value: "search" },
          { title: "Add a processed ingredient to a menu item", value: "add" },
          { title: "Exit", value: "exit" },
        ],
        initial: 0,
      },
      { onCancel: () => process.exit(0) },
    );
    if (mode === "exit") return;
    if (mode === "search") {
      await interactiveSearchProcessed(data);
      return;
    }
    if (mode === "add") {
      await interactiveAddProcessed(dataPath, data);
      return;
    }
  });

  program
    .command("list-processed")
    .alias("search")
    .description("List distinct processed ingredients (optionally filter by query)")
    .option("-q, --query <text>", "filter processed ingredients by case-insensitive substring")
    .action(async (opts: { parent?: any; query?: string }) => {
      const parent = (program as unknown as { opts: () => { data: string } }).opts();
      const dataPath = parent.data || "./menu.json";
      const data = await readData(dataPath);
      const all = getDistinctProcessed(data);
      const filtered =
        opts.query && opts.query.length > 0
          ? all.filter((s) => s.toLowerCase().includes(opts.query!.toLowerCase()))
          : all;
      if (filtered.length === 0) {
        console.log("(none)");
        return;
      }
      for (const s of filtered) {
        console.log(s);
      }
    });

  program
    .command("add-processed")
    .description(
      "Add a processed ingredient to a menu item, ensuring global uniqueness unless --force",
    )
    .requiredOption("-i, --item <name>", "menu item name to modify (will be created with --create-item)")
    .option("--create-item", "create menu item if it does not exist", false)
    .option("--force", "allow adding if ingredient exists elsewhere", false)
    .argument("<ingredient...>", "processed ingredient text")
    .action(
      async (
        ingredientParts: string[],
        opts: { item: string; createItem?: boolean; force?: boolean },
      ) => {
        const parent = (program as unknown as { opts: () => { data: string } }).opts();
        const dataPath = parent.data || "./menu.json";
        const data = await readData(dataPath);

        const ingredient = ingredientParts.join(" ").trim();
        if (ingredient.length === 0) {
          console.error("Ingredient cannot be empty.");
          process.exit(1);
        }

        // global uniqueness
        const all = getDistinctProcessed(data);
        if (!opts.force && all.some((s) => s.toLowerCase() === ingredient.toLowerCase())) {
          console.error(
            `Ingredient already exists somewhere in the menu: "${ingredient}". Use --force to bypass.`,
          );
          process.exit(1);
        }

        // find or create item
        let item = data.items.find(
          (it) => it.name.toLowerCase() === opts.item.toLowerCase(),
        );
        if (!item) {
          if (opts.createItem) {
            item = { name: opts.item, processed: [] };
            data.items.push(item);
          } else {
            console.error(
              `Menu item not found: "${opts.item}". Use --create-item to create it.`,
            );
            process.exit(1);
          }
        }

        // per-item uniqueness
        const hasInItem = (item.processed ?? []).some(
          (s) => s.toLowerCase() === ingredient.toLowerCase(),
        );
        if (hasInItem) {
          console.log(
            `Ingredient already present in "${item.name}": "${ingredient}". No changes made.`,
          );
          return;
        }

        item.processed = [...(item.processed ?? []), ingredient];
        await writeData(dataPath, data);
        console.log(
          `Added processed ingredient to "${item.name}": "${ingredient}"`,
        );
      },
    );

  await program.parseAsync(argv);
}

run(process.argv);


