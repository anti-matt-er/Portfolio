const gameWindow = document.querySelector(".game-container");
const headerDisplay = document.querySelector(".game-header");
const scoreDisplay = document.querySelectorAll(".game-score-value");
const healthDisplay = document.querySelector(".game-health-value");
const overlayDisplay = document.querySelector(".game-overlay");
const playDisplay = document.querySelector(".game-start");
const gameoverDisplay = document.querySelector(".game-over");
const highScoreDisplay = document.querySelector(".game-hi-score-value");
const spritePath = "img/game/";
const spritesheets = [
  "player",
  "enemy",
  "star",
  "player_laser",
  "enemy_orb",
  "explosion",
  "particle",
];
const staticSprites = [];

const playerSpawn = {
  x: 0.5,
  y: 0.95,
};
const playerLaserOffset = {
  x: 8,
  y: 1,
};
const enemyOrbOffset = {
  x: 0,
  y: 6,
};
const playerLaserVelocity = -6;
const enemyOrbSpeed = 7;
const playerMaxVelocity = 6;
const playerAcceleration = 0.2;
const arenaBounds = 8;

const enemyAdvanceSpeed = 3.5;

const virtualGameWidth = 192;
const minScale = 2;
const maxScale = 4;

const maxEnemies = 16;
const maxPlayerLasers = 32;
const maxEnemyOrbs = 128;
const maxHitParticles = 512;

const playerHealth = 100;
const enemyHealth = 30;

const playerLaserDamage = 10;
const enemyOrbDamage = 10;

const enemyFireRate = 1000; //Change to variable and decrease with difficulty later
const enemySpawnTick = 1200;
const enemySpawnBaseChance = 0.3;
const enemySpawnChanceIncrement = 0.1;
const enemyFireCutoff = 0.8;

const animationSpeed = 0.25;
const particleAnimationSpeed = 0.5;

const shootCooldown = 350;

const hitParticleAmount = 8;
const hitParticleSpeed = 2;

const frameTime = 1 / 60;

const shakeDuration = 1.0 / frameTime;
const shakeResolution = 28;
const shakeExponent = 2;

const playerDamageShake = 5.0;
const playerDeathShake = 10.0;
const killShake = 1.5;

const starData = {
  S: {
    amount: 100,
    speed: 0.5,
  },
  M: {
    amount: 20,
    speed: 0.7,
  },
  L: {
    amount: 10,
    speed: 1.0,
  },
};
const starBounds = 7;
const starParallaxVariance = 0.3;
const starFieldSpeed = 0.5;
const starShakeParallax = 0.25;

const gameOverTimeout = 1000;

let game = new PIXI.Application({ resizeTo: gameWindow, backgroundAlpha: 0 });
let particleContainer = new PIXI.ParticleContainer(
  starData.S.amount + starData.M.amount + starData.L.amount
);
let entities = {
  all: [],
  player: null,
  enemies: null,
  playerLasers: null,
  enemyOrbs: null,
  explosions: null,
  hitParticles: null,
  stars: {
    S: null,
    M: null,
    L: null,
  },
};
let gameReady = false;
let gameRunning = false;
let mouse = {
  x: 0,
  y: 0,
};
let gameSize = {
  w: gameWindow.clientWidth,
  h: gameWindow.clientHeight,
};
let shake = {
  amount: 0,
  magnitude: 0,
  x: 0,
  y: 0,
  xPoints: [],
  yPoints: [],
};
let enemyDimensions;
let enemySpawnChance = 1.0;
let shooting = false;
let score = 0;
let highScore = 0;
gameWindow.appendChild(game.view);
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.SORTABLE_CHILDREN = true;

class GameObject {
  sprite;
  active;
  x;
  y;
  shakeParallax = 1.0;
  #velocity = new PIXI.Point(0, 0);
  #normalizedPosition = new PIXI.Point(0, 0);

