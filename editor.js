import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ======= SCENE SETUP =======
const canvas = document.getElementById('model-canvas');
const scene = new THREE.Scene();
// Inherit website background instead of black
// scene.background removed

const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 15); // Look straight at the page

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Removed OrbitControls so the camera stays locked flat to the screen

// Lighting
const ambientLight = new THREE.AmbientLight(0x405060, 3);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 4);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 1);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// Grid helper removed per user request

// ====== SCROLL SYNC =======
// Distance in 3D space equal to 100vh scroll
const SCROLL_DISTANCE = 15;

window.addEventListener('scroll', () => {
    // Scroll down -> Camera moves down (negative Y)
    const scrollRatio = window.scrollY / window.innerHeight;
    camera.position.y = - (scrollRatio * SCROLL_DISTANCE);
});

// ======= MODEL MANAGEMENT =======
const gltfLoader = new GLTFLoader();
const models = []; // { id, filename, mesh, fixed, position }

// ======= LOAD A MODEL INTO SCENE =======
function loadModel(id, filename, position, fixed) {
    gltfLoader.load(`models/${encodeURIComponent(filename)}?t=${Date.now()}`, (gltf) => {
        const mesh = gltf.scene;

        // Auto-scale: cap the max dim strictly!
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        // User requested models to be much larger. Scale to 7.0 bounds to be highly visible!
        const scale = 7.0 / (maxDim || 1);
        mesh.scale.setScalar(scale);

        // Re-center
        const box2 = new THREE.Box3().setFromObject(mesh);
        box2.getCenter(new THREE.Vector3());

        // Boost material clarity and prevent transparency overlap issues
        mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.depthWrite = true;
                // Removed multiplyScalar from color to restore native PBR clarity and prevent white-washing!
            }
        });

        mesh.position.set(position.x, position.y, position.z);

        scene.add(mesh);

        const entry = { id, filename, mesh, fixed, position: { x: mesh.position.x, y: position.y, z: mesh.position.z } };
        models.push(entry);
    }, undefined, (err) => {
        console.warn(`Failed to load ${filename}`);
    });
}

// ======= LOAD SAVED STATE ON STARTUP =======
async function loadSavedState() {
    try {
        const res = await fetch(`model_positions.json?t=${Date.now()}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            const wrapper = document.getElementById('showcase-wrapper');
            wrapper.innerHTML = ''; // Ensure clean slate

            data.forEach((entry, index) => {
                // Support both old JSON object formats and our new clean String Array format!
                const filename = typeof entry === 'string' ? entry : entry.filename;

                // 1. AUTO-LAYOUT MATH ENGINE
                // Alternating placement: Evens (0, 2...) go Left (-12.0), Odds (1, 3...) go Right (12.0)
                const autoX = (index % 2 === 0) ? -12.0 : 12.0;
                // Move down exactly 100vh depths per slot natively (15 units)
                const autoY = -15 * (index + 1);

                const calculatedPosition = { x: autoX, y: autoY, z: -2 };

                // 2. AUTO-HTML GENERATOR
                const section = document.createElement('section');
                section.className = 'showcase-slot';
                section.id = `slot-${index + 1}`;
                wrapper.appendChild(section);

                // 3. INJECT MATHEMATICALLY PLACED MODEL
                loadModel(`model_${index + 1}`, filename, calculatedPosition, true);
            });
        }
    } catch (e) {
        console.warn('No auto-layout payload found.');
    }
}

loadSavedState();

// ======= LOAD 3D GUIDES =======
let entryMixer, exitMixer;
const clock = new THREE.Clock();

// Global handles for main.js to cleanly switch their visibility
window.EntryModel = null;
window.ExitModel = null;

// Tweak these XYZ coordinates to perfectly adjust where the guide stands!
const ENTRY_POS = { x: 12.0, y: -4.0, z: -3 }; // Flipped rigidly manually to the Right Side
const EXIT_POS = { x: 12.0, y: -4.0, z: -3 };

function loadGuides() {
    // 1. Load the Entry sequence character
    gltfLoader.load(`models/entry.glb?t=${Date.now()}`, (gltf) => {
        const mesh = gltf.scene;
        // Adjust the scale to match your specific model sizes
        mesh.scale.setScalar(5.0);
        mesh.position.set(ENTRY_POS.x, ENTRY_POS.y, ENTRY_POS.z);

        // Rotate 60 degrees angle towards the TV on the left!
        mesh.rotation.y = -60 * (Math.PI / 180);

        scene.add(mesh);

        window.EntryModel = mesh;

        if (gltf.animations && gltf.animations.length > 0) {
            entryMixer = new THREE.AnimationMixer(mesh);
            entryMixer.clipAction(gltf.animations[0]).play();
        }
    });

    // 2. Load the Exit sequence character
    gltfLoader.load(`models/exit.glb?t=${Date.now()}`, (gltf) => {
        const mesh = gltf.scene;
        // Adjust the scale to match your specific model sizes
        mesh.scale.setScalar(5.0);
        mesh.position.set(EXIT_POS.x, EXIT_POS.y, EXIT_POS.z);

        // Rotate 60 degrees identically
        mesh.rotation.y = -60 * (Math.PI / 180);

        // Start completely hidden! main.js activates it when video hits Shark Sequence
        mesh.visible = false;
        scene.add(mesh);

        window.ExitModel = mesh;

        if (gltf.animations && gltf.animations.length > 0) {
            exitMixer = new THREE.AnimationMixer(mesh);
            exitMixer.clipAction(gltf.animations[0]).play();
        }
    });
}
loadGuides();

// ======= RENDER LOOP =======
function animate() {
    requestAnimationFrame(animate);

    // Smoothly animate both guides if they natively contain skeletal animations
    const delta = clock.getDelta();
    if (entryMixer) entryMixer.update(delta);
    if (exitMixer) exitMixer.update(delta);

    // Auto-spin models globally so they look alive like spinning spheres!
    models.forEach(m => {
        if (m.mesh) {
            m.mesh.rotation.y += 0.005;
        }
    });

    renderer.render(scene, camera);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});
