//****** GAME LOOP ********//

var audioCtx = null; // Web Audio API context

var time = new Date();
var deltaTime = 0;

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  setTimeout(Init, 1);
} else {
  document.addEventListener("DOMContentLoaded", Init);
}

function Init() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.error("Web Audio API is not supported in this browser", e);
  }
  time = new Date();
  Start();
  Loop();
}

function playBeep(frequency = 440, duration = 100, volume = 0.5, type = 'sine') {
  if (!audioCtx) return; // Do nothing if AudioContext isn't supported/initialized or failed to init
  try {
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.value = volume;
    oscillator.frequency.value = frequency;
    oscillator.type = type;

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  } catch (e) {
    console.error("Error playing beep", e);
  }
}

function Loop() {
  deltaTime = (new Date() - time) / 1000;
  time = new Date();
  Update();
  requestAnimationFrame(Loop);
}

// Controlador de eventos para detectar la tecla de espacio presionada
document.addEventListener("keydown", function (event) {
  if (event.code === "Space" && parado) {
    Restart();
  }
});

function Restart() {
  // Reiniciamos todas las variables
  document.querySelector(".game-over").style.display = "none";
  document
    .querySelectorAll(".cactus, .cactus2")
    .forEach(function (obstaculo) {
      obstaculo.remove();
    });
  sueloX = 0;
  velEscenario = 1280 / 3;
  gameVel = 1;
  score = 0;
  parado = false;
  saltando = false;
  tiempoHastaObstaculo = 2;
  tiempoHastaNube = 0.5;
  obstaculos = [];
  dinoPosY = sueloY;
  dinoPosX = 42;
  
  // Explicitly reset current score display
  textoScore.innerText = score; 
  
  // Reset dino state
  dino.classList.add("dino-corriendo");
  dino.classList.remove("dino-estrellado");
  
  // Reset background theme
  contenedor.classList.remove("mediodia", "tarde", "noche");
  
  // Reiniciamos el juego (Start will also update highScore display)
  Start();
}

//****** GAME LOGIC ********//

var sueloY = 22;
var velY = 0;
var impulso = 900;
var gravedad = 2500;

var dinoPosX = 42;
var dinoPosY = sueloY;

var sueloX = 0;
var velEscenario = 1280 / 3;
var gameVel = 1;
var score = 0;

var parado = false;
var saltando = false;

var tiempoHastaObstaculo = 2;
var tiempoObstaculoMin = 0.7;
var tiempoObstaculoMax = 1.8;
var obstaculoPosY = 16;
var obstaculos = [];

var tiempoHastaNube = 0.5;
var tiempoNubeMin = 0.7;
var tiempoNubeMax = 2.7;
var maxNubeY = 270;
var minNubeY = 100;
var nubes = [];
var velNube = 0.5;

var highScore = 0; // Variable to store the high score
var isPaused = false; // Pause state variable

var contenedor;
var dino;
var textoScore;
var highScoreText; // To display high score
var suelo;
var gameOver;
var pauseMessageElement; // Pause message element

function Start() {
  gameOver = document.querySelector(".game-over");
  suelo = document.querySelector(".suelo");
  contenedor = document.querySelector(".contenedor");
  textoScore = document.querySelector(".score"); // Current score element
  highScoreText = document.querySelector(".high-score"); // High score element
  pauseMessageElement = document.querySelector(".pause-message"); // Get pause message element
  dino = document.querySelector(".dino");
  document.addEventListener("keydown", HandleKeyDown); // For jumping
  document.addEventListener("keydown", HandlePauseKey); // For pausing
  contenedor.addEventListener('touchstart', HandleTouchStart, { passive: true });

  // Load high score from localStorage
  var storedHighScore = localStorage.getItem("highScore");
  if (storedHighScore) {
    highScore = parseInt(storedHighScore);
  } else {
    highScore = 0;
  }
  highScoreText.innerText = "HI: " + highScore; // Display high score
}

function HandlePauseKey(ev) {
  if (ev.keyCode === 80) { // 'P' key
    if (parado) return; // Don't pause if game is over

    isPaused = !isPaused; // Toggle pause state

    if (isPaused) {
      pauseMessageElement.style.display = "flex"; // Show pause message (use flex to keep centering)
    } else {
      pauseMessageElement.style.display = "none"; // Hide pause message
      time = new Date(); // Reset time to correctly calculate deltaTime on next frame
    }
  }
}

function HandleTouchStart(ev) {
  // If the game is over (parado is true), a touch will restart the game.
  if (parado) {
    Restart();
  } else if (isPaused) {
      // If paused, unpause the game
      isPaused = false;
      pauseMessageElement.style.display = "none";
      time = new Date();
  }
   else {
    // If the game is running, a touch will make the dino jump.
    Saltar();
  }
}

function Update() {
  if (parado) return;
  if (isPaused) return; // Skip update if paused

  MoverDinosaurio();
  MoverSuelo();
  DecidirCrearObstaculos();
  DecidirCrearNubes();
  MoverObstaculos();
  MoverNubes();
  DetectarColision();

  velY -= gravedad * deltaTime;
}

function HandleKeyDown(ev) {
  if (ev.keyCode == 32 && !isPaused) { // Space key, only jump if not paused
    Saltar();
  }
}

