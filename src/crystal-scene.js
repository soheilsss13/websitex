import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('crystal-canvas');
const stage = document.getElementById('crystal-stage');
if (!canvas || !stage) throw new Error('Crystal stage is missing.');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    depth: true,
    stencil: false,
    premultipliedAlpha: false
  });
} catch (error) {
  stage.classList.add('webgl-unavailable');
  console.warn('The 3D crystal is using its lightweight image fallback.', error);
  document.dispatchEvent(new Event('crystal:ready'));
}

if (!renderer) {
  // The transparent, generated shard cutouts remain visible without WebGL.
} else {
  const scene = new THREE.Scene();
  scene.background = null;
  renderer.setClearColor(0xf5f4ef, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.6));

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0, 5.8);

  const ambient = new THREE.HemisphereLight(0xeaf7ff, 0x697a9b, 1.05);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-3.2, 4.2, 5.5);
  scene.add(keyLight);

  const coolLight = new THREE.DirectionalLight(0x8fc9ff, 1.45);
  coolLight.position.set(4.5, 0.8, 2.6);
  scene.add(coolLight);

  const warmLight = new THREE.PointLight(0xffd28a, 7, 7, 2);
  warmLight.position.set(-1.1, 1.2, 2.2);
  scene.add(warmLight);

  let environmentMap = null;
  let room = null;
  let pmrem = null;
  try {
    room = new RoomEnvironment();
    pmrem = new THREE.PMREMGenerator(renderer);
    environmentMap = pmrem.fromScene(room, .04).texture;
    scene.environment = environmentMap;
    room.dispose();
    pmrem.dispose();
  } catch (error) {
    console.warn('Room reflections are unavailable; direct lights will be used.', error);
    room?.dispose?.();
    pmrem?.dispose?.();
  }

  const sculpture = new THREE.Group();
  const crystal = new THREE.Group();
  crystal.rotation.set(.12, .24, -.035);
  sculpture.add(crystal);
  scene.add(sculpture);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: .015,
    roughness: .04,
    transmission: .95,
    thickness: .72,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: .025,
    attenuationColor: new THREE.Color(0xc6e5f4),
    attenuationDistance: 1.35,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
    depthWrite: true
  });

  const facetColors = [
    new THREE.Color(0xf2fcff),
    new THREE.Color(0xc2e5f4),
    new THREE.Color(0xdce4f8),
    new THREE.Color(0xc4e6e6),
    new THREE.Color(0xf2eadc),
    new THREE.Color(0xc9d7ed),
    new THREE.Color(0xf5fbff),
    new THREE.Color(0xb7d8e6)
  ];
  const facets = [];
  const bodyPositions = [];
  const segmentCount = 8;
  const rings = [
    { y: .94, radius: .2 },
    { y: .52, radius: .62 },
    { y: .035, radius: 1 },
    { y: .015, radius: 1 },
    { y: -.48, radius: .61 },
    { y: -.96, radius: .055 }
  ];
  const azimuth = (index) => (index / segmentCount) * Math.PI * 2 + Math.PI / 8;
  const ringPoint = (ring, index) => {
    const angle = azimuth(index);
    return new THREE.Vector3(Math.cos(angle) * ring.radius, ring.y, Math.sin(angle) * ring.radius);
  };
  let facetNumber = 0;

  function addFacet(points, phase, colorIndex) {
    const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
    const ordered = [...points];
    let normal = ordered[1].clone().sub(ordered[0]).cross(ordered[2].clone().sub(ordered[0])).normalize();
    if (normal.dot(center) < 0) {
      ordered.reverse();
      normal.negate();
    }
    const triangles = ordered.length === 4
      ? [ordered[0], ordered[1], ordered[2], ordered[0], ordered[2], ordered[3]]
      : ordered;
    bodyPositions.push(...triangles.flatMap((point) => point.clone().multiplyScalar(.993).toArray()));
    const localPositions = triangles.flatMap((point) => point.clone().sub(center).toArray());
    const color = facetColors[colorIndex % facetColors.length];
    const localColors = Array.from({ length: triangles.length }, () => [color.r, color.g, color.b]).flat();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(localPositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(localColors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const part = new THREE.Group();
    part.position.copy(center);
    part.userData.basePosition = center.clone();
    part.userData.normal = normal.clone();
    part.userData.phase = phase;
    part.add(new THREE.Mesh(geometry, glassMaterial));
    crystal.add(part);
    facets.push(part);
    facetNumber += 1;
  }

  // One continuous, cut-glass silhouette assembled from individually animated facets.
  // The ring proportions create a crown, a narrow girdle, and a pointed pavilion.
  for (let layer = 0; layer < rings.length - 1; layer += 1) {
    for (let side = 0; side < segmentCount; side += 1) {
      const next = (side + 1) % segmentCount;
      const upperA = ringPoint(rings[layer], side);
      const upperB = ringPoint(rings[layer], next);
      const lowerA = ringPoint(rings[layer + 1], side);
      const lowerB = ringPoint(rings[layer + 1], next);
      const phase = facetNumber * .37 + side * .21;
      if (layer !== 2) {
        addFacet([upperA, upperB, lowerA], phase, side);
        addFacet([upperB, lowerB, lowerA], phase + .8, side + 4);
      } else {
        addFacet([upperA, upperB, lowerB, lowerA], phase, side + 2);
      }
    }
  }

  const tableCenter = new THREE.Vector3(0, rings[0].y, 0);
  const culetCenter = new THREE.Vector3(0, -1.015, 0);
  for (let side = 0; side < segmentCount; side += 1) {
    const next = (side + 1) % segmentCount;
    addFacet([tableCenter, ringPoint(rings[0], side), ringPoint(rings[0], next)], facetNumber * .37, side + 1);
    addFacet([culetCenter, ringPoint(rings[rings.length - 1], next), ringPoint(rings[rings.length - 1], side)], facetNumber * .37 + 1.3, side + 4);
  }

  const solidGeometry = new THREE.BufferGeometry();
  solidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyPositions, 3));
  solidGeometry.computeVertexNormals();
  solidGeometry.computeBoundingSphere();
  const solidGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: .02,
    transmission: .97,
    thickness: .8,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: .015,
    attenuationColor: new THREE.Color(0xa4d3e8),
    attenuationDistance: 1.8,
    envMapIntensity: 2.1,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  const crystalBody = new THREE.Mesh(solidGeometry, solidGlassMaterial);
  crystalBody.renderOrder = -1;
  crystal.add(crystalBody);

  const orbitalGroup = new THREE.Group();
  sculpture.add(orbitalGroup);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x8794d2, transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const orbitOne = new THREE.Mesh(new THREE.TorusGeometry(1.62, .003, 4, 128), orbitMaterial);
  orbitOne.rotation.set(.86, .16, -.25);
  orbitalGroup.add(orbitOne);

  const texturePath = new URL('../images/crystal-sprite-sheet.png', import.meta.url).href;
  const loader = new THREE.TextureLoader();
  const sprites = [];
  let atlasTexture = null;

  function addCutoutShards(texture) {
    atlasTexture = texture;
    atlasTexture.colorSpace = THREE.SRGBColorSpace;
    atlasTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTexture.magFilter = THREE.LinearFilter;
    atlasTexture.generateMipmaps = true;

    const imageWidth = texture.image.width;
    const imageHeight = texture.image.height;
    const gutter = 12;
    const cellWidth = 512;
    const cellHeight = 512;
    const settings = [
      { x: -1.34, y: .61, z: .48, size: .86, turn: -.22, tiltX: .18, tiltY: -.14, speed: .22, phase: .1 },
      { x: 1.26, y: .82, z: -.4, size: .68, turn: .34, tiltX: -.2, tiltY: .24, speed: -.27, phase: 2.1 },
      { x: 1.24, y: -.96, z: .48, size: .68, turn: -.35, tiltX: .24, tiltY: .16, speed: .18, phase: 4.2 }
    ];
    const shardGeometry = new THREE.PlaneGeometry(1, 1);

    settings.forEach((setting, index) => {
      const map = texture.clone();
      map.repeat.set(cellWidth / imageWidth, cellHeight / imageHeight);
      map.offset.set((gutter + index * (cellWidth + gutter)) / imageWidth, gutter / imageHeight);
      map.wrapS = THREE.ClampToEdgeWrapping;
      map.wrapT = THREE.ClampToEdgeWrapping;
      map.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        map,
        color: 0xffffff,
        transparent: true,
        opacity: .9,
        alphaTest: .035,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const sprite = new THREE.Mesh(shardGeometry, material);
      sprite.position.set(setting.x, setting.y, setting.z);
      sprite.scale.set(setting.size, setting.size, 1);
      sprite.rotation.set(setting.tiltX, setting.tiltY, setting.turn);
      sprite.userData = {
        ...setting,
        baseX: setting.x,
        baseY: setting.y,
        baseZ: setting.z,
        baseRx: setting.tiltX,
        baseRy: setting.tiltY
      };
      sculpture.add(sprite);
      sprites.push(sprite);
    });

    stage.classList.add('is-webgl');
    document.dispatchEvent(new Event('crystal:ready'));
    drawStill();
  }

  loader.load(texturePath, addCutoutShards, undefined, (error) => {
    console.warn('The crystal atlas could not be loaded; the 3D mesh remains active.', error);
    stage.classList.add('is-webgl');
    document.dispatchEvent(new Event('crystal:ready'));
    drawStill();
  });

  const targetPointer = new THREE.Vector2(0, 0);
  const currentPointer = new THREE.Vector2(0, 0);
  let hoverStrength = 0;
  let hoverTarget = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let inView = true;
  let paused = document.getElementById('crystal-toggle')?.getAttribute('aria-pressed') === 'true';

  function updateSize() {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const maxDpr = window.innerWidth < 700 ? 1.25 : 1.6;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
    camera.aspect = bounds.width / bounds.height;
    camera.position.z = bounds.width < 560 ? 6.25 : bounds.width < 900 ? 5.85 : 5.55;
    camera.updateProjectionMatrix();
    drawStill();
  }

  function drawFrame(delta) {
    elapsed += delta;
    currentPointer.lerp(targetPointer, Math.min(1, delta * 3.7));
    hoverStrength += (hoverTarget - hoverStrength) * Math.min(1, delta * 3.4);

    if (!paused && !reducedMotion.matches) {
      sculpture.rotation.y = elapsed * .44 + currentPointer.x * .16;
      sculpture.rotation.x = .06 + Math.sin(elapsed * .31) * .11 - currentPointer.y * .13;
      sculpture.rotation.z = Math.sin(elapsed * .19) * .045;
    } else if (!paused) {
      sculpture.rotation.y += delta * .09;
      sculpture.rotation.x = .05 + currentPointer.y * -.06;
    }

    facets.forEach((facet) => {
      const { basePosition, normal, phase } = facet.userData;
      const pulse = reducedMotion.matches ? 0 : Math.sin(elapsed * .75 + phase) * .0035;
      const lift = .003 + pulse + hoverStrength * (.006 + (Math.sin(phase) + 1) * .006);
      facet.position.copy(basePosition).addScaledVector(normal, lift);
      facet.rotation.x = Math.sin(elapsed * .38 + phase) * (.002 + hoverStrength * .005);
      facet.rotation.y = Math.cos(elapsed * .33 + phase) * (.002 + hoverStrength * .005);
    });

    orbitalGroup.rotation.y = elapsed * .09;
    orbitalGroup.rotation.x = Math.sin(elapsed * .15) * .06;

    sprites.forEach((sprite) => {
      const part = sprite.userData;
      const t = elapsed + part.phase;
      sprite.position.x = part.baseX + Math.sin(t * .53) * .045;
      sprite.position.y = part.baseY + Math.cos(t * .66) * .06;
      sprite.position.z = part.baseZ + Math.sin(t * .41) * .04;
      const scale = part.size * (1 + Math.sin(t * .85) * .02);
      sprite.scale.set(scale, scale, 1);
      sprite.rotation.x = part.baseRx + Math.sin(t * .42) * .09;
      sprite.rotation.y = part.baseRy + Math.cos(t * .36) * .11;
      sprite.rotation.z = part.turn + Math.sin(t * part.speed) * .11;
    });

    renderer.render(scene, camera);
  }

  function drawStill() {
    if (!renderer) return;
    drawFrame(0);
  }

  function animate(now) {
    animationFrame = 0;
    if (paused || !inView || document.hidden) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .04) : 1 / 60;
    lastFrame = now;
    drawFrame(delta);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function start() {
    if (!animationFrame && !paused && inView && !document.hidden) {
      lastFrame = 0;
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function stop() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrame = 0;
  }

  document.addEventListener('crystal:toggle', (event) => {
    paused = Boolean(event.detail?.paused);
    if (paused) {
      stop();
      drawStill();
    } else {
      start();
    }
  });

  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = stage.getBoundingClientRect();
    targetPointer.x = THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width - .5) * 2, -1, 1);
    targetPointer.y = THREE.MathUtils.clamp(((event.clientY - bounds.top) / bounds.height - .5) * 2, -1, 1);
    hoverTarget = .9;
  }, { passive: true });

  stage.addEventListener('pointerleave', () => {
    targetPointer.set(0, 0);
    hoverTarget = 0;
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    if (inView) start();
    else stop();
  }, { rootMargin: '100px 0px' });
  observer.observe(stage);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', updateSize, { passive: true });
  }

  updateSize();
  if (!paused) start();
  else drawStill();
  if (!atlasTexture) document.dispatchEvent(new Event('crystal:ready'));

  window.addEventListener('pagehide', () => {
    stop();
    observer.disconnect();
    atlasTexture?.dispose();
    sprites.forEach((sprite) => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material && object.material !== glassMaterial) {
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
    glassMaterial.dispose();
    environmentMap?.dispose();
    renderer.dispose();
  }, { once: true });
}
