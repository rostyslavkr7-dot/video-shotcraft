import * as THREE from 'three';
import { squareSetup } from './squarebase.js';
import { camPath, ease } from '../world.js';
export async function build({ scene, camera, lighting, post }) {
  const S = squareSetup(scene, {});
  const path = camPath([[70, 62, 140], [40, 48, 70], [14, 40, 20]], [[0, 30, -30], [-4, 45, -44], [-10, 75, -44]]);
  return (t) => {
    lighting.azimuth = 2.3; lighting.center.set(0, 0, -20); lighting.set(0.12, { fogNear: 80, fogFar: 600 }); S.setNight(0.15); S.dust.userData.update(t);
    camera.fov = 46; camera.updateProjectionMatrix();
    path(ease((t + 0.4) / 4.8), camera);
    post.bloom.strength = 0.45;
  };
}