function Saltar() {
  if (dinoPosY === sueloY) {
    saltando = true;
    velY = impulso;
    dino.classList.remove("dino-corriendo");
    playBeep(600, 50, 0.1, 'square'); // Jump sound
  }
}

function MoverDinosaurio() {
  dinoPosY += velY * deltaTime;
  if (dinoPosY < sueloY) {
    TocarSuelo();
  }
  dino.style.bottom = dinoPosY + "px";
}

function TocarSuelo() {
  dinoPosY = sueloY;
  velY = 0;
  if (saltando) {
    dino.classList.add("dino-corriendo");
  }
  saltando = false;
}

function MoverSuelo() {
  sueloX += CalcularDesplazamiento();
  suelo.style.left = -(sueloX % contenedor.clientWidth) + "px";
}

function CalcularDesplazamiento() {
  return velEscenario * deltaTime * gameVel;
}

function Estrellarse() {
  dino.classList.remove("dino-corriendo");
  dino.classList.add("dino-estrellado");
  parado = true;
}

function DecidirCrearObstaculos() {
  tiempoHastaObstaculo -= deltaTime;
  if (tiempoHastaObstaculo <= 0) {
    CrearObstaculo();
  }
}

function DecidirCrearNubes() {
  tiempoHastaNube -= deltaTime;
  if (tiempoHastaNube <= 0) {
    CrearNube();
  }
}

function CrearObstaculo() {
  var obstaculo = document.createElement("div");
  contenedor.appendChild(obstaculo);
  obstaculo.classList.add("cactus");
  if (Math.random() > 0.5) obstaculo.classList.add("cactus2");
  obstaculo.posX = contenedor.clientWidth;
  obstaculo.style.left = contenedor.clientWidth + "px";

  obstaculos.push(obstaculo);
  tiempoHastaObstaculo =
    tiempoObstaculoMin +
    (Math.random() * (tiempoObstaculoMax - tiempoObstaculoMin)) / gameVel;
}

function CrearNube() {
  var nube = document.createElement("div");
  contenedor.appendChild(nube);
  nube.classList.add("nube");
  nube.posX = contenedor.clientWidth;
  nube.style.left = contenedor.clientWidth + "px";
  nube.style.bottom =
    minNubeY + Math.random() * (maxNubeY - minNubeY) + "px";

  nubes.push(nube);
  tiempoHastaNube =
    tiempoNubeMin +
    (Math.random() * (tiempoNubeMax - tiempoNubeMin)) / gameVel;
}

function MoverObstaculos() {
  for (var i = obstaculos.length - 1; i >= 0; i--) {
    if (obstaculos[i].posX < -obstaculos[i].clientWidth) {
      obstaculos[i].parentNode.removeChild(obstaculos[i]);
      obstaculos.splice(i, 1);
      GanarPuntos();
    } else {
      obstaculos[i].posX -= CalcularDesplazamiento();
      obstaculos[i].style.left = obstaculos[i].posX + "px";
    }
  }
}

function MoverNubes() {
  for (var i = nubes.length - 1; i >= 0; i--) {
    if (nubes[i].posX < -nubes[i].clientWidth) {
      nubes[i].parentNode.removeChild(nubes[i]);
      nubes.splice(i, 1);
    } else {
      nubes[i].posX -= CalcularDesplazamiento() * velNube;
      nubes[i].style.left = nubes[i].posX + "px";
    }
  }
}

function GanarPuntos() {
  score++;
  textoScore.innerText = score;
  if (score == 5) {
    gameVel = 1.5;
    contenedor.classList.add("mediodia");
  } else if (score == 10) {
    gameVel = 2;
    contenedor.classList.add("tarde");
  } else if (score == 20) {
    gameVel = 3;
    contenedor.classList.add("noche");
  }
  suelo.style.animationDuration = 3 / gameVel + "s";
  playBeep(800, 30, 0.05, 'triangle'); // Point score sound
}

function GameOver() {
  Estrellarse();
  gameOver.style.display = "block";
  playBeep(200, 300, 0.2, 'sawtooth'); // Game Over sound
  
  // Display the final score
  var finalScoreDisplay = gameOver.querySelector('.final-score-display');
  if (finalScoreDisplay) { // Check if the element exists
      finalScoreDisplay.innerText = "Score: " + score;
  }

  // Check and update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore.toString());
    highScoreText.innerText = "HI: " + highScore;
  }
}

function DetectarColision() {
  for (var i = 0; i < obstaculos.length; i++) {
    if (obstaculos[i].posX > dinoPosX + dino.clientWidth) {
      //EVADE
      break; //al estar en orden, no puede chocar con más
    } else {
      if (IsCollision(dino, obstaculos[i], 10, 30, 15, 20)) {
        GameOver();
      }
    }
  }
}

function IsCollision(
  a,
  b,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft
) {
  var aRect = a.getBoundingClientRect();
  var bRect = b.getBoundingClientRect();

  return !(
    aRect.top + aRect.height - paddingBottom < bRect.top ||
    aRect.top + paddingTop > bRect.top + bRect.height ||
    aRect.left + aRect.width - paddingRight < bRect.left ||
    aRect.left + paddingLeft > bRect.left + bRect.width
  );
}