  constructor(sprite, container = game.stage) {
    this.sprite = sprite;
    container.addChild(this.sprite);
    this.active = false;
    this.sprite.visible = false;
    entities.all.push(this);
  }

  instance(x, y) {
    if (this.sprite instanceof PIXI.AnimatedSprite) {
      this.sprite.play();
      this.sprite.animationSpeed = animationSpeed;
    }
    this.active = true;
    this.sprite.visible = true;
    this.sprite.anchor.set(0.5);
    this.x = x;
    this.y = y;
    this.updatePosition();
    this.rescale();
  }

  kill() {
    if (!this.active) return;
    if (this.sprite instanceof PIXI.AnimatedSprite) {
      this.sprite.stop();
    }
    this.active = false;
    this.sprite.visible = false;
  }

  setVelocity(x, y) {
    this.#velocity.x = x;
    this.#velocity.y = y;
  }

  accelerate(x, y, max) {
    this.#velocity.x += x;
    this.#velocity.y += y;
    if (Math.abs(this.#velocity.x) > max) {
      this.#velocity.x = max * Math.sign(x);
    }
    if (Math.abs(this.#velocity.y) > max) {
      this.#velocity.y = max * Math.sign(y);
    }
  }

  decelerate(by) {
    if (Math.abs(this.#velocity.x) < by) {
      this.#velocity.x = 0;
    } else {
      this.#velocity.x -= by * Math.sign(this.#velocity.x);
    }
    if (Math.abs(this.#velocity.y) < by) {
      this.#velocity.y = 0;
    } else {
      this.#velocity.y -= by * Math.sign(this.#velocity.y);
    }
  }

  updatePosition() {
    this.sprite.x = this.x + shake.x * this.shakeParallax;
    this.sprite.y = this.y + shake.y * this.shakeParallax;
  }

  scale(x, y = null) {
    if (y === null) y = x;
    this.sprite.scale.x = x;
    this.sprite.scale.y = y;
  }

  rescale() {
    this.scale(globalScale());
  }

  savePosition() {
    this.#normalizedPosition.x = this.x / gameSize.w;
    this.#normalizedPosition.y = this.y / gameSize.h;
  }

  reflow() {
    this.rescale();
    this.x = this.#normalizedPosition.x * gameSize.w;
    this.y = this.#normalizedPosition.y * gameSize.h;
    this.updatePosition();
  }

  midLoop() {}

  loop(delta) {
    if (!this.active) return;
    this.x += this.#velocity.x * delta;
    this.y += this.#velocity.y * delta;
    this.midLoop();
    this.updatePosition();
  }
}

class Entity extends GameObject {
  width;
  height;
  bounds;
  collisionRadius;

  constructor(sprite, collisionRadius = 1.0) {
    super(sprite);
    let spriteBounds = sprite.getLocalBounds();
    this.width = spriteBounds.width;
    this.height = spriteBounds.height;
    this.collisionRadius = collisionRadius * this.width;
  }

  isCollidingWith(other) {
    if (!this.active) return false;
    let threshold = this.collisionRadius + other.collisionRadius;
    threshold *= threshold;
    threshold *= globalScale();
    return vectorDistanceSquared(this, other) < threshold;
  }

  midLoop() {
    if (this.bounds !== undefined) {
      this.x = Math.max(
        globalScale() * (this.bounds + this.width / 2.0),
        Math.min(
          this.x,
          gameSize.w - globalScale() * (this.bounds + this.width / 2.0)
        )
      );
      this.y = Math.max(
        globalScale() * (this.bounds + this.height / 2.0),
        Math.min(
          this.y,
          gameSize.h - globalScale() * (this.bounds + this.height / 2.0)
        )
      );
    }
  }
}

class Particle extends GameObject {
  constructor(sprite) {
    super(sprite, particleContainer);
  }
}

class AnimatedParticle extends GameObject {
  constructor(sprite) {
    super(sprite);
    sprite.onLoop = () => {
      this.kill();
    };
    sprite.animationSpeed = particleAnimationSpeed;
  }
}

class Star extends Particle {
  #size;

  constructor(sprite, size) {
    super(sprite);
    this.#size = size;
    this.shakeParallax = starShakeParallax;
    switch (size) {
      case "L":
        this.sprite.zIndex = -1;
        break;
      case "M":
        this.sprite.zIndex = -2;
        break;
      case "S":
        this.sprite.zIndex = -3;
        break;
    }
  }

  instance(x, y) {
    super.instance(x, y);
    let speed = starData[this.#size].speed;
    this.setVelocity(
      0,
      (speed +
        (Math.random() * 2.0 - 1.0) * starParallaxVariance * (1.0 - speed)) *
        starFieldSpeed *
        globalScale()
    );
  }

  kill() {
    this.instance(
      Math.floor(
        Math.random() * (gameSize.w - starBounds * globalScale() * 2)
      ) +
        starBounds * globalScale(),
      -starBounds
    );
  }

  loop(delta) {
    super.loop(delta);
    if (this.y > gameSize.h + starBounds) {
      this.kill();
    }
  }
}

class Character extends Entity {
  maxHealth;
  health;
  shakeMagnitude = killShake;

  constructor(sprite, health) {
    super(sprite);
    this.maxHealth = health;
    this.health = 0;
  }

  instance(x, y) {
    super.instance(x, y);
    this.health = this.maxHealth;
  }

  die() {
    this.kill();
    this.health = 0;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      entities.explosions.instanceNext(this.x, this.y);
      shakeScreen(this.shakeMagnitude);
      this.die();
    }
  }
}

class Ordnance extends Entity {
  armed;
  #targets;
  #damage;

  constructor(sprite, targets, damage) {
    super(sprite);
    sprite.onLoop = () => {
      this.kill();
    };
    this.sprite.animationSpeed = particleAnimationSpeed;
    this.#targets = targets;
    this.#damage = damage;
    this.sprite.zIndex = -1;
    game.stage.sortChildren();
  }

  instance(x, y) {
    super.instance(x, y);
    this.sprite.stop();
    this.armed = true;
  }

  hit() {
    this.armed = false;
    this.setVelocity(0, 0);
    this.sprite.play();
    for (let i = 0; i < hitParticleAmount; i++) {
      let particle = entities.hitParticles.instanceNext(this.x, this.y);
      let angle = Math.random() * Math.PI * 2.0;
      particle.setVelocity(
        Math.cos(angle) * hitParticleSpeed * globalScale(),
        Math.sin(angle) * hitParticleSpeed * globalScale()
      );
    }
  }

  loop(delta) {
    if (!this.active) return;
    super.loop(delta);

    if (
      this.x < -this.width ||
      this.x > gameSize.w + this.width ||
      this.y < -this.height ||
      this.y > gameSize.h + this.height
    ) {
      this.kill();
      return;
    }

    if (!this.armed) return;

    for (const target of this.#targets) {
      if (!target.active) continue;
      if (this.isCollidingWith(target)) {
        target.damage(this.#damage);
        this.hit();
        break;
      }
    }
  }
}

class Player extends Character {
  #canShoot = true;
  #alternate = false;

  constructor(sprite, health) {
    super(sprite, health);
    this.bounds = arenaBounds;
    this.shakeMagnitude = playerDeathShake;
  }

  die() {
    super.die();
    setTimeout(() => {
      gameOver();
    }, gameOverTimeout);
  }

  damage(amount) {
    super.damage(amount);
    updateHealth(this.health / this.maxHealth);
    shakeScreen(playerDamageShake);
  }

  shoot() {
    if (!gameRunning || !this.#canShoot) return;
    let offsetX = playerLaserOffset.x + 0.5;
    if (this.#alternate) {
      offsetX = -playerLaserOffset.x - 0.5;
    }
    let laser = entities.playerLasers.instanceNext(
      this.x + offsetX * globalScale(),
      this.y + playerLaserOffset.y * globalScale()
    );
    laser.setVelocity(0, playerLaserVelocity * globalScale());
    this.#alternate = !this.#alternate;
    this.#canShoot = false;
    setTimeout(() => {
      this.#canShoot = true;
    }, shootCooldown);
  }

  moveToMouse() {
    if (!gameRunning) return;
    let delta = this.sprite.x - mouse.x;
    if (delta < -playerMaxVelocity) {
      this.accelerate(playerAcceleration * 2, 0, playerMaxVelocity);
    } else if (delta > playerMaxVelocity) {
      this.accelerate(-playerAcceleration * 2, 0, playerMaxVelocity);
    }
    this.decelerate(playerAcceleration);
  }

  loop(delta) {
    if (!this.active) return;
    super.loop(delta);
    if (shooting) this.shoot();
    this.moveToMouse();
  }
}

class Enemy extends Character {
  constructor(sprite, health) {
    super(sprite, health);
    if (enemyDimensions === undefined) {
      enemyDimensions = {
        w: this.width,
        h: this.height,
      };
    }
  }

  instance(x, y) {
    super.instance(x, y);
    setTimeout(() => {
      this.shoot();
    }, enemyFireRate);
  }

  die() {
    super.die();
    updateScore(score + 1);
  }

  shoot() {
    if (!this.active || !entities.player.active) return;
    if (this.y > gameSize.h * enemyFireCutoff) return;
    let orb = entities.enemyOrbs.instanceNext(
      this.x + enemyOrbOffset.x * globalScale(),
      this.y + enemyOrbOffset.y * globalScale()
    );
    let direction = vectorDirection(this, entities.player);
    orb.setVelocity(direction.x * enemyOrbSpeed, direction.y * enemyOrbSpeed);
    setTimeout(() => {
      this.shoot();
    }, enemyFireRate);
  }

  loop(delta) {
    if (!this.active) return;
    super.loop(delta);
    if (this.y > gameSize.h + this.height) {
      this.kill();
    }
  }
}

class EntityPool {
  pool;
  #amount;
  #counter;

  constructor(amount, entityCallback) {
    this.#amount = amount;
    this.#counter = 0;
    this.pool = [];
    for (let i = 0; i < amount; i++) {
      this.pool.push(entityCallback());
    }
  }

  instanceNext(x, y) {
    let instance = this.pool[this.#counter];
    this.#counter = (this.#counter + 1) % this.#amount;
    instance.instance(x, y);
    return instance;
  }

  loop(delta) {
    this.pool.forEach((entity) => {
      entity.loop(delta);
    });
  }
}

const globalScale = () => {
  return Math.min(gameSize.w / virtualGameWidth, maxScale);
};

const loadFromSpritesheet = (sheetName, resource) => {
  return PIXI.Loader.shared.resources[sheetName].spritesheet[resource];
};

const createAnimatedSprite = (sheetName, animation) => {
  return new PIXI.AnimatedSprite(
    loadFromSpritesheet(sheetName, "animations")[animation]
  );
};

const createStaticSpriteFromSheet = (sheetName, texture) => {
  return new PIXI.Sprite(loadFromSpritesheet(sheetName, "textures")[texture]);
};

const createStaticSprite = (name) => {
  return new PIXI.Sprite(PIXI.Loader.shared.resources[name].texture);
};

const vectorMagnitudeSquared = (vector) => {
  return vector.x * vector.x + vector.y * vector.y;
};

const vectorMagnitude = (vector) => {
  return Math.sqrt(vectorMagnitudeSquared(vector));
};

const vectorNormalized = (vector) => {
  let magnitude = vectorMagnitude(vector);
  return new PIXI.Point(vector.x / magnitude, vector.y / magnitude);
};

const vectorDirection = (from, to) => {
  return vectorNormalized(new PIXI.Point(to.x - from.x, to.y - from.y));
};

const vectorDistanceSquared = (from, to) => {
  return vectorMagnitudeSquared(new PIXI.Point(to.x - from.x, to.y - from.y));
};

const vectorDistance = (from, to) => {
  return Math.sqrt(vectorDistanceSquared(from, to));
};

const applyShake = () => {
  if (!shake.amount) return;
  let samplePoint = shake.amount * (shakeResolution - 1);
  let lerpAmount = samplePoint % 1;
  let lerpFrom = Math.floor(samplePoint);
  let lerpTo = Math.ceil(samplePoint);
  let xAmount =
    shake.xPoints[lerpFrom] * (1.0 - lerpAmount) +
    shake.xPoints[lerpTo] * lerpAmount;
  let yAmount =
    shake.yPoints[lerpFrom] * (1.0 - lerpAmount) +
    shake.yPoints[lerpTo] * lerpAmount;
  let power = Math.pow(shake.amount, shakeExponent);
  shake.x = shake.magnitude * power * xAmount * globalScale();
  shake.y = shake.magnitude * power * yAmount * globalScale();
  shake.amount -= 1.0 / shakeDuration;
  if (shake.amount < 0) {
    shake.x = 0;
    shake.y = 0;
    shake.amount = 0;
  }
};

const shakeScreen = (magnitude) => {
  if (shake.amount && magnitude < shake.magnitude) return;
  shake.magnitude = magnitude;
  shake.xPoints = [];
  shake.yPoints = [];
  for (let i = 0; i < shakeResolution; i++) {
    shake.xPoints.push(Math.random() * 2.0 - 1.0);
    shake.yPoints.push(Math.random() * 2.0 - 1.0);
  }
  shake.amount = 1.0;
};

const reflow = () => {
  if (!gameReady) return;
  entities.all.forEach((entity) => {
    entity.savePosition();
  });
  gameSize.w = gameWindow.clientWidth;
  gameSize.h = gameWindow.clientHeight;
  game.renderer.resize(gameSize.w, gameSize.h);
  entities.all.forEach((entity) => {
    entity.reflow();
  });
  entities.player.y = gameSize.h * playerSpawn.y;
  entities.player.updatePosition();
};

const showHeader = () => {
  headerDisplay.style.opacity = "1";
};

const hideHeader = () => {
  headerDisplay.style.opacity = "0";
};

const showOverlay = () => {
  overlayDisplay.style.opacity = "1";
  overlayDisplay.style["pointer-events"] = "auto";
};

const hideOverlay = () => {
  overlayDisplay.style.opacity = "0";
  overlayDisplay.style["pointer-events"] = "none";
};

const updateScore = (newScore) => {
  score = newScore;
  if (score > highScore) {
    highScore = score;
    highScoreDisplay.innerHTML = highScore.toString();
  }
  scoreDisplay.forEach((scoreElement) => {
    scoreElement.innerHTML = score.toString();
  });
};

const updateHealth = (health) => {
  healthDisplay.style.width = (100 * health).toString() + "%";
};

const spawnPlayer = () => {
  if (!entities.player.active) {
    entities.player.instance(
      gameSize.w * playerSpawn.x,
      gameSize.h * playerSpawn.y
    );
  }
};

const spawnEnemy = () => {
  if (!entities.player.active) {
    return;
  }
  if (enemySpawnChance < 1.0 && Math.random() > enemySpawnChance) {
    enemySpawnChance += enemySpawnChanceIncrement;
    if (enemySpawnChance > 1.0) enemySpawnChance = 1.0;
    setTimeout(() => {
      spawnEnemy();
    }, enemySpawnTick);
    return;
  }
  let enemySpawnBounds =
    (enemyDimensions.w / 2.0 + arenaBounds) * globalScale();
  enemySpawnChance = enemySpawnBaseChance;
  let enemy = entities.enemies.instanceNext(
    Math.floor(Math.random() * (gameSize.w - enemySpawnBounds * 2)) +
      enemySpawnBounds,
    -enemyDimensions.h
  );
  enemy.setVelocity(0, enemyAdvanceSpeed);
  setTimeout(() => {
    spawnEnemy();
  }, enemySpawnTick);
};

const startGame = () => {
  updateHealth(1.0);
  updateScore(0);
  hideOverlay();
  showHeader();
  spawnPlayer();
  spawnEnemy();
  gameRunning = true;
};

const gameOver = () => {
  if (!playDisplay.classList.contains("hidden")) {
    playDisplay.classList.add("hidden");
    gameoverDisplay.classList.remove("hidden");
  }
  showOverlay();
  hideHeader();
};

spritesheets.forEach((sheet) => {
  PIXI.Loader.shared.add(sheet, spritePath + sheet + ".json");
});

staticSprites.forEach((sprite) => {
  PIXI.Loader.shared.add(sprite, spritePath + sprite + ".png");
});

PIXI.Loader.shared.load((loader, resources) => {
  game.stage.addChild(particleContainer);
  particleContainer.zIndex = -100;
  entities.player = new Player(
    createAnimatedSprite("player", "fly"),
    playerHealth
  );
  entities.enemies = new EntityPool(maxEnemies, () => {
    return new Enemy(createAnimatedSprite("enemy", "fly"), enemyHealth);
  });
  entities.enemyOrbs = new EntityPool(maxEnemyOrbs, () => {
    return new Ordnance(
      createAnimatedSprite("enemy_orb", "hit"),
      [entities.player],
      enemyOrbDamage
    );
  });
  entities.playerLasers = new EntityPool(maxPlayerLasers, () => {
    return new Ordnance(
      createAnimatedSprite("player_laser", "hit"),
      entities.enemies.pool,
      playerLaserDamage
    );
  });
  entities.hitParticles = new EntityPool(maxHitParticles, () => {
    return new AnimatedParticle(createAnimatedSprite("particle", "play"));
  });
  entities.explosions = new EntityPool(maxEnemies, () => {
    return new AnimatedParticle(createAnimatedSprite("explosion", "explode"));
  });
  entities.stars.L = new EntityPool(starData.L.amount, () => {
    return new Star(createStaticSpriteFromSheet("star", "starL"), "L");
  });
  entities.stars.M = new EntityPool(starData.M.amount, () => {
    return new Star(createStaticSpriteFromSheet("star", "starM"), "M");
  });
  entities.stars.S = new EntityPool(starData.S.amount, () => {
    return new Star(createStaticSpriteFromSheet("star", "starS"), "S");
  });
  game.stage.sortChildren();
  particleContainer.sortChildren();

  for (let i = 0; i < starData.L.amount; i++) {
    entities.stars.L.instanceNext(
      Math.floor(
        Math.random() * (gameSize.w - starBounds * globalScale() * 2)
      ) +
        starBounds * globalScale(),
      Math.random() * gameSize.h
    );
  }
  for (let i = 0; i < starData.M.amount; i++) {
    entities.stars.M.instanceNext(
      Math.floor(
        Math.random() * (gameSize.w - starBounds * globalScale() * 2)
      ) +
        starBounds * globalScale(),
      Math.random() * gameSize.h
    );
  }
  for (let i = 0; i < starData.S.amount; i++) {
    entities.stars.S.instanceNext(
      Math.floor(
        Math.random() * (gameSize.w - starBounds * globalScale() * 2)
      ) +
        starBounds * globalScale(),
      Math.random() * gameSize.h
    );
  }

  mouse.x = gameSize.w / 2.0;
  mouse.y = gameSize.h / 2.0;

  game.ticker.add((delta) => {
    entities.all.forEach((entity) => {
      entity.loop(delta);
    });

    applyShake();
  });

  spawnPlayer();

  gameReady = true;
});

game.view.addEventListener("pointerdown", (e) => {
  shooting = true;
});

game.view.addEventListener("pointerup", (e) => {
  shooting = false;
});

game.view.addEventListener("pointermove", (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
});

new ResizeObserver(reflow).observe(gameWindow);
