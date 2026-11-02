import { describe, expect, it } from 'vitest';
import { armFace, headFaces, legFace, SKIN_SIZE, torsoFace } from './blocky-skin.js';
import { HAIR_STYLES, lookFor, type Look } from './look.js';

const base: Look = lookFor('blocky');
const PIXELS = SKIN_SIZE * SKIN_SIZE * 4;

/** Colour of a pixel counted from the top-left, as the painting is drawn. */
function pixel(data: Uint8Array, x: number, y: number): number[] {
  const p = ((SKIN_SIZE - 1 - y) * SKIN_SIZE + x) * 4;
  return Array.from(data.slice(p, p + 3));
}

describe('blocky skins', () => {
  it.each(HAIR_STYLES)('paints a solid head for %s hair', (hair) => {
    const faces = headFaces({ ...base, hair });
    for (const face of Object.values(faces)) {
      expect(face.length).toBe(PIXELS);
      expect(Array.from(face).filter((_, i) => i % 4 === 3).every((a) => a === 255)).toBe(true);
    }
  });

  it('gives the face white eyes with dark pupils, and glasses when worn', () => {
    const { front } = headFaces({ ...base, glasses: false });
    expect(pixel(front, 1, 4)).toEqual([245, 245, 245]);
    expect(pixel(front, 2, 4)).toEqual([58, 72, 140]);
    const glasses = headFaces({ ...base, glasses: true }).front;
    expect(pixel(glasses, 3, 3)).toEqual([43, 43, 51]);
  });

  it('runs long hair further down the back than short hair', () => {
    const hairRows = (hair: Look['hair']) => {
      const { back } = headFaces({ ...base, hair, hairColor: '#000000', skin: '#ffffff' });
      return Array.from({ length: SKIN_SIZE }, (_, y) => pixel(back, 3, y)).filter(([r]) => (r as number) < 40).length;
    };
    expect(hairRows('long')).toBeGreaterThan(hairRows('buzz'));
  });

  it('paints shirt, sleeves and shoes', () => {
    expect(torsoFace('#3366cc').length).toBe(PIXELS);
    const arm = armFace('#000000', { ...base, skin: '#ffffff' });
    expect((pixel(arm, 3, 0)[0] as number) < 40).toBe(true);
    expect((pixel(arm, 3, 7)[0] as number) > 200).toBe(true);
    const leg = legFace({ ...base, skirt: true, skin: '#ffffff', shoes: '#000000' });
    expect((pixel(leg, 3, 0)[0] as number) > 200).toBe(true);
    expect((pixel(leg, 3, 7)[0] as number) < 40).toBe(true);
  });
});
