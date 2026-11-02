import type { Session } from '@mycraft/core';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILDING, FLOOR_HEIGHT, FLOOR_TAG, ROOMS, type Room, type RoomId } from '../../../lib/scenes/office.js';
import { boardStats, workingCount } from '../../../lib/scenes/office-stats.js';
import { useSessionStore } from '../../../store.js';
import { useCanvasTexture } from './canvas-texture.js';
import { ROOM_ACCENT } from './palette.js';

const FLOOR_NAMES = ['ground', 'middle', 'top'] as const;
const AGENT_ROOMS = new Set<RoomId>(['claude', 'codex', 'gemini']);

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const BODY = '"Noto Sans TC", system-ui, sans-serif';
const SIGN_FONT = '700 54px "IBM Plex Mono", ui-monospace, monospace';

/** A neon sign on the back wall, drawn into a texture so walls and people can stand in front of it. */
function RoomSign({ room }: { room: Room }) {
  const { t, i18n } = useTranslation();
  const label = t(`office.room.${room.id}`).toUpperCase();
  const accent = ROOM_ACCENT[room.id];
  const texture = useCanvasTexture(
    512,
    112,
    (ctx, width, height) => {
      ctx.fillStyle = '#1b1735';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(4, 4, width - 8, height - 8, 18);
      ctx.fill();
      ctx.stroke();
      ctx.font = SIGN_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = accent;
      ctx.shadowBlur = 18;
      ctx.fillStyle = accent;
      ctx.fillText(label, width / 2, height / 2 + 2, width - 40);
    },
    `${label}:${i18n.language}`,
  );
  return (
    <mesh position={[(room.left + room.right) / 2, room.floor * FLOOR_HEIGHT + 2.92, BUILDING.back + 0.24]}>
      <planeGeometry args={[2.2, 0.48]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** The tag on the front edge of each floor slab: floor, room name and how many agents are working there. */
function FloorLabel({ room, sessions }: { room: Room; sessions: Session[] }) {
  const { t, i18n } = useTranslation();
  const working = AGENT_ROOMS.has(room.id) ? workingCount(sessions, room.id as Session['agent']) : null;
  const parts = [t(`office.floor.${FLOOR_NAMES[room.floor]}`), t(`office.room.${room.id}`)];
  if (working !== null) parts.push(t('office.working', { count: working }));
  const accent = ROOM_ACCENT[room.id];
  const texture = useCanvasTexture(
    640,
    72,
    (ctx, width, height) => {
      ctx.fillStyle = '#1b1735';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 14);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 10, height);
      ctx.textBaseline = 'middle';
      let x = 30;
      parts.forEach((part, index) => {
        ctx.font = index === 1 ? `700 34px ${BODY}` : `500 30px ${BODY}`;
        ctx.fillStyle = index === 1 ? '#ffffff' : '#c9c3ff';
        ctx.fillText(part, x, height / 2 + 2);
        x += ctx.measureText(part).width + 22;
      });
    },
    `${parts.join('|')}:${i18n.language}`,
  );
  return (
    // Clear of the slab's wool trim, whose face sits at BUILDING.front + 0.06: any closer and the two flicker as they fight for the same depth.
    <mesh position={[room.left + FLOOR_TAG.inset + FLOOR_TAG.width / 2, room.floor * FLOOR_HEIGHT + FLOOR_TAG.y, BUILDING.front + 0.12]} renderOrder={2}>
      <planeGeometry args={[FLOOR_TAG.width, FLOOR_TAG.height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function useClock(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The wall screen on the ground floor: live counts from the Kanban board and the agents. */
function TaskBoard({ sessions }: { sessions: Session[] }) {
  const { t, i18n } = useTranslation();
  const tasks = useSessionStore((state) => state.tasks);
  const now = useClock();
  const stats = boardStats(tasks, sessions, now);
  const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const columns: Array<[string, number, boolean]> = [
    [t('office.board.inProgress'), stats.inProgress, false],
    [t('office.board.needsYou'), stats.needsYou, stats.needsYou > 0],
    [t('office.board.doneToday'), stats.doneToday, false],
  ];
  const lines = stats.doing.length > 0 ? stats.doing.map((title) => `• ${title}`) : [t('office.board.nothing')];
  const texture = useCanvasTexture(
    840,
    460,
    (ctx, width, height) => {
      ctx.fillStyle = '#0f1a14';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#2a2550';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, width - 12, height - 12);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#b8f5c8';
      ctx.font = `700 40px ${BODY}`;
      ctx.fillText(t('office.board.title'), 40, 34);
      ctx.fillStyle = '#ffe08a';
      ctx.font = `700 40px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(time, width - 40, 34);
      ctx.textAlign = 'left';
      columns.forEach(([label, value, alert], index) => {
        const x = 40 + index * 260;
        ctx.fillStyle = '#b8f5c8aa';
        ctx.font = `500 26px ${BODY}`;
        ctx.fillText(label, x, 112);
        ctx.fillStyle = alert ? '#ff9f1c' : '#b8f5c8';
        ctx.font = `700 76px ${MONO}`;
        ctx.fillText(String(value), x, 150);
      });
      ctx.fillStyle = '#b8f5c8';
      ctx.font = `500 30px ${BODY}`;
      lines.forEach((line, index) => ctx.fillText(line, 40, 268 + index * 46, width - 80));
    },
    JSON.stringify([columns, lines, time, i18n.language]),
  );
  return (
    <group position={[-0.1, 1.75, BUILDING.back + 0.34]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[3.5, 1.98, 0.05]} />
        <meshStandardMaterial color="#2a2550" />
      </mesh>
      <mesh>
        <planeGeometry args={[3.36, 1.84]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function OfficeLabels({ sessions }: { sessions: Session[] }) {
  const rooms = useMemo(() => Object.values(ROOMS), []);
  return (
    <>
      {rooms.map((room) => (
        <group key={room.id}>
          <RoomSign room={room} />
          <FloorLabel room={room} sessions={sessions} />
        </group>
      ))}
      <TaskBoard sessions={sessions} />
    </>
  );
}
