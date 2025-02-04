import { Command } from "commander";
import { runVitest } from "./run-vitest.js";

export const createProgram = (commands: {
  watch: (path: string | undefined) => void;
  runOnceAtPath: (path: string | undefined) => void;
}) => {
  const program = new Command();

  throw new Error("Not implemented");
  
  program
    .description("Run evals once and exit")
    .action(() => commands.runOnceAtPath(undefined));

  program
    .command("watch [path]")
    .description("Watch evals for file changes")
    .action((p) => commands.watch(p));

  program
    .argument("[path]", "path to eval file")
    .description("Run evals at specified path once and exit")
    .action((p) => commands.runOnceAtPath(p));

  return program;
};

export const program = createProgram({
  watch: (path) => {
    return runVitest({
      path,
      cwd: undefined,
      mode: "watch-for-file-changes",
    });
  },
  runOnceAtPath: (path) => {
    return runVitest({
      path,
      cwd: undefined,
      mode: "run-once-and-exit",
    });
  },
});
