    const socket = io();
    let model1, model2;

    document.getElementById('loadButton').addEventListener('click', () => {
        socket.emit('send-3d-object', { model: 'model1' });
        socket.emit('send-3d-object', { model: 'model2' });
    });

    function load3DObject(url, position, modelName) {
        console.log('Lade 3D-Objekt von URL:', url);

        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
            console.log('3D-Objekt erfolgreich geladen von URL:', url, gltf);

            gltf.scene.position.set(position.x, position.y, position.z);
            gltf.scene.rotation.set(0, 0, 0);
            gltf.scene.scale.set(1, 1, 1);

            scene.add(gltf.scene);
            console.log('3D-Objekt zur Szene hinzugefügt von URL:', url);

            if (modelName === 'model1') {
                model1 = gltf.scene;
            } else if (modelName === 'model2') {
                model2 = gltf.scene;
            }

            // Objekt für den OutlinePass auswählen
            selectObjectForOutline(gltf.scene);
        }, undefined, (error) => {
            console.error('Fehler beim Laden des 3D-Objekts von URL:', url, error);
        });
    }

    socket.on('receive-3d-object', (data) => {
        console.log('3D-Objekt empfangen:', data);

        let position;
        if (data.model === 'model1') {
            position = { x: -2, y: 0, z: 0 };
        } else if (data.model === 'model2') {
            position = { x: 2, y: 0, z: 0 };
        }

        load3DObject(data.url, position, data.model);
    });

    function setModelPosition(model, x, y, z) {
        if (model) {
            model.position.set(x, y, z);
        }
    }

    document.getElementById('setPositionButton').addEventListener('click', () => {
        const x = parseFloat(document.getElementById('xInput').value);
        const y = parseFloat(document.getElementById('yInput').value);
        const z = parseFloat(document.getElementById('zInput').value);
        setModelPosition(model1, x, y, z);
    });

    document.getElementById('randomPositionButton').addEventListener('click', () => {
        const x = Math.random() * 10 - 5;
        const y = Math.random() * 10 - 5;
        const z = Math.random() * 10 - 5;
        setModelPosition(model1, x, y, z);
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    camera.position.z = 8;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // EffectComposer for postprocessing
    const composer = new THREE.EffectComposer(renderer);

    // RenderPass
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // OutlinePass
    const outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    composer.addPass(outlinePass);

    // FXAA (anti-aliasing)
    const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    composer.addPass(fxaaPass);

    // OutlinePass settings (optional)
    outlinePass.edgeStrength = 3.0;
    outlinePass.edgeGlow = 0.0;
    outlinePass.edgeThickness = 1.0;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set('#0000FF');
    outlinePass.hiddenEdgeColor.set('#190a05');

    function selectObjectForOutline(object) {
        outlinePass.selectedObjects = [object];
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            console.log('Geschnittenes Objekt bei Mausbewegung:', intersectedObject);
        }
    }

    function onDoubleClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            console.log('Doppelt geklicktes Objekt:', intersectedObject);

            // Beispielaktion: Objekt hervorheben
            if (intersectedObject.material) {
                intersectedObject.material.emissive.set(0x00ff00); // Objekt wird grün gehighlighted. Emissive unterstützt nicht alle Farben!
            }

            // Objekt für den OutlinePass auswählen
            selectObjectForOutline(intersectedObject);

            // Kamera zu dem gehighlighteten Objekt verschieben
            const box = new THREE.Box3().setFromObject(intersectedObject);
            const center = box.getCenter(new THREE.Vector3());

            const currentRotation = camera.rotation.clone();

            // Den Kamerafokus auf das Zentrum des gehighlighteten Objekts setzen
            controls.target.copy(center);

            // Die Kameraposition so setzen, dass die Entfernung zum Zentrum des gehighlighteten Objekts gleich bleibt
            const distance = camera.position.distanceTo(controls.target);
            camera.position.set(
                center.x + distance * Math.sin(currentRotation.y) * Math.cos(currentRotation.x),
                center.y + distance * Math.sin(currentRotation.x),
                center.z + distance * Math.cos(currentRotation.y) * Math.cos(currentRotation.x)
            );

            // Die gespeicherte Rotation auf die Kamera anwenden
            camera.rotation.copy(currentRotation);

            // Aktualisierung der Steuerelemente erzwingen
            controls.update();
        } else {
            console.log('Kein Objekt geschnitten');
        }
    }

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('dblclick', onDoubleClick, false);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        composer.render();
    }

    animate();
