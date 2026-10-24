/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { compileSafe } from '../../services/mathEngine';
import { Graph3DSettings } from '../../types/calculator';
import { 
  Play, Pause, RotateCcw, Eye, Layers, Compass, 
  Maximize2, Minimize2, ChevronDown, ChevronUp, Sparkles, Sliders
} from 'lucide-react';

// Scratch math objects to prevent garbage collection inside animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _colorA = new THREE.Color();
const _mat4A = new THREE.Matrix4();

// Colormap evaluators for vertex coloring
function getColorFromMap(valNorm: number, scheme: Graph3DSettings['colorScheme']): THREE.Color {
  const t = Math.max(0, Math.min(1, valNorm));
  switch (scheme) {
    case 'viridis': {
      // Approximation of Viridis colormap: purple -> teal -> yellow
      return _colorA.setRGB(
        Math.pow(t, 1.4) * 0.95 + (1 - t) * 0.28,
        Math.sin(t * Math.PI) * 0.7 + t * 0.25,
        (1 - t) * 0.75 + Math.sin(t * Math.PI * 0.5) * 0.2
      );
    }
    case 'ocean': {
      // Deep blue to aqua cyan and seafoam white
      return _colorA.setRGB(
        0.05 + 0.5 * Math.pow(t, 2),
        0.2 + 0.75 * t,
        0.6 + 0.4 * Math.sin(t * Math.PI * 0.5)
      );
    }
    case 'neon': {
      // Cyberpunk magenta to electric cyan
      return _colorA.setRGB(
        0.85 * (1 - t) + 0.1 * t,
        0.15 * (1 - t) + 0.85 * t,
        0.95
      );
    }
    case 'sunset': {
      // Violet to fiery orange and golden yellow
      return _colorA.setRGB(
        Math.min(1, 0.3 + 1.2 * t),
        Math.pow(t, 2) * 0.8,
        (1 - t) * 0.65
      );
    }
    case 'turbo':
    default: {
      // Turbo rainbow gradient
      const r = Math.sin(t * Math.PI * 0.9);
      const g = Math.sin(t * Math.PI);
      const b = Math.cos(t * Math.PI * 0.8);
      return _colorA.setRGB(
        Math.max(0, Math.min(1, 0.15 + 1.1 * Math.pow(t, 1.2))),
        Math.max(0, Math.min(1, 0.1 + 0.9 * g)),
        Math.max(0, Math.min(1, 0.9 * (1 - t) + 0.1 * b))
      );
    }
  }
}

interface Grapher3DProps {
  settings: Graph3DSettings;
  onUpdateSettings: (updater: (prev: Graph3DSettings) => Graph3DSettings) => void;
}

