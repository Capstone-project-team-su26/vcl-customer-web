import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./LogisticsLoading.css";

const DEFAULT_MESSAGES = [
    "Đang kết nối hệ thống Việt Nam Logistic...",
    "Đang xác thực tài khoản của bạn...",
    "Đang đồng bộ dữ liệu người dùng...",
    "Sắp hoàn tất, vui lòng chờ trong giây lát...",
];


function createRoundedPackageGeometry(width, height, depth, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
    );
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth - 0.14,
        steps: 1,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.07,
        bevelSegments: 5,
    });

    geometry.center();
    return geometry;
}

function createGlowTexture(color) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    const hex = `#${color.getHexString(THREE.SRGBColorSpace)}`;

    gradient.addColorStop(0, `${hex}c7`);
    gradient.addColorStop(0.35, `${hex}45`);
    gradient.addColorStop(1, `${hex}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
}

function disposeScene(scene) {
    scene.traverse((object) => {
        object.geometry?.dispose();

        const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

        materials.filter(Boolean).forEach((material) => {
            Object.values(material).forEach((value) => {
                if (value?.isTexture) value.dispose();
            });
            material.dispose();
        });
    });
}

export default function Login3DLoading({
    open = false,
    title = "Đang đăng nhập",
    messages = DEFAULT_MESSAGES,
    primaryColor = "#1976b9",
    accentColor = "#38bdf8",
    highlightColor = "#e6a83c",
}) {
    const rootRef = useRef(null);
    const visualRef = useRef(null);
    const canvasRef = useRef(null);
    const [messageIndex, setMessageIndex] = useState(0);

    const safeMessages = messages.length ? messages : DEFAULT_MESSAGES;

    useEffect(() => {
        if (!open) return undefined;

        setMessageIndex(0);
        const timer = window.setInterval(() => {
            setMessageIndex((current) => (current + 1) % safeMessages.length);
        }, 1250);

        return () => window.clearInterval(timer);
    }, [open, safeMessages.length]);

    useEffect(() => {
        if (!open || !rootRef.current || !visualRef.current || !canvasRef.current) {
            return undefined;
        }

        const root = rootRef.current;
        const visual = visualRef.current;
        const canvas = canvasRef.current;
        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        let renderer;
        let animationFrame;
        let resizeObserver;

        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: "high-performance",
            });
        } catch {
            return undefined;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        const primary = new THREE.Color(primaryColor);
        const accent = new THREE.Color(accentColor);
        const highlight = new THREE.Color(highlightColor);
        const white = new THREE.Color("#ffffff");
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(5.5, 3.5, 7.8);
        camera.lookAt(0, 0.1, 0);

        // Ambient hemisphere
        scene.add(new THREE.HemisphereLight(white, primary, 2.4));

        // Key light — warm white from top-right
        const keyLight = new THREE.DirectionalLight(white, 5);
        keyLight.position.set(4, 7, 6);
        scene.add(keyLight);

        // Rim light — brand blue from back-left
        const rimLight = new THREE.PointLight(primary, 22, 20);
        rimLight.position.set(-5, 1.5, 3);
        scene.add(rimLight);

        // Accent kick light — highlight gold from below-right
        const accentLight = new THREE.PointLight(highlight, 14, 16);
        accentLight.position.set(3.5, -2, -3);
        scene.add(accentLight);

        // Fill light — soft accent from front
        const fillLight = new THREE.PointLight(accent, 8, 14);
        fillLight.position.set(0, 2, 6);
        scene.add(fillLight);

        const packageGroup = new THREE.Group();
        scene.add(packageGroup);

        const packageGeometry = createRoundedPackageGeometry(2.35, 1.72, 1.78, 0.2);
        const packageMaterial = new THREE.MeshPhysicalMaterial({
            color: primary,
            roughness: 0.15,
            metalness: 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            emissive: primary,
            emissiveIntensity: 0.12,
            reflectivity: 0.9,
        });

        packageGroup.add(new THREE.Mesh(packageGeometry, packageMaterial));
        packageGroup.add(
            new THREE.LineSegments(
                new THREE.EdgesGeometry(packageGeometry, 28),
                new THREE.LineBasicMaterial({
                    color: white,
                    transparent: true,
                    opacity: 0.42,
                }),
            ),
        );

        packageGroup.add(
            new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 1.82, 1.88),
                new THREE.MeshPhysicalMaterial({
                    color: highlight,
                    roughness: 0.28,
                    metalness: 0.12,
                    clearcoat: 0.75,
                }),
            ),
        );

        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(0.86, 0.58),
            new THREE.MeshPhysicalMaterial({
                color: white,
                roughness: 0.18,
                clearcoat: 1,
                emissive: accent,
                emissiveIntensity: 0.12,
            }),
        );
        label.position.set(0.45, 0, 0.91);
        packageGroup.add(label);

        const checkGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.23, 0, 0),
            new THREE.Vector3(-0.05, -0.17, 0),
            new THREE.Vector3(0.28, 0.2, 0),
        ]);
        const checkMark = new THREE.Line(
            checkGeometry,
            new THREE.LineBasicMaterial({ color: primary }),
        );
        checkMark.position.set(0.45, 0, 0.925);
        packageGroup.add(checkMark);

        function createOrbit(radius, rotationX, rotationY, speed, color) {
            const orbit = new THREE.Group();
            orbit.rotation.x = rotationX;
            orbit.rotation.y = rotationY;
            orbit.userData.speed = speed;

            orbit.add(
                new THREE.Mesh(
                    new THREE.TorusGeometry(radius, 0.018, 8, 180),
                    new THREE.MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: 0.38,
                    }),
                ),
            );

            const node = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 18, 18),
                new THREE.MeshBasicMaterial({ color }),
            );
            node.position.x = radius;
            orbit.add(node);

            const miniPackage = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2),
                new THREE.MeshPhysicalMaterial({
                    color,
                    roughness: 0.2,
                    metalness: 0.25,
                }),
            );
            miniPackage.position.set(-radius, 0, 0);
            miniPackage.rotation.set(0.3, 0.5, 0.2);
            orbit.add(miniPackage);

            scene.add(orbit);
            return orbit;
        }

        const orbits = [
            createOrbit(3.05, 1.02, 0.18, 0.31, primary),
            createOrbit(2.62, -0.42, 0.94, -0.42, highlight),
            createOrbit(3.35, 0.35, -0.72, 0.22, accent),
        ];

        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);

        for (let index = 0; index < particleCount; index += 1) {
            const radius = 3.2 + Math.random() * 3.2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[index * 3 + 1] = radius * Math.cos(phi);
            positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3),
        );

        const particles = new THREE.Points(
            particleGeometry,
            new THREE.PointsMaterial({
                color: primary,
                size: 0.04,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }),
        );
        scene.add(particles);

        // Secondary accent particles
        const accentParticleCount = 60;
        const accentPositions = new Float32Array(accentParticleCount * 3);

        for (let i = 0; i < accentParticleCount; i += 1) {
            const r = 2.5 + Math.random() * 2;
            const t = Math.random() * Math.PI * 2;
            const p = Math.acos(2 * Math.random() - 1);

            accentPositions[i * 3] = r * Math.sin(p) * Math.cos(t);
            accentPositions[i * 3 + 1] = r * Math.cos(p);
            accentPositions[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
        }

        const accentParticleGeometry = new THREE.BufferGeometry();
        accentParticleGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(accentPositions, 3),
        );

        const accentParticles = new THREE.Points(
            accentParticleGeometry,
            new THREE.PointsMaterial({
                color: accent,
                size: 0.03,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }),
        );
        scene.add(accentParticles);

        const glow = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: createGlowTexture(primary),
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }),
        );
        glow.scale.set(9, 9, 1);
        glow.position.z = -1.8;
        scene.add(glow);

        let pointerX = 0;
        let pointerY = 0;

        const handlePointerMove = (event) => {
            const bounds = visual.getBoundingClientRect();
            pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.55;
            pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.35;
        };

        const handlePointerLeave = () => {
            pointerX = 0;
            pointerY = 0;
        };

        visual.addEventListener("pointermove", handlePointerMove);
        visual.addEventListener("pointerleave", handlePointerLeave);

        const resize = () => {
            const bounds = visual.getBoundingClientRect();
            const width = Math.max(bounds.width, 280);
            const height = Math.max(bounds.height, 220);

            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(visual);
        } else {
            window.addEventListener("resize", resize);
        }

        resize();
        const clock = new THREE.Clock();

        const render = () => {
            const elapsed = clock.getElapsedTime();

            if (!reducedMotion) {
                packageGroup.position.y = Math.sin(elapsed * 1.55) * 0.2;
                packageGroup.rotation.x +=
                    (-0.12 + pointerY - packageGroup.rotation.x) * 0.04;
                packageGroup.rotation.y +=
                    (elapsed * 0.42 + pointerX - packageGroup.rotation.y) * 0.035;
                packageGroup.rotation.z = Math.sin(elapsed * 0.8) * 0.05;

                orbits.forEach((orbit, index) => {
                    orbit.rotation.z += orbit.userData.speed * 0.008;
                    orbit.children[2].rotation.x += 0.02 + index * 0.003;
                    orbit.children[2].rotation.y += 0.024 + index * 0.004;
                });

                particles.rotation.y = elapsed * 0.04;
                particles.rotation.x = Math.sin(elapsed * 0.2) * 0.1;
                accentParticles.rotation.y = -elapsed * 0.03;
                accentParticles.rotation.z = Math.sin(elapsed * 0.15) * 0.06;
                glow.material.opacity = 0.75 + Math.sin(elapsed * 1.7) * 0.15;

                // Subtle camera breathing
                camera.position.y = 3.5 + Math.sin(elapsed * 0.6) * 0.12;
            }

            renderer.render(scene, camera);
            animationFrame = window.requestAnimationFrame(render);
        };

        renderer.render(scene, camera);
        root.classList.add("l3d-webgl-ready");
        animationFrame = window.requestAnimationFrame(render);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", resize);
            visual.removeEventListener("pointermove", handlePointerMove);
            visual.removeEventListener("pointerleave", handlePointerLeave);
            root.classList.remove("l3d-webgl-ready");
            disposeScene(scene);
            renderer.dispose();
            renderer.forceContextLoss();
        };
    }, [open, primaryColor, accentColor, highlightColor]);

    if (!open) return null;

    return (
        <div
            ref={rootRef}
            className="l3d-overlay"
            role="status"
            aria-live="polite"
            aria-label={title}
            style={{
                "--l3d-primary": primaryColor,
                "--l3d-accent": accentColor,
                "--l3d-highlight": highlightColor,
            }}
        >
            <div className="l3d-panel">
                <div ref={visualRef} className="l3d-visual" aria-hidden="true">
                    <div className="l3d-aura l3d-aura-one" />
                    <div className="l3d-aura l3d-aura-two" />
                    <div className="l3d-css-ring" />
                    <div className="l3d-css-ring l3d-css-ring-two" />

                    <div className="l3d-css-package">
                        <span className="l3d-face l3d-face-front" />
                        <span className="l3d-face l3d-face-back" />
                        <span className="l3d-face l3d-face-right" />
                        <span className="l3d-face l3d-face-left" />
                        <span className="l3d-face l3d-face-top" />
                        <span className="l3d-face l3d-face-bottom" />
                    </div>

                    <canvas ref={canvasRef} className="l3d-canvas" />
                </div>

                <div className="l3d-badge">
                    <span className="l3d-badge-dot" />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Kết nối an toàn
                </div>

                <h3 className="l3d-title">{title}</h3>
                <p className="l3d-message" key={messageIndex}>
                    {safeMessages[messageIndex % safeMessages.length]}
                </p>
                <div className="l3d-progress" aria-hidden="true" />
            </div>
        </div>
    );
}