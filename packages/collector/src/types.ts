import type { AgentEvent } from '@mycraft/core';

export type ParseResult =
  | { kind: 'event'; event: AgentEvent }
  | { kind: 'skip' }
  | { kind: 'error'; reason: string };

export interface LineContext {
  filePath: string;
}

export type LineParser = (line: string) => ParseResult;

/** Creates one parser per file, so formats that spread context across lines can keep it. */
export type ParserFactory = (filePath: string) => LineParser;
