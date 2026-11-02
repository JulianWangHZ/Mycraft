import type { AgentKind } from '@mycraft/core';
import { AGENT_NAMES } from '../lib/agents.js';

export function AgentAvatar({ agent, size = 20 }: { agent: AgentKind; size?: number }) {
  return (
    <span className="av" data-agent={agent} style={{ width: size, height: size }} role="img" aria-label={AGENT_NAMES[agent]}>
      {size >= 18 ? AGENT_NAMES[agent].charAt(0) : null}
    </span>
  );
}
