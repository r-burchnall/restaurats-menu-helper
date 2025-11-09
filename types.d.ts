declare module "prompts" {
  export type Choice = { title: string; value: any };
  const prompts: any;
  export default prompts;
}

declare module "commander" {
  export class Command {
    name(n: string): this;
    description(d: string): this;
    option(flags: string, description?: string, defaultValue?: any): this;
    action(fn: (...args: any[]) => any): this;
    parseAsync(argv: readonly string[]): Promise<void>;
  }
}


