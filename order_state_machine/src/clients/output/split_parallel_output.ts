import { errToString, type Reporter } from "./output";
import type { Region } from "../regions.ts";
import chalk from "chalk";
import ansiEscapes from "ansi-escapes-common";

class SplitScreenReporter implements Reporter {

  public readonly column1: ColumnReporter;
  public readonly column2: ColumnReporter;

  constructor(
      private readonly width: number,
      private readonly offset: number,
      columnOffset: number) {

    const columnWidth = Math.floor(width / 2);
    this.column1 = new ColumnReporter(columnOffset, columnWidth - columnOffset);
    this.column2 = new ColumnReporter(columnWidth + columnOffset, columnWidth - columnOffset);
  }

  msg(msg: string): Reporter {
    this.write(msg, true);
    return this;
  }
  invocationStart(): Reporter {
    throw new Error("Method not implemented.");
  }
  connectionError(): Reporter {
    throw new Error("Method not implemented.");
  }
  invocationComplete(): Reporter {
    throw new Error("Method not implemented.");
  }
  n(): Reporter {
    this.write("", false);
    return this;
  }
  clearOutput(): Reporter {
    console.clear();
    return this;
  }

  private write(text: string, newLine: boolean): void {
    const row = Math.max(this.column1.getRow(), this.column2.getRow()) + 1;

    process.stdout.write(ansiEscapes.cursorTo(this.offset, row));
    process.stdout.write(text);

    let newRow = row + Math.floor((text.length + this.offset) / this.width);
    if (newLine) {
      process.stdout.write("\n");
      newRow++;
    }
    this.column1.newSection(newRow);
    this.column2.newSection(newRow);
  }
}

class ColumnReporter implements Reporter {

  private pos: number = 0;
  private row: number = 0;

  constructor(
      private readonly lineOffset: number,
      private readonly columnWidth: number) {}

  getRow(): number {
    return this.row;
  }
  newSection(row: number): void {
    this.row = row;
    this.pos = this.lineOffset;
  }

  msg(msg: string): Reporter {
    while (msg.length > this.columnWidth) {
      const prefix = msg.substring(0, this.columnWidth);
      msg = msg.substring(this.columnWidth);
      this.write(prefix, prefix.length);
      this.newLine();
    }
    this.write(msg, msg.length);
    this.newLine();
    return this;
  }
  invocationStart(handler: string, region: Region): Reporter {
    const text = `Calling ${chalk.bold(chalk.blue(handler + "()"))} ----> ${chalk.magenta(region.name)} ----> `
    const len = 24 + handler.length + region.name.length;
    this.write(text, len);
    return this;
  }
  connectionError(err: unknown): Reporter {
    this.write("❌", 1);
    this.newLine();
    this.msg(" -- Connection failed: " + errToString(err));
    return this;
  }
  invocationComplete(): Reporter {
    this.write("✅", 1);
    this.newLine();
    return this;
  }
  n(): Reporter {
    this.newLine();
    return this;
  }
  clearOutput(): Reporter {
    throw new Error("Not permitted on column.");
  }

  private write(text: string, textWidth: number): void {
    process.stdout.write(ansiEscapes.cursorTo(this.pos, this.row));
    process.stdout.write(text);
    this.pos += textWidth;
  }
  private newLine(): void {
    this.pos = this.lineOffset;
    this.row++;
  }
}

export function startSplitScreen(): { rootReporter: Reporter, column1: Reporter, column2: Reporter} {
  const columns = getConsoleWidth();
  const rootReporter = new SplitScreenReporter(columns, 5, 2); 
  
  return {
    rootReporter,
    column1: rootReporter.column1,
    column2: rootReporter.column2
  };
}

// hack to make this work across deno and nodejs
declare const Deno: {
  isatty: boolean,
  consoleSize: () => { columns: number };
  stdout: {
    rid: number;
  };
};

function getConsoleWidth(): number {
  if (typeof Deno !== "undefined" && Deno.isatty) {
      // For Deno
      const { columns } = Deno.consoleSize();
      return columns;
  } else if (typeof process !== "undefined" && process.stdout && process.stdout.columns) {
      // For Node.js
      return process.stdout.columns;
  } else {
      // Default fallback
      return 80;
  }
}

console.log(`Console width: ${getConsoleWidth()} characters`);