export const Grapher3D: React.FC<Grapher3DProps> = ({ settings, onUpdateSettings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Dynamic meshes references
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);
  const wireframeMeshRef = useRef<THREE.LineSegments | null>(null);
  const tangentGroupRef = useRef<THREE.Group | null>(null);
  const riemannGroupRef = useRef<THREE.Group | null>(null);
  const curveMeshRef = useRef<THREE.Mesh | null>(null);
  const revolutionMeshRef = useRef<THREE.Mesh | null>(null);

  // Animation state
  const isPlayingRef = useRef(settings.isAnimated);
  const animTimeRef = useRef(settings.time);
  const [isPlaying, setIsPlaying] = useState(settings.isAnimated);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'equation' | 'visuals' | 'calculus' | 'camera'>('equation');
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; z: number; fx: number; fy: number } | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Setup Three.js Scene following Studio PBR Guidelines
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Scene & Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.018);
    sceneRef.current = scene;

    // 4. Camera & Damped Controls
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(14, 12, 16);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 80;
    controls.minDistance = 3;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio Environment Map with PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();

    // 6. Balanced Studio 3-Point Lighting Rig
    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(16, 28, 18);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 60;
      keyLight.shadow.camera.left = -15;
      keyLight.shadow.camera.right = 15;
      keyLight.shadow.camera.top = 15;
      keyLight.shadow.camera.bottom = -15;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool Fill Light & Rim
    const fillLight = new THREE.DirectionalLight(0x70a6ff, 1.2);
    fillLight.position.set(-18, 15, -16);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    scene.add(hemiLight);

    // 7. Ground Contact Shadow & High-Precision Procedural Floor Grid
    const floorSize = 40;
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, 512);
        ctx.moveTo(0, i); ctx.lineTo(512, i);
        ctx.stroke();
      }
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(256, 0); ctx.lineTo(256, 512);
      ctx.moveTo(0, 256); ctx.lineTo(512, 256);
      ctx.stroke();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.85,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -6.0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Soft radial ground contact shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(24, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -5.98;
    scene.add(shadowMesh);

    // 8. Composite 3-12 Part Procedural 3D Coordinate Frame
    const axesGroup = new THREE.Group();
    axesGroup.name = 'axesGroup';

    // Origin Pivot Core (Sphere + Ring)
    const originGeo = new THREE.SphereGeometry(0.2, 24, 24);
    const originMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
    });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    axesGroup.add(originMesh);

    const originTorusGeo = new THREE.TorusGeometry(0.35, 0.04, 12, 32);
    const originTorusMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
    const originTorus = new THREE.Mesh(originTorusGeo, originTorusMat);
    axesGroup.add(originTorus);

    // Coordinate Shafts & Precision Arrowhead Cones: X (Red/Crimson), Y (Green/Emerald), Z (Blue/Sky)
    const axisConfigs = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xef4444, label: 'X', length: 10 },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x10b981, label: 'Y', length: 10 }, // Map Y to Z in 3D world for standard math x, y, z
      { dir: new THREE.Vector3(0, 1, 0), color: 0x38bdf8, label: 'Z', length: 8 },  // Math Z is Height (Three.js Y)
    ];

    axisConfigs.forEach((cfg) => {
      const axisSubGroup = new THREE.Group();
      // Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, cfg.length, 16);
      shaftGeo.translate(0, cfg.length / 2, 0);
      const shaftMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        roughness: 0.25,
        metalness: 0.7,
        clearcoat: 0.6,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);

      // Arrowhead cone
      const coneGeo = new THREE.ConeGeometry(0.22, 0.6, 24);
      coneGeo.translate(0, cfg.length + 0.3, 0);
      const coneMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        roughness: 0.2,
        metalness: 0.8,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);

      axisSubGroup.add(shaft);
      axisSubGroup.add(cone);

      // Rotate subgroup according to axis direction
      if (cfg.dir.x === 1) axisSubGroup.rotation.z = -Math.PI / 2;
      else if (cfg.dir.z === 1) axisSubGroup.rotation.x = Math.PI / 2;

      axesGroup.add(axisSubGroup);
    });

    scene.add(axesGroup);

    // 9. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 10. Lossless 60fps Animation Loop with exponential damping
    let frameId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const delta = clock.getDelta();
      controls.update();

      // Animate variable t if enabled
      if (isPlayingRef.current) {
        animTimeRef.current += delta * 1.5;
        // Periodic update to trigger equation recalculation smoothly
        if (Math.floor(animTimeRef.current * 10) !== Math.floor((animTimeRef.current - delta * 1.5) * 10)) {
          onUpdateSettings((prev) => ({ ...prev, time: animTimeRef.current }));
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update or regenerate 3D Surface / Curves / Riemann Prisms whenever settings change
  const updateSceneGeometry = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous dynamic meshes
    if (surfaceMeshRef.current) {
      scene.remove(surfaceMeshRef.current);
      surfaceMeshRef.current.geometry.dispose();
      (surfaceMeshRef.current.material as THREE.Material).dispose();
      surfaceMeshRef.current = null;
    }
    if (wireframeMeshRef.current) {
      scene.remove(wireframeMeshRef.current);
      wireframeMeshRef.current.geometry.dispose();
      (wireframeMeshRef.current.material as THREE.Material).dispose();
      wireframeMeshRef.current = null;
    }
    if (tangentGroupRef.current) {
      scene.remove(tangentGroupRef.current);
      tangentGroupRef.current = null;
    }
    if (riemannGroupRef.current) {
      scene.remove(riemannGroupRef.current);
      riemannGroupRef.current = null;
    }
    if (curveMeshRef.current) {
      scene.remove(curveMeshRef.current);
      curveMeshRef.current.geometry.dispose();
      curveMeshRef.current = null;
    }
    if (revolutionMeshRef.current) {
      scene.remove(revolutionMeshRef.current);
      revolutionMeshRef.current.geometry.dispose();
      revolutionMeshRef.current = null;
    }

    // Toggle Axes visibility
    const axesObj = scene.getObjectByName('axesGroup');
    if (axesObj) axesObj.visible = settings.showAxes;

    // 1. Surface Mode: z = f(x, y)
    if (settings.mode3D === 'surface' || settings.mode3D === 'riemann') {
      const compiled = compileSafe(settings.equation);
      if (!compiled) return;

      const { xMin, xMax, yMin, yMax, resolution, colorScheme, time } = settings;
      const res = Math.max(16, Math.min(100, resolution));
      const geom = new THREE.BufferGeometry();

      const vertices: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      let minZ = Infinity;
      let maxZ = -Infinity;

      // Sample grid points
      const dx = (xMax - xMin) / res;
      const dy = (yMax - yMin) / res;

      const zGrid: number[][] = [];
      for (let i = 0; i <= res; i++) {
        zGrid[i] = [];
        const xVal = xMin + i * dx;
        for (let j = 0; j <= res; j++) {
          const yVal = yMin + j * dy;
          let zVal = compiled({ x: xVal, y: yVal, t: time, r: Math.hypot(xVal, yVal) });
          if (isNaN(zVal) || !isFinite(zVal)) zVal = 0;
          zVal = Math.max(-15, Math.min(15, zVal)); // clamp extremes
          zGrid[i][j] = zVal;
          if (zVal < minZ) minZ = zVal;
          if (zVal > maxZ) maxZ = zVal;
        }
      }

      const zRange = Math.max(0.1, maxZ - minZ);

      // Generate vertex buffer & colors
      for (let i = 0; i <= res; i++) {
        const xVal = xMin + i * dx;
        for (let j = 0; j <= res; j++) {
          const yVal = yMin + j * dy;
          const zVal = zGrid[i][j];

          // Note mapping: math X -> 3D X, math Y -> 3D Z, math Z -> 3D Y (elevation)
          vertices.push(xVal, zVal, yVal);

          const norm = (zVal - minZ) / zRange;
          const col = getColorFromMap(norm, colorScheme);
          colors.push(col.r, col.g, col.b);
        }
      }

      // Generate indices for triangles
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const a = i * (res + 1) + j;
          const b = (i + 1) * (res + 1) + j;
          const c = (i + 1) * (res + 1) + (j + 1);
          const d = i * (res + 1) + (j + 1);

          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.25,
        metalness: 0.15,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
        wireframe: settings.wireframe,
      });

      const surface = new THREE.Mesh(geom, mat);
      surface.castShadow = true;
      surface.receiveShadow = true;
      scene.add(surface);
      surfaceMeshRef.current = surface;

      // Subtle contour wireframe overlay if enabled
      if (!settings.wireframe) {
        const wireGeo = new THREE.WireframeGeometry(geom);
        const wireMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.08,
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        scene.add(wireMesh);
        wireframeMeshRef.current = wireMesh;
      }

      // Interactive Tangent Plane & Gradient Vector Tripod
      if (settings.showTangentPlane) {
        const tX = settings.tangentPoint.x;
        const tY = settings.tangentPoint.y;
        const tZ = compiled({ x: tX, y: tY, t: time, r: Math.hypot(tX, tY) }) || 0;

        // Numerical partial derivatives fx and fy
        const h = 0.001;
        const fx = (compiled({ x: tX + h, y: tY, t: time, r: Math.hypot(tX + h, tY) }) - compiled({ x: tX - h, y: tY, t: time, r: Math.hypot(tX - h, tY) })) / (2 * h);
        const fy = (compiled({ x: tX, y: tY + h, t: time, r: Math.hypot(tX, tY + h) }) - compiled({ x: tX, y: tY - h, t: time, r: Math.hypot(tX, tY - h) })) / (2 * h);

        setHoverCoord({ x: tX, y: tY, z: tZ, fx, fy });

        const tGroup = new THREE.Group();

        // Contact point marker sphere
        const ptGeo = new THREE.SphereGeometry(0.22, 24, 24);
        const ptMat = new THREE.MeshPhysicalMaterial({
          color: 0xfacc15,
          emissive: 0x854d0e,
          roughness: 0.2,
          metalness: 0.9,
        });
        const ptMesh = new THREE.Mesh(ptGeo, ptMat);
        ptMesh.position.set(tX, tZ, tY);
        tGroup.add(ptMesh);

        // Tangent plane sheet: equation z = z0 + fx*(x - x0) + fy*(y - y0)
        // Tangent vectors: T1 = (1, fx, 0), T2 = (0, fy, 1). Normal: N = (-fx, 1, -fy)
        const planeSize = 3.5;
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 12, 12);
        const planeMat = new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.55,
          roughness: 0.2,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);

        // Orient plane to match normal vector (-fx, 1, -fy) in Three.js coordinates:
        // Normal in Three.js: ( -fx, 1, -fy )
        const normalVec = new THREE.Vector3(-fx, 1, -fy).normalize();
        planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec);
        planeMesh.position.set(tX, tZ, tY);
        tGroup.add(planeMesh);

        // Normal vector arrow
        const normalArrow = new THREE.ArrowHelper(
          normalVec,
          new THREE.Vector3(tX, tZ, tY),
          2.0,
          0xe11d48,
          0.4,
          0.2
        );
        tGroup.add(normalArrow);

        // Gradient vector arrow in the horizontal plane: grad = (fx, 0, fy)
        const gradVec = new THREE.Vector3(fx, 0, fy).normalize();
        const gradArrow = new THREE.ArrowHelper(
          gradVec,
          new THREE.Vector3(tX, tZ, tY),
          1.8,
          0x10b981,
          0.35,
          0.18
        );
        tGroup.add(gradArrow);

        scene.add(tGroup);
        tangentGroupRef.current = tGroup;
      }

      // 3D Riemann Sum Approximation Prisms (Double Integral Visualization)
      if (settings.showRiemannSum || settings.mode3D === 'riemann') {
        const rGroup = new THREE.Group();
        const rN = Math.max(4, Math.min(24, settings.riemannN));
        const rxStep = (xMax - xMin) / rN;
        const ryStep = (yMax - yMin) / rN;

        for (let i = 0; i < rN; i++) {
          const cx = xMin + (i + 0.5) * rxStep;
          for (let j = 0; j < rN; j++) {
            const cy = yMin + (j + 0.5) * ryStep;
            let cz = compiled({ x: cx, y: cy, t: time, r: Math.hypot(cx, cy) });
            if (isNaN(cz) || !isFinite(cz)) cz = 0;
            const hAbs = Math.abs(cz);
            if (hAbs < 0.05) continue;

            const boxGeo = new THREE.BoxGeometry(rxStep * 0.92, hAbs, ryStep * 0.92);
            // Center prism vertically between 0 and cz
            boxGeo.translate(0, hAbs / 2, 0);

            const norm = (cz - minZ) / zRange;
            const col = getColorFromMap(norm, colorScheme);
            const boxMat = new THREE.MeshPhysicalMaterial({
              color: col,
              roughness: 0.3,
              metalness: 0.2,
              transparent: true,
              opacity: 0.72,
            });
            const prism = new THREE.Mesh(boxGeo, boxMat);
            prism.position.set(cx, cz >= 0 ? 0 : -hAbs, cy);
            prism.castShadow = true;
            rGroup.add(prism);
          }
        }
        scene.add(rGroup);
        riemannGroupRef.current = rGroup;
      }
    }

    // 2. Solid of Revolution Mode: revolve y = f(x)
    else if (settings.mode3D === 'revolution') {
      const compiled = compileSafe(settings.revolutionEq);
      if (!compiled) return;

      const samples = 60;
      const xStart = Math.max(0, settings.xMin);
      const xEnd = settings.xMax;
      const dx = (xEnd - xStart) / samples;
      const points: THREE.Vector2[] = [];

      for (let i = 0; i <= samples; i++) {
        const xVal = xStart + i * dx;
        let yVal = compiled({ x: xVal, t: settings.time });
        if (isNaN(yVal) || !isFinite(yVal)) yVal = 0;
        points.push(new THREE.Vector2(Math.abs(yVal), xVal));
      }

      const revGeo = new THREE.LatheGeometry(points, 48, 0, Math.PI * 1.85); // 330 deg to show internal cross-section
      const revMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.25,
        metalness: 0.3,
        clearcoat: 0.6,
        side: THREE.DoubleSide,
      });
      const revMesh = new THREE.Mesh(revGeo, revMat);
      revMesh.rotation.z = -Math.PI / 2; // Orient along X-axis
      revMesh.castShadow = true;
      scene.add(revMesh);
      revolutionMeshRef.current = revMesh;
    }

    // 3. Parametric Space Curve Mode: r(t) = <x(t), y(t), z(t)>
    else if (settings.mode3D === 'parametric') {
      const compX = compileSafe(settings.parametric.x);
      const compY = compileSafe(settings.parametric.y);
      const compZ = compileSafe(settings.parametric.z);

      if (compX && compY && compZ) {
        const { tMin, tMax, steps } = settings.parametric;
        const curvePoints: THREE.Vector3[] = [];
        const dt = (tMax - tMin) / steps;

        for (let i = 0; i <= steps; i++) {
          const tVal = tMin + i * dt;
          const x = compX({ t: tVal });
          const y = compY({ t: tVal });
          const z = compZ({ t: tVal });
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            curvePoints.push(new THREE.Vector3(x, z, y)); // Y is elevation in Three.js
          }
        }

        if (curvePoints.length > 2) {
          const path = new THREE.CatmullRomCurve3(curvePoints);
          const tubeGeo = new THREE.TubeGeometry(path, 120, 0.22, 16, false);
          const tubeMat = new THREE.MeshPhysicalMaterial({
            color: 0xec4899,
            roughness: 0.15,
            metalness: 0.85,
            clearcoat: 0.8,
          });
          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          tubeMesh.castShadow = true;
          scene.add(tubeMesh);
          curveMeshRef.current = tubeMesh;
        }
      }
    }
  }, [settings]);

  // Re-run geometry generation when settings change
  useEffect(() => {
    updateSceneGeometry();
  }, [updateSceneGeometry]);

  // Camera presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (preset) {
      case 'top':
        cam.position.set(0, 24, 0.001);
        break;
      case 'front':
        cam.position.set(0, 4, 22);
        break;
      case 'side':
        cam.position.set(22, 4, 0);
        break;
      case 'iso':
      default:
        cam.position.set(14, 12, 16);
        break;
    }
    ctrl.target.set(0, 0, 0);
    ctrl.update();
  };

  // Toggle animation
  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    onUpdateSettings((prev) => ({ ...prev, isAnimated: next }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec Badge & Mode Switcher */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-sm">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-none text-xs text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              OmniGraph 3D Studio
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              {settings.mode3D.toUpperCase()}
            </span>
          </div>

          <div className="font-mono text-cyan-200 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 overflow-x-auto text-xs">
            {settings.mode3D === 'surface' && `z = ${settings.equation}`}
            {settings.mode3D === 'riemann' && `∬ f(x,y) dA ≈ Prisms (N=${settings.riemannN})`}
            {settings.mode3D === 'revolution' && `Revolve y = ${settings.revolutionEq} around X`}
            {settings.mode3D === 'parametric' && `r(t) = ⟨${settings.parametric.x}, ${settings.parametric.y}, ${settings.parametric.z}⟩`}
          </div>

          {hoverCoord && settings.showTangentPlane && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 font-mono text-[11px]">
              <div className="text-amber-300 flex justify-between">
                <span>Point (x₀, y₀, z₀):</span>
                <span>({hoverCoord.x.toFixed(2)}, {hoverCoord.y.toFixed(2)}, {hoverCoord.z.toFixed(2)})</span>
              </div>
              <div className="text-emerald-400 flex justify-between">
                <span>Partial ∂z/∂x:</span>
                <span>{hoverCoord.fx.toFixed(4)}</span>
              </div>
              <div className="text-emerald-400 flex justify-between">
                <span>Partial ∂z/∂y:</span>
                <span>{hoverCoord.fy.toFixed(4)}</span>
              </div>
              <div className="text-rose-400 flex justify-between">
                <span>Normal vector:</span>
                <span>⟨{(-hoverCoord.fx).toFixed(2)}, 1.00, {(-hoverCoord.fy).toFixed(2)}⟩</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Right Quick Camera Preset Floating Pills */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-lg">
        <button
          onClick={() => setCameraPreset('iso')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
          title="Isometric View"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          3D Iso
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Top Down"
        >
          Top (X-Y)
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Front View"
        >
          Front (X-Z)
        </button>
      </div>

      {/* Unified Ergonomic Bottom Control Dock (<=15% Viewport footprint, no backdrop-filter over WebGL) */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl transition-transform duration-300 ${
          controlsCollapsed ? 'translate-y-[calc(100%-2.25rem)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Zen Mode Toggle Bar */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1 text-xs font-medium bg-slate-900 border-t border-x border-slate-700/80 text-slate-300 hover:text-white rounded-t-lg shadow-md transition-colors"
          >
            {controlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show Controls (Zen Mode Off)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hide Controls (Zen Mode)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Surface */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-3.5 text-slate-200">
          {/* Dock Header Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('equation')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'equation'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Function & Mode
              </button>
              <button
                onClick={() => setActiveTab('calculus')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'calculus'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Calculus & Tangent
              </button>
              <button
                onClick={() => setActiveTab('visuals')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'visuals'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Styles & Palettes
              </button>
            </div>

            {/* Animation Play / Pause & Time readout */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Play / Pause Time Animation parameter t"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="font-mono text-[11px]">t = {settings.time.toFixed(1)}</span>
              </button>
              <button
                onClick={() => onUpdateSettings((p) => ({ ...p, time: 0 }))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700 text-xs"
                title="Reset Time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab 1: Equation & Mode Selection */}
          {activeTab === 'equation' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Mode:</span>
                {(['surface', 'riemann', 'revolution', 'parametric'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateSettings((p) => ({ ...p, mode3D: mode }))}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      settings.mode3D === mode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-medium'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {mode === 'surface' && '3D Surface z=f(x,y)'}
                    {mode === 'riemann' && '3D Riemann Integral'}
                    {mode === 'revolution' && 'Solid of Revolution'}
                    {mode === 'parametric' && 'Space Curve r(t)'}
                  </button>
                ))}
              </div>

              {settings.mode3D === 'surface' || settings.mode3D === 'riemann' ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-cyan-400 font-bold">z =</span>
                    <input
                      type="text"
                      value={settings.equation}
                      onChange={(e) => onUpdateSettings((p) => ({ ...p, equation: e.target.value }))}
                      placeholder="e.g. sin(sqrt(x^2 + y^2) - t)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  {/* Quick Preset Equation buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {[
                      { name: 'Ripples', eq: 'sin(sqrt(x^2 + y^2) - t)' },
                      { name: 'Saddle', eq: '0.2*(x^2 - y^2)' },
                      { name: 'Monkey Saddle', eq: '0.05*(x^3 - 3*x*y^2)' },
                      { name: 'Bell Wave', eq: '3*exp(-0.2*(x^2+y^2))*cos(2*r - t)' },
                      { name: 'Egg Carton', eq: 'sin(x)*cos(y)' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => onUpdateSettings((p) => ({ ...p, equation: item.eq }))}
                        className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : settings.mode3D === 'revolution' ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-cyan-400 font-bold">y =</span>
                    <input
                      type="text"
                      value={settings.revolutionEq}
                      onChange={(e) => onUpdateSettings((p) => ({ ...p, revolutionEq: e.target.value }))}
                      placeholder="e.g. sqrt(x) or sin(x) + 1.5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { name: 'Trumpet', eq: '1/(x+0.5)' },
                      { name: 'Paraboloid', eq: 'sqrt(x)' },
                      { name: 'Vase', eq: 'sin(x) + 1.8' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => onUpdateSettings((p) => ({ ...p, revolutionEq: item.eq }))}
                        className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] font-mono text-cyan-400">x(t)=</span>
                    <input
                      type="text"
                      value={settings.parametric.x}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          parametric: { ...p.parametric, x: e.target.value },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] font-mono text-emerald-400">y(t)=</span>
                    <input
                      type="text"
                      value={settings.parametric.y}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          parametric: { ...p.parametric, y: e.target.value },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] font-mono text-rose-400">z(t)=</span>
                    <input
                      type="text"
                      value={settings.parametric.z}
                      onChange={(e) =>
                        onUpdateSettings((p) => ({
                          ...p,
                          parametric: { ...p.parametric, z: e.target.value },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Calculus & Tangent Plane Controls */}
          {activeTab === 'calculus' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tangent Plane toggle and position */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={settings.showTangentPlane}
                        onChange={(e) => onUpdateSettings((p) => ({ ...p, showTangentPlane: e.target.checked }))}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      Show Dynamic Tangent Plane & Gradient
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">∇f & Normal</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>x₀: {settings.tangentPoint.x.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={settings.xMin}
                        max={settings.xMax}
                        step={0.1}
                        value={settings.tangentPoint.x}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            tangentPoint: { ...p.tangentPoint, x: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>y₀: {settings.tangentPoint.y.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={settings.yMin}
                        max={settings.yMax}
                        step={0.1}
                        value={settings.tangentPoint.y}
                        onChange={(e) =>
                          onUpdateSettings((p) => ({
                            ...p,
                            tangentPoint: { ...p.tangentPoint, y: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3D Riemann Sum Prisms */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={settings.showRiemannSum}
                        onChange={(e) => onUpdateSettings((p) => ({ ...p, showRiemannSum: e.target.checked }))}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      3D Riemann Double Integral Prisms
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">Volume Approx</span>
                  </div>

                  <div className="text-xs">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Subdivisions (N × N): {settings.riemannN} × {settings.riemannN}</span>
                      <span className="text-amber-400">{settings.riemannN * settings.riemannN} prisms</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={20}
                      step={2}
                      value={settings.riemannN}
                      onChange={(e) => onUpdateSettings((p) => ({ ...p, riemannN: parseInt(e.target.value, 10) }))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Visuals, Color Schemes & Resolution */}
          {activeTab === 'visuals' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">Color Palette</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['turbo', 'viridis', 'ocean', 'neon', 'sunset'] as const).map((scheme) => (
                    <button
                      key={scheme}
                      onClick={() => onUpdateSettings((p) => ({ ...p, colorScheme: scheme }))}
                      className={`px-2.5 py-1 text-xs rounded-lg border capitalize transition-all ${
                        settings.colorScheme === scheme
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-medium'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {scheme}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1.5">
                  Grid Resolution: {settings.resolution} × {settings.resolution}
                </span>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={settings.resolution}
                  onChange={(e) => onUpdateSettings((p) => ({ ...p, resolution: parseInt(e.target.value, 10) }))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="flex flex-col justify-center gap-2">
                <label className="text-xs text-slate-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.wireframe}
                    onChange={(e) => onUpdateSettings((p) => ({ ...p, wireframe: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  Wireframe Mesh Mode
                </label>
                <label className="text-xs text-slate-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showAxes}
                    onChange={(e) => onUpdateSettings((p) => ({ ...p, showAxes: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  Show 3D Coordinate Axes Rig
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
