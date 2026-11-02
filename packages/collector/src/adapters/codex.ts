import { basename } from 'node:path';
import { projectName, type AgentEvent, type SessionState } from '@mycraft/core';
import type { ParseResult, ParserFactory } from '../types.js';
import { personPrompt, withMeta, type SessionMeta } from './meta.js';
import { DETAIL_MAX, toolLabel, truncate } from './text.js';

const SKIP: ParseResult = { kind: 'skip' };
const SESSION_ID_IN_NAME = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;
const TOOL_CALLS = new Set(['custom_tool_call', 'function_call']);
const TOOL_OUTPUTS = new Set(['custom_tool_call_output', 'function_call_output']);

type Payload = Record<string, unknown>;

interface CodexLine {
  timestamp?: string;
  type?: string;
  payload?: Payload;
}

interface StatePart {
  state: SessionState;
  tool?: string;
  detail?: string;
}

interface FileContext {
  sessionId: string;
  cwd?: string;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function eventPart(payload: Payload): StatePart | null {
  const type = str(payload.type) ?? '';
  if (type === 'task_started') return { state: 'thinking' };
  if (type === 'task_complete') {
    const reply = str(payload.last_agent_message)?.trim();
    return reply ? { state: 'done', detail: truncate(reply, DETAIL_MAX) } : { state: 'done' };
  }
  if (type === 'turn_aborted') return { state: 'interrupted' };
  if (type === 'error') return { state: 'error' };
  if (type.endsWith('approval_request')) return { state: 'waiting', tool: 'Approval' };
  return null;
}

function responsePart(payload: Payload): StatePart | null {
  const type = str(payload.type) ?? '';
  if (type === 'reasoning' || TOOL_OUTPUTS.has(type)) return { state: 'thinking' };
  if (TOOL_CALLS.has(type)) {
    const input = str(payload.input) ?? str(payload.arguments);
    return { state: 'running', tool: toolLabel(str(payload.name) ?? 'tool', input?.split('\n')[0]) };
  }
  if (type === 'message') {
    if (payload.role === 'assistant') return { state: 'writing' };
    if (payload.role === 'user') return { state: 'thinking' };
  }
  return null;
}

function statePart(type: string | undefined, payload: Payload): StatePart | null {
  if (type === 'event_msg') return eventPart(payload);
  if (type === 'response_item') return responsePart(payload);
  return null;
}

/** Codex writes cwd and session id once at the top of the file, so the parser remembers them. */
export const createCodexParser: ParserFactory = (filePath) => {
  let context: FileContext = {
    sessionId: SESSION_ID_IN_NAME.exec(filePath)?.[1] ?? basename(filePath, '.jsonl'),
  };
  let meta: SessionMeta = {};

  return (line) => {
    if (line.trim() === '') return SKIP;
    let raw: CodexLine;
    try {
      raw = JSON.parse(line) as CodexLine;
    } catch {
      return { kind: 'error', reason: 'invalid JSON' };
    }
    const payload = raw.payload ?? {};
    const lineTs = Date.parse(raw.timestamp ?? '');
    if (raw.type === 'turn_context' && str(payload.model)) meta = { ...meta, model: str(payload.model) };
    if (raw.type === 'event_msg' && payload.type === 'task_started' && !Number.isNaN(lineTs)) meta = { ...meta, turnStartedAt: lineTs };
    if (raw.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
      const blocks = Array.isArray(payload.content) ? (payload.content as Array<{ text?: string }>) : [];
      const prompt = personPrompt(blocks.map((b) => b.text ?? '').join('\n'));
      if (prompt) meta = { ...meta, prompt };
    }
    if (raw.type === 'session_meta' || raw.type === 'turn_context') {
      context = {
        sessionId: (raw.type === 'session_meta' && str(payload.id)) || context.sessionId,
        cwd: str(payload.cwd) ?? context.cwd,
      };
      return SKIP;
    }

    const part = statePart(raw.type, payload);
    if (!part) return SKIP;
    if (!context.cwd) return { kind: 'error', reason: 'event before session_meta' };
    const ts = Date.parse(raw.timestamp ?? '');
    if (Number.isNaN(ts)) return { kind: 'error', reason: 'invalid timestamp' };

    const event: AgentEvent = {
      agent: 'codex',
      sessionId: context.sessionId,
      cwd: context.cwd,
      project: projectName(context.cwd),
      ...part,
      ts,
    };
    return { kind: 'event', event: withMeta(event, meta) };
  };
};
