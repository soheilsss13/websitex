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
    alpha: false,
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
  renderer.setClearColor(0xf5f4ef, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.6));

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0, 5.8);

  const ambient = new THREE.HemisphereLight(0xeaf7ff, 0x697a9b, 1.45);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.9);
  keyLight.position.set(-3.2, 4.2, 5.5);
  scene.add(keyLight);

  const coolLight = new THREE.DirectionalLight(0x8fc9ff, 2.2);
  coolLight.position.set(4.5, 0.8, 2.6);
  scene.add(coolLight);

  const warmLight = new THREE.PointLight(0xffd28a, 22, 7, 2);
  warmLight.position.set(-1.1, 1.2, 2.2);
  scene.add(warmLight);

  const coreLight = new THREE.PointLight(0xffd36c, 10, 3.3, 2);
  coreLight.position.set(0, 0, .08);
  scene.add(coreLight);

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
  sculpture.add(crystal);
  scene.add(sculpture);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: .035,
    roughness: .075,
    transmission: .76,
    thickness: .34,
    ior: 1.48,
    clearcoat: 1,
    clearcoatRoughness: .035,
    attenuationColor: new THREE.Color(0xafd8f0),
    attenuationDistance: 1.8,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const facetColors = [
    new THREE.Color(0xdaf5ff),
    new THREE.Color(0xa8d9f4),
    new THREE.Color(0xd9e2ff),
    new THREE.Color(0xb4ebed),
    new THREE.Color(0xf4e3bf),
    new THREE.Color(0xc5d4ff),
    new THREE.Color(0xf1f7ff),
    new THREE.Color(0x91c0e6)
  ];

  const sourceGeometry = new THREE.IcosahedronGeometry(1.22, 0).toNonIndexed();
  const sourcePositions = sourceGeometry.getAttribute('position');
  const facets = [];

  for (let offset = 0; offset < sourcePositions.count; offset += 3) {
    let a = new THREE.Vector3().fromBufferAttribute(sourcePositions, offset);
    let b = new THREE.Vector3().fromBufferAttribute(sourcePositions, offset + 1);
    let c = new THREE.Vector3().fromBufferAttribute(sourcePositions, offset + 2);
    const center = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    let normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(center) < 0) {
      [b, c] = [c, b];
      normal.negate();
    }

    const local = [a.sub(center), b.sub(center), c.sub(center)];
    const color = facetColors[(offset / 3 * 5 + 2) % facetColors.length];
    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(local.flatMap((point) => [point.x, point.y, point.z]), 3));
    faceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: 3 }, () => [color.r, color.g, color.b]).flat(), 3));
    faceGeometry.computeVertexNormals();
    faceGeometry.computeBoundingSphere();

    const pivot = new THREE.Group();
    pivot.position.copy(center);
    pivot.userData.basePosition = center.clone();
    pivot.userData.normal = normal.clone();
    pivot.userData.phase = offset * .17;
    pivot.userData.color = color;
    pivot.add(new THREE.Mesh(faceGeometry, glassMaterial));
    crystal.add(pivot);
    facets.push(pivot);
  }
  sourceGeometry.dispose();

  const outlineGeometry = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.225, 0), 3);
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x7088b6, transparent: true, opacity: .64, toneMapped: false });
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  outline.renderOrder = 2;
  crystal.add(outline);

  const innerShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.76, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xa9d5ee,
      metalness: .08,
      roughness: .12,
      transmission: .9,
      thickness: .55,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: .04,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  innerShell.renderOrder = 1;
  crystal.add(innerShell);

  const innerWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.79, 0), 4),
    new THREE.LineBasicMaterial({ color: 0x9fcbea, transparent: true, opacity: .42, toneMapped: false })
  );
  crystal.add(innerWire);

  const goldCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(.34, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0xf1c576,
      metalness: .48,
      roughness: .2,
      clearcoat: .85,
      clearcoatRoughness: .08,
      emissive: 0x8a571c,
      emissiveIntensity: .16,
      envMapIntensity: 1.45
    })
  );
  goldCore.renderOrder = 3;
  crystal.add(goldCore);

  const corePin = new THREE.Mesh(
    new THREE.SphereGeometry(.082, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1c5, toneMapped: false })
  );
  corePin.renderOrder = 4;
  crystal.add(corePin);

  const orbitalGroup = new THREE.Group();
  sculpture.add(orbitalGroup);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x8190db, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const orbitOne = new THREE.Mesh(new THREE.TorusGeometry(1.78, .004, 4, 128), orbitMaterial);
  orbitOne.rotation.set(.88, .17, -.24);
  orbitalGroup.add(orbitOne);
  const orbitTwo = new THREE.Mesh(new THREE.TorusGeometry(1.62, .003, 4, 120), orbitMaterial.clone());
  orbitTwo.material.color.set(0xc3a66e);
  orbitTwo.material.opacity = .24;
  orbitTwo.rotation.set(-.55, .72, .54);
  orbitalGroup.add(orbitTwo);

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
      { x: -1.42, y: .52, z: .43, size: 1.05, turn: -.22, speed: .22, phase: .1 },
      { x: 1.28, y: .88, z: -.28, size: .79, turn: .34, speed: -.27, phase: 2.1 },
      { x: 1.18, y: -1.02, z: .36, size: .76, turn: -.35, speed: .18, phase: 4.2 }
    ];

    settings.forEach((setting, index) => {
      const map = texture.clone();
      map.repeat.set(cellWidth / imageWidth, cellHeight / imageHeight);
      map.offset.set((gutter + index * (cellWidth + gutter)) / imageWidth, gutter / imageHeight);
      map.wrapS = THREE.ClampToEdgeWrapping;
      map.wrapT = THREE.ClampToEdgeWrapping;
      map.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map,
        color: 0xffffff,
        transparent: true,
        opacity: .92,
        alphaTest: .025,
        depthWrite: false,
        toneMapped: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(setting.x, setting.y, setting.z);
      sprite.scale.set(setting.size, setting.size, 1);
      sprite.material.rotation = setting.turn;
      sprite.userData = { ...setting, baseX: setting.x, baseY: setting.y, baseZ: setting.z };
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
      sculpture.rotation.y = elapsed * .36 + currentPointer.x * .16;
      sculpture.rotation.x = .06 + Math.sin(elapsed * .31) * .11 - currentPointer.y * .13;
      sculpture.rotation.z = Math.sin(elapsed * .19) * .045;
    } else if (!paused) {
      sculpture.rotation.y += delta * .09;
      sculpture.rotation.x = .05 + currentPointer.y * -.06;
    }

    facets.forEach((facet) => {
      const { basePosition, normal, phase } = facet.userData;
      const pulse = reducedMotion.matches ? 0 : Math.sin(elapsed * .75 + phase) * .012;
      const lift = .012 + pulse + hoverStrength * (.045 + (Math.sin(phase) + 1) * .045);
      facet.position.copy(basePosition).addScaledVector(normal, lift);
      facet.rotation.x = Math.sin(elapsed * .38 + phase) * (.008 + hoverStrength * .017);
      facet.rotation.y = Math.cos(elapsed * .33 + phase) * (.008 + hoverStrength * .018);
    });

    goldCore.rotation.y = elapsed * .52;
    goldCore.rotation.x = .22 + Math.sin(elapsed * .4) * .12;
    corePin.scale.setScalar(.88 + Math.sin(elapsed * 1.35) * .08);
    innerShell.rotation.y = -elapsed * .12;
    innerWire.rotation.x = elapsed * .08;
    orbitalGroup.rotation.y = elapsed * .11;
    orbitalGroup.rotation.x = Math.sin(elapsed * .15) * .06;

    sprites.forEach((sprite) => {
      const part = sprite.userData;
      const t = elapsed + part.phase;
      sprite.position.x = part.baseX + Math.sin(t * .53) * .055;
      sprite.position.y = part.baseY + Math.cos(t * .66) * .075;
      sprite.position.z = part.baseZ + Math.sin(t * .41) * .045;
      sprite.scale.set(part.size * (1 + Math.sin(t * .85) * .025), part.size * (1 + Math.sin(t * .85) * .025), 1);
      sprite.material.rotation = part.turn + Math.sin(t * part.speed) * .14;
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
