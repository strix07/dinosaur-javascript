// Wrap the entire game logic in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope and to create a private scope for game variables.
(function() {
  //****** DOM Elements ********//
  // Cached references to frequently used DOM elements for performance.
  var gameOverElem, sueloElem, contenedorElem, textoScoreElem, dinoElem;

  //****** Game Object Dimensions & Collision Padding ********//
  // Fixed dimensions for game objects, used for collision detection and rendering.
  const DINO_WIDTH = 84;
  const DINO_HEIGHT = 84;
  const CACTUS1_WIDTH = 46;   // Width for the first type of cactus
  const CACTUS1_HEIGHT = 96;  // Height for the first type of cactus
  const CACTUS2_WIDTH = 98;   // Width for the second type of cactus (wider)
  const CACTUS2_HEIGHT = 66;  // Height for the second type of cactus (shorter)
  const CLOUD_WIDTH_APPROX = 92; // Approximate width of a cloud, used for off-screen check

  // Padding values define the dino's effective hitbox, making it smaller than the sprite.
  const COLLISION_PADDING_DINO_TOP = 10;    // Reduces hitbox from the top
  const COLLISION_PADDING_DINO_RIGHT = 30;  // Reduces hitbox from the right
  const COLLISION_PADDING_DINO_BOTTOM = 15; // Reduces hitbox from the bottom
  const COLLISION_PADDING_DINO_LEFT = 20;   // Reduces hitbox from the left

  //****** Pool Settings ********//
  // Object pooling settings to reuse elements and improve performance.
  const OBSTACLE_POOL_SIZE = 10; // Max number of obstacles to keep in the pool
  const CLOUD_POOL_SIZE = 10;    // Max number of clouds to keep in the pool
  var obstaclePool = [];         // Array to store pooled obstacle DOM elements
  var cloudPool = [];            // Array to store pooled cloud DOM elements

  //****** GAME LOOP ********//
  var time = new Date();    // Last frame time, used to calculate deltaTime
  var deltaTime = 0;        // Time elapsed since the last frame, in seconds

  // Ensures the game initializes after the DOM is fully loaded.
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(Init, 1); // If DOM is ready, Init slightly deferred to ensure full setup
  } else {
    document.addEventListener("DOMContentLoaded", Init); // Wait for DOM content
  }

  // Initializes the object pools for obstacles and clouds.
  // This is called once when the game first loads.
  function InitPools() {
    // Initialize Obstacle Pool
    for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
      let obstacle = document.createElement("div");
      obstacle.classList.add("cactus"); // Base class for styling
      obstacle.isActive = false;        // Custom property to track if in use
      obstacle.style.display = 'none';  // Initially hidden
      contenedorElem.appendChild(obstacle); // Append to game container once
      obstaclePool.push(obstacle);
    }

    // Initialize Cloud Pool
    for (let i = 0; i < CLOUD_POOL_SIZE; i++) {
      let cloud = document.createElement("div");
      cloud.classList.add("nube");
      cloud.isActive = false;
      cloud.style.display = 'none';
      contenedorElem.appendChild(cloud);
      cloudPool.push(cloud);
    }
  }

  // Main initialization function for the game.
  // Called once when the DOM is ready.
  function Init() {
    // Cache DOM elements
    gameOverElem = document.querySelector(".game-over");
    sueloElem = document.querySelector(".suelo");
    contenedorElem = document.querySelector(".contenedor");
    textoScoreElem = document.querySelector(".score");
    dinoElem = document.querySelector(".dino");
    
    InitPools(); // Set up the object pools

    // Add global event listener for game controls (jump)
    // This is added once during Init to avoid multiple listeners.
    document.addEventListener("keydown", HandleKeyDown); 

    time = new Date(); // Set initial time for deltaTime calculation
    Start();           // Prepare for the first game session
    Loop();            // Start the game loop
  }

  // The main game loop, called repeatedly using requestAnimationFrame.
  function Loop() {
    // Calculate deltaTime: time elapsed since the last frame
    deltaTime = (new Date() - time) / 1000;
    time = new Date(); // Update time for the next frame

    Update(); // Update game state

    requestAnimationFrame(Loop); // Request the next frame
  }

  // Global event listener for space bar to restart the game when it's over.
  document.addEventListener("keydown", function (event) {
    if (event.code === "Space" && parado) { // Only if game is over
      Restart();
    }
  });

  // Resets the game to its initial state for a new session.
  function Restart() {
    gameOverElem.style.display = "none"; // Hide "GAME OVER" message

    // Deactivate and hide all active obstacles, returning them to the pool
    for (let i = 0; i < obstaculos.length; i++) {
      obstaculos[i].isActive = false;
      obstaculos[i].style.display = 'none';
    }
    obstaculos.length = 0; // Clear the list of active obstacles

    // Deactivate and hide all active clouds, returning them to the pool
    for (let i = 0; i < nubes.length; i++) {
      nubes[i].isActive = false;
      nubes[i].style.display = 'none';
    }
    nubes.length = 0; // Clear the list of active clouds

    // Reset game state variables
    sueloX = 0;                     // Reset ground position
    velEscenario = 1280 / 3;        // Reset scenario scroll speed
    gameVel = 1;                    // Reset game speed multiplier
    score = 0;                      // Reset score
    textoScoreElem.innerText = score; // Update score display
    parado = false;                 // Game is no longer "stopped"
    saltando = false;               // Dino is not jumping
    
    // Reset timers for spawning entities
    tiempoHastaObstaculo = 2;
    tiempoHastaNube = 0.5;
    
    // Reset dino's position and physics state
    dinoPosY = sueloY;
    dinoPosX = 42; // Fixed X position for the dino
    velY = 0;      // Reset vertical velocity
    
    // Reset background visual state (day/night cycle)
    contenedorElem.classList.remove("mediodia", "tarde", "noche");

    Start(); // Prepare game elements for the new session

    // Ensure dino is visually in the running state
    dinoElem.classList.add("dino-corriendo");
    dinoElem.classList.remove("dino-estrellado");
  }

  //****** GAME LOGIC ********//
  // --- Core Game State Variables ---
  var sueloY = 22;      // Vertical position of the ground (bottom of dino's sprite)
  var velY = 0;         // Dino's current vertical velocity
  var impulso = 900;    // Upward velocity applied when dino jumps
  var gravedad = 2500;  // Downward acceleration due to gravity

  var dinoPosX = 42;    // Dino's fixed horizontal position
  var dinoPosY = sueloY;// Dino's current vertical position (bottom of sprite)

  var sueloX = 0;           // Horizontal position of the scrolling ground
  var velEscenario = 1280 / 3; // Base speed for scrolling elements (pixels per second)
  var gameVel = 1;          // Current game speed multiplier (increases with score)
  var score = 0;            // Player's current score

  var parado = false;       // Flag: true if the game is over or paused
  var saltando = false;     // Flag: true if the dino is currently jumping

  // --- Obstacle Spawn Logic ---
  var tiempoHastaObstaculo = 2;  // Time (seconds) until the next obstacle spawns
  var tiempoObstaculoMin = 0.7;  // Minimum time between obstacle spawns
  var tiempoObstaculoMax = 1.8;  // Maximum time between obstacle spawns
  var obstaculoPosY = 16;        // Fixed vertical position for obstacles (bottom of sprite)
  var obstaculos = [];           // Array for currently ACTIVE obstacles

  // --- Cloud Spawn Logic ---
  var tiempoHastaNube = 0.5;     // Time (seconds) until the next cloud spawns
  var tiempoNubeMin = 0.7;       // Minimum time between cloud spawns
  var tiempoNubeMax = 2.7;       // Maximum time between cloud spawns
  var maxNubeY = 270;            // Maximum vertical position for clouds
  var minNubeY = 100;            // Minimum vertical position for clouds
  var nubes = [];                // Array for currently ACTIVE clouds
  var velNube = 0.5;             // Speed multiplier for clouds (slower than ground)

  // Prepares game elements at the start of a session (or after restart).
  function Start() {
    // Set dino's initial visual position.
    dinoElem.style.bottom = dinoPosY + "px";
  }

  // Updates the game state for the current frame.
  // Called every frame by Loop().
  function Update() {
    if (parado) return; // Do nothing if game is over

    // Update positions and states of all game entities
    MoverDinosaurio();
    MoverSuelo();
    DecidirCrearObstaculos();
    DecidirCrearNubes();
    MoverObstaculos();
    MoverNubes();
    DetectarColision();

    // Apply gravity to dino's vertical velocity
    velY -= gravedad * deltaTime;
  }

  // Handles keyboard input for game controls (jump).
  function HandleKeyDown(ev) {
    if (ev.keyCode == 32 && !parado) { // Space bar pressed and game is active
      Saltar();
    }
  }

  // Makes the dino jump if it's on the ground.
  function Saltar() {
    if (dinoPosY === sueloY) { // Can only jump if on the ground
      saltando = true;
      velY = impulso; // Apply upward impulse
      dinoElem.classList.remove("dino-corriendo"); // Change sprite to jump animation
    }
  }

  // Updates the dino's vertical position based on its velocity.
  function MoverDinosaurio() {
    dinoPosY += velY * deltaTime; // Update position based on velocity and time
    if (dinoPosY < sueloY) {      // Check if dino has fallen below ground
      TocarSuelo();
    }
    dinoElem.style.bottom = dinoPosY + "px"; // Update visual position
  }

  // Handles dino landing on the ground.
  function TocarSuelo() {
    dinoPosY = sueloY; // Snap dino to ground level
    velY = 0;          // Stop vertical movement
    if (saltando) {    // If was jumping, change back to running animation
      dinoElem.classList.add("dino-corriendo");
    }
    saltando = false;  // No longer jumping
  }

  // Moves the scrolling ground.
  function MoverSuelo() {
    sueloX += CalcularDesplazamiento(); // Update ground's X position
    // Use modulo to create an infinite scrolling effect
    sueloElem.style.left = -(sueloX % contenedorElem.clientWidth) + "px";
  }

  // Calculates the displacement for scrolling elements based on game speed.
  function CalcularDesplazamiento() {
    return velEscenario * deltaTime * gameVel;
  }

  // Handles dino collision (game over state).
  function Estrellarse() {
    dinoElem.classList.remove("dino-corriendo");
    dinoElem.classList.add("dino-estrellado"); // Change to collided sprite
    parado = true; // Stop the game
  }

  // Decides if a new obstacle should be created.
  function DecidirCrearObstaculos() {
    tiempoHastaObstaculo -= deltaTime;
    if (tiempoHastaObstaculo <= 0) {
      CrearObstaculo();
    }
  }

  // Decides if a new cloud should be created.
  function DecidirCrearNubes() {
    tiempoHastaNube -= deltaTime;
    if (tiempoHastaNube <= 0) {
      CrearNube();
    }
  }

  // Creates a new obstacle or reuses one from the pool.
  function CrearObstaculo() {
    for (let i = 0; i < obstaclePool.length; i++) {
      if (!obstaclePool[i].isActive) { // Find an inactive obstacle in the pool
        let obstaculo = obstaclePool[i];
        obstaculo.isActive = true;
        obstaculo.style.display = 'block'; // Make it visible

        // Reset visual state (type of cactus)
        obstaculo.classList.remove('cactus2'); // Remove wider cactus class if present
        if (Math.random() > 0.5) { // Randomly decide cactus type
          obstaculo.classList.add('cactus2');
        }
        
        // Set initial position (right edge of the screen)
        obstaculo.posX = contenedorElem.clientWidth;
        obstaculo.style.left = contenedorElem.clientWidth + 'px';
        obstaculo.style.bottom = obstaculoPosY + 'px';

        obstaculos.push(obstaculo); // Add to list of active obstacles
        // Reset timer for next obstacle spawn, adjusted by game speed
        tiempoHastaObstaculo = tiempoObstaculoMin + (Math.random() * (tiempoObstaculoMax - tiempoObstaculoMin)) / gameVel;
        return; // Obstacle created/reused
      }
    }
    // console.log("Obstacle pool exhausted"); // Optional: for debugging if pool size is an issue
  }

  // Creates a new cloud or reuses one from the pool.
  function CrearNube() {
    for (let i = 0; i < cloudPool.length; i++) {
      if (!cloudPool[i].isActive) { // Find an inactive cloud in the pool
        let nube = cloudPool[i];
        nube.isActive = true;
        nube.style.display = 'block'; // Make it visible
        
        // Set initial position (right edge of screen, random height)
        nube.posX = contenedorElem.clientWidth;
        nube.style.left = contenedorElem.clientWidth + 'px';
        nube.style.bottom = minNubeY + Math.random() * (maxNubeY - minNubeY) + 'px';

        nubes.push(nube); // Add to list of active clouds
        // Reset timer for next cloud spawn, adjusted by game speed
        tiempoHastaNube = tiempoNubeMin + (Math.random() * (tiempoNubeMax - tiempoNubeMin)) / gameVel;
        return; // Cloud created/reused
      }
    }
    // console.log("Cloud pool exhausted"); // Optional: for debugging
  }

  // Moves active obstacles and returns them to the pool if off-screen.
  function MoverObstaculos() {
    for (var i = obstaculos.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
      let obstaculo = obstaculos[i];
      // Determine actual width of the obstacle's sprite for off-screen check
      let obstacleSpriteWidth = obstaculo.classList.contains('cactus2') ? CACTUS2_WIDTH : CACTUS1_WIDTH;
      
      if (obstaculo.posX < -obstacleSpriteWidth) { // If obstacle is off-screen to the left
        obstaculo.isActive = false;         // Mark as inactive
        obstaculo.style.display = 'none';   // Hide it
        obstaculos.splice(i, 1);            // Remove from active list (returns to pool)
        GanarPuntos();                      // Score points for passing obstacle
      } else {
        obstaculo.posX -= CalcularDesplazamiento(); // Move based on game speed
        obstaculo.style.left = obstaculo.posX + "px"; // Update visual position
      }
    }
  }

  // Moves active clouds and returns them to the pool if off-screen.
  function MoverNubes() {
    for (var i = nubes.length - 1; i >= 0; i--) { // Iterate backwards
      let nube = nubes[i];
      if (nube.posX < -CLOUD_WIDTH_APPROX) { // If cloud is off-screen to the left
        nube.isActive = false;        // Mark as inactive
        nube.style.display = 'none';  // Hide it
        nubes.splice(i, 1);           // Remove from active list (returns to pool)
      } else {
        // Clouds move slower than the ground/obstacles
        nube.posX -= CalcularDesplazamiento() * velNube; 
        nube.style.left = nube.posX + "px"; // Update visual position
      }
    }
  }

  // Handles score updates and game speed progression.
  function GanarPuntos() {
    score++;
    textoScoreElem.innerText = score; // Update score display

    // Increase game speed and change background at certain score thresholds
    if (score == 5) {
      gameVel = 1.5;
      contenedorElem.classList.add("mediodia");
    } else if (score == 10) {
      gameVel = 2;
      contenedorElem.classList.add("tarde");
    } else if (score == 20) {
      gameVel = 3;
      contenedorElem.classList.add("noche");
    }
    // Adjust ground animation speed to match game speed
    sueloElem.style.animationDuration = 3 / gameVel + "s";
  }

  // Triggers game over state.
  function GameOver() {
    Estrellarse(); // Set dino to collided state
    gameOverElem.style.display = "block"; // Show "GAME OVER" message
  }

  // Optimized collision detection using AABB (Axis-Aligned Bounding Box).
  // Compares hitboxes derived from game coordinates and fixed dimensions.
  function IsCollisionOptimized(dinoState, obstacle) {
      // Dino's effective hitbox (adjusted by padding)
      let dinoLeft = dinoState.x + COLLISION_PADDING_DINO_LEFT;
      let dinoRight = dinoState.x + DINO_WIDTH - COLLISION_PADDING_DINO_RIGHT;
      let dinoBottom = dinoState.y + COLLISION_PADDING_DINO_BOTTOM; // dinoPosY is bottom
      let dinoTop = dinoState.y + DINO_HEIGHT - COLLISION_PADDING_DINO_TOP; // Top calculated from bottom + height

      // Obstacle's effective hitbox
      let obstacleCurrentWidth, obstacleCurrentHeight;
      if (obstacle.classList.contains('cactus2')) {
          obstacleCurrentWidth = CACTUS2_WIDTH;
          obstacleCurrentHeight = CACTUS2_HEIGHT;
      } else {
          obstacleCurrentWidth = CACTUS1_WIDTH;
          obstacleCurrentHeight = CACTUS1_HEIGHT;
      }

      let obstacleLeft = obstacle.posX;
      let obstacleRight = obstacle.posX + obstacleCurrentWidth;
      let obstacleBottom = obstaculoPosY; // Fixed Y for base of obstacles
      let obstacleTop = obstaculoPosY + obstacleCurrentHeight;

      // AABB collision detection logic:
      // Returns true if there's a collision, false otherwise.
      // Collision occurs if all separating axis tests fail (i.e., there's overlap on all axes).
      return !(
          dinoBottom >= obstacleTop ||  // Dino is entirely above the obstacle
          dinoTop <= obstacleBottom ||   // Dino is entirely below the obstacle
          dinoRight <= obstacleLeft ||   // Dino is entirely to the left of the obstacle
          dinoLeft >= obstacleRight      // Dino is entirely to the right of the obstacle
      );
  }
  
  // Checks for collisions between the dino and active obstacles.
  function DetectarColision() {
    for (var i = 0; i < obstaculos.length; i++) {
      let currentObstacle = obstaculos[i];
      // Optimization: Only check obstacles that are potentially near the dino.
      // If an obstacle's starting X position is beyond the dino's front,
      // subsequent obstacles in the array will also be further, so we can break.
      if (currentObstacle.posX > dinoPosX + DINO_WIDTH) {
        break; 
      }
      
      // Perform precise collision check
      if (IsCollisionOptimized({ x: dinoPosX, y: dinoPosY }, currentObstacle)) {
        GameOver(); // End game on collision
        return;     // Exit immediately after collision detected
      }
    }
  }

})(); // End of IIFE
