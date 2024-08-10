import * as THREE from 'three';

// Setup the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1); // Set background color to black
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Create a grid texture using a canvas
const createGridTexture = (size, lines) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');

    // Set the line color
    context.strokeStyle = '#00ff00'; // Green lines
    context.lineWidth = 1;

    // Draw horizontal and vertical lines
    const step = size / lines;
    for (let i = 0; i <= lines; i++) {
        const position = i * step;
        
        // Horizontal line
        context.beginPath();
        context.moveTo(0, position);
        context.lineTo(size, position);
        context.stroke();
        
        // Vertical line
        context.beginPath();
        context.moveTo(position, 0);
        context.lineTo(position, size);
        context.stroke();
    }

    return new THREE.CanvasTexture(canvas);
};

const gridTexture = createGridTexture(1024, 50); // 1024 is the texture size, 50 is the number of lines
gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
gridTexture.repeat.set(10, 10); // Adjust repetition for larger coverage

// Create a floor with the grid texture
const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
const floorMaterial = new THREE.MeshBasicMaterial({ map: gridTexture, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.5; // Position of the floor
scene.add(floor);

// Load star textures and create star field
const starTextures = [
    '/flower/flower_1.png', // Replace with the actual path to your star textures
    '/flower/flower_2.png',
    '/flower/flower_3.png',
    '/flower/flower_4.png'
];

const starMaterials = [];
const starMeshes = [];
const loader = new THREE.TextureLoader();

const loadStarTextures = () => {
    return new Promise((resolve, reject) => {
        const promises = starTextures.map((texturePath) =>
            new Promise((resolve, reject) => {
                loader.load(texturePath, (texture) => {
                    starMaterials.push(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
                    resolve();
                });
            })
        );
        Promise.all(promises).then(resolve).catch(reject);
    });
};

const createStarField = () => {
  const xRange = 100; // Set the range for the x-axis
  const yRange = 100; // Set the range for the y-axis
  const zRange = 100; // Set the range for the z-axis

  for (let i = 0; i < 2000; i++) { // Create 1000 stars
      const starMaterial = starMaterials[Math.floor(Math.random() * starMaterials.length)];
      const starGeometry = new THREE.PlaneGeometry(1, 1);
      const star = new THREE.Mesh(starGeometry, starMaterial);

      // Randomize star position within the specified range
      star.position.set(
          Math.random() * xRange - xRange / 2, // Random x position within xRange
          Math.random() * yRange - yRange / 2, // Random y position within yRange
          -Math.random() * zRange - 10         // Random z position behind the girl
      );

      star.scale.set(2, 2, 1); // Scale the star size
      scene.add(star);
      starMeshes.push(star);
  }
};

// Load the walking frames
const frameCount = 7;
const walkingFrames = [];

const loadWalkingTextures = () => {
    return new Promise((resolve, reject) => {
        const promises = [];
        for (let i = 1; i <= frameCount; i++) {
            promises.push(
                new Promise((resolve, reject) => {
                    loader.load(`/girl_walking/girl_walking_${i}.png`, (texture) => {
                        const image = texture.image;
                        resolve({ texture, width: image.width, height: image.height });
                    });
                })
            );
        }
        Promise.all(promises).then(resolve).catch(reject);
    });
};

// Load backdrop animation frames
const backdropFrameCount = 5; // Number of frames in the backdrop animation
const backdropFrames = [];

const loadBackdropTextures = () => {
    return new Promise((resolve, reject) => {
        const promises = [];
        for (let i = 1; i <= backdropFrameCount; i++) {
            promises.push(
                new Promise((resolve, reject) => {
                    loader.load(`/grow/grow_${i}.png`, (texture) => {
                        backdropFrames.push(texture);
                        resolve();
                    });
                })
            );
        }
        Promise.all(promises).then(resolve).catch(reject);
    });
};

Promise.all([loadStarTextures(), loadWalkingTextures(), loadBackdropTextures()]).then((results) => {
    const frames = results[1]; // Walking frames are in the second promise result

    // Create a material for each frame and determine the max height
    const materials = frames.map(frame => new THREE.MeshBasicMaterial({ map: frame.texture, transparent: true }));
    const maxHeight = Math.max(...frames.map(frame => frame.height));
    
    // Create a plane geometry with the appropriate aspect ratio
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, materials[0]);
    scene.add(mesh);

    camera.position.z = 5;

    // Add a plane for the backdrop animation
    const originalWidth = 500;
    const originalHeight = 250;
    const newWidth = 200; // New width, smaller than the original
    const aspectRatio = originalHeight / originalWidth;
    const newHeight = newWidth * aspectRatio; // Calculate new height maintaining aspect ratio

    const backdropPlaneGeometry = new THREE.PlaneGeometry(newWidth, newHeight);
    const backdropPlaneMaterial = new THREE.MeshBasicMaterial({ map: backdropFrames[0], transparent: true, side: THREE.DoubleSide });
    const backdropPlane = new THREE.Mesh(backdropPlaneGeometry, backdropPlaneMaterial);
    backdropPlane.position.set(125, floor.position.y + newHeight / 2 - 1.5, -50); // Align the bottom of the plane with the floor
    scene.add(backdropPlane);

    let frame = 0;
    let backdropFrame = 0;
    const frameDelay = 15;
    let frameCounter = 0;
    let backdropAnimationStarted = false;

    const animate = function () {
        requestAnimationFrame(animate);

        // Update the walking frame
        frameCounter++;
        if (frameCounter >= frameDelay) {
            frame = (frame + 1) % frameCount;
            const currentFrame = frames[frame];
            mesh.material = materials[frame];
            mesh.scale.set(currentFrame.width / maxHeight * 3, 3, 1); // Scale based on aspect ratio
            frameCounter = 0;
        }

        // Check if the girl has reached the x position of 300 and start the backdrop animation
        if (!backdropAnimationStarted && mesh.position.x >= 100) {
            backdropAnimationStarted = true;
            const backdropAnimationInterval = setInterval(() => {
                backdropFrame = (backdropFrame + 1) % backdropFrameCount;
                backdropPlane.material.map = backdropFrames[backdropFrame];
                backdropPlane.material.needsUpdate = true;

                // Stop the animation when it completes
                if (backdropFrame === backdropFrameCount - 1) {
                    clearInterval(backdropAnimationInterval);
                }
            }, 4000); // Change frame every 500 milliseconds for a slower animation
        }

        // Move the mesh across the screen
        mesh.position.x += 0.05; // Adjust the speed of movement

        // Make the camera follow the mesh
        camera.position.x = mesh.position.x;

        renderer.render(scene, camera);
    };

    // Create stars after textures are loaded
    createStarField();

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}).catch(err => {
    console.error('Error loading textures', err);
});
