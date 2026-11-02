import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, type Material, type Vector3 } from 'three';
import { buildMeshes, type MeshData, type WorldMeshes } from '../../../lib/scenes/blocks/mesh.js';
import type { World } from '../../../lib/scenes/blocks/world.js';
import { plantMaterials, sightUniforms, terrainMaterials, waterMaterials, waterTexture } from './materials.js';

const meshCache = new WeakMap<World, WorldMeshes>();

function meshesOf(world: World): WorldMeshes {
  const hit = meshCache.get(world);
  if (hit) return hit;
  const made = buildMeshes(world);
  meshCache.set(world, made);
  return made;
}

function toGeometry(data: MeshData, shaded: boolean): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2));
  if (shaded) geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  for (const { start, count, material } of data.groups) geometry.addGroup(start, count, material);
  geometry.computeBoundingSphere();
  return geometry;
}

function Surface({ data, materials, shaded, shadows }: { data: MeshData; materials: Material[]; shaded: boolean; shadows: boolean }) {
  const geometry = useMemo(() => toGeometry(data, shaded), [data, shaded]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={materials} castShadow={shadows} receiveShadow={shadows} />;
}

/**
 * Each frame: drifts the water texture so the sea and the farm channel look like they are
 * moving, and tells the terrain where the camera is looking from, so hills in the way fade.
 */
function FrameUpdates() {
  useFrame(({ camera, controls }, delta) => {
    sightUniforms.uSightCamera.value.copy(camera.position);
    const target = (controls as { target?: Vector3 } | null)?.target;
    if (target) sightUniforms.uSightTarget.value.copy(target);
    const texture = waterTexture();
    texture.offset.y = (texture.offset.y + delta * 0.06) % 1;
    texture.offset.x = (texture.offset.x + delta * 0.02) % 1;
  });
  return null;
}

/** A block world drawn as three meshes: solid blocks, cut-outs and water. Meshes are built once per world. */
export function BlockTerrain({ world }: { world: World }) {
  const meshes = meshesOf(world);
  return (
    <group>
      <Surface data={meshes.solid} materials={terrainMaterials()} shaded shadows />
      <Surface data={meshes.plants} materials={plantMaterials()} shaded shadows={false} />
      <Surface data={meshes.water} materials={waterMaterials()} shaded={false} shadows={false} />
      <FrameUpdates />
    </group>
  );
}
