import { Command } from "commander";
import { runVitest } from "./run-vitest.js";

declare module "vitest" {
  export interface ProvidedContext {
    evaliteInputHash: string;
  }
}

export const program = new Command();

program.description("Run evals once and exit").action(() => {
  runVitest({
    path: undefined,
    cwd: undefined,
    mode: "run-once-and-exit",
  });
});

program
  .command("watch")
  .description("Watch evals for file changes")
  .action(() => {
    runVitest({
      path: undefined,
      cwd: undefined,
      mode: "watch-for-file-changes",
    });
  });

program
  .command("<glob>")
  .description("Run evals at specified glob once and exit")
  .action((path) => {
    runVitest({ path, cwd: undefined, mode: "run-once-and-exit" });
  });
