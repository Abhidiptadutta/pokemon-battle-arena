
const pokemonData = {
  Charmander: {
    name: "Charmander",
    type: "Fire",
    maxHP: 40,
    level: 5,
    moves: [
      { name: "Scratch", power: 10, type: "Normal" },
      { name: "Ember", power: 15, type: "Fire" }
    ]
  },
  Squirtle: {
    name: "Squirtle",
    type: "Water",
    maxHP: 42,
    level: 5,
    moves: [
      { name: "Tackle", power: 10, type: "Normal" },
      { name: "Water Gun", power: 15, type: "Water" }
    ]
  },
  Bulbasaur: {
    name: "Bulbasaur",
    type: "Grass",
    maxHP: 44,
    level: 5,
    moves: [
      { name: "Tackle", power: 10, type: "Normal" },
      { name: "Vine Whip", power: 15, type: "Grass" }
    ]
  }
};

let playerStarter = localStorage.getItem("starter") || null;
let playerTeam = JSON.parse(localStorage.getItem("team")) || [];

class StarterScene extends Phaser.Scene {
  constructor() { super("StarterScene"); }
  preload() {
    this.load.image("bg", "assets/backgrounds/start_bg.png");
    this.load.image("charmander", "assets/pokemons/charmander.png");
    this.load.image("squirtle", "assets/pokemons/squirtle.png");
    this.load.image("bulbasaur", "assets/pokemons/bulbasaur.png");
  }
  create() {
    this.add.image(400, 300, "bg");
    this.add.text(240, 60, "Choose Your Starter Pokémon", { fontSize: "20px", fill: "#fff" });
    ["Charmander", "Squirtle", "Bulbasaur"].forEach((name, i) => {
      const x = 250 + i * 150;
      const sprite = this.add.image(x, 200, name.toLowerCase()).setInteractive().setScale(2);
      this.add.text(x - 40, 300, name, { fontSize: "18px", fill: "#fff" });
      sprite.on("pointerdown", () => {
        playerStarter = name;
        playerTeam = [{ ...pokemonData[name], currentHP: pokemonData[name].maxHP }];
        localStorage.setItem("starter", name);
        localStorage.setItem("team", JSON.stringify(playerTeam));
        this.scene.start("MainScene");
      });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() { super("MainScene"); }
  preload() {
    this.load.image("tiles", "assets/tileset.png");
    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.spritesheet("player", "assets/player.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("battle-bg", "assets/backgrounds/battle_bg.png");
    this.load.image("wild-pokemon", "assets/pokemons/squirtle.png");
  }
  create() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tileset", "tiles");
    const worldLayer = map.createLayer("World", tileset, 0, 0);
    const grassLayer = map.createLayer("Grass", tileset, 0, 0);
    worldLayer.setCollisionByProperty({ collides: true });

    this.map = map;
    this.player = this.physics.add.sprite(100, 100, "player", 0);
    this.physics.add.collider(this.player, worldLayer);

    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.startFollow(this.player);
    this.lastGrassEncounter = 0;
  }
  update(time) {
    const speed = 100;
    this.player.setVelocity(0);
    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play("walk-down", true);
    } else {
      this.player.anims.stop();
    }
    if (time - this.lastGrassEncounter > 1000) {
      const tile = this.map.getTileAtWorldXY(this.player.x, this.player.y, true, this.cameras.main, "Grass");
      if (tile && Math.random() < 0.1) {
        this.lastGrassEncounter = time;
        this.scene.start("BattleScene");
      }
    }
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super("BattleScene"); }
  create() {
    this.add.image(400, 300, "battle-bg");
    this.playerPoke = { ...playerTeam[0] };
    this.enemyPoke = { ...pokemonData.Squirtle, currentHP: pokemonData.Squirtle.maxHP };

    this.add.text(50, 20, `${this.playerPoke.name} (Lv ${this.playerPoke.level})`, { fontSize: "16px", fill: "#fff" });
    this.playerHPBar = this.add.text(50, 50, `HP: ${this.playerPoke.currentHP}/${this.playerPoke.maxHP}`, { fontSize: "16px", fill: "#fff" });

    this.add.image(600, 300, "wild-pokemon").setScale(2);
    this.add.text(550, 20, `${this.enemyPoke.name} (Lv ${this.enemyPoke.level})`, { fontSize: "16px", fill: "#fff" });
    this.enemyHPBar = this.add.text(550, 50, `HP: ${this.enemyPoke.currentHP}/${this.enemyPoke.maxHP}`, { fontSize: "16px", fill: "#fff" });

    this.log = this.add.text(50, 400, "", { fontSize: "16px", fill: "#fff" });
    this.createButtons();
  }
  createButtons() {
    this.playerPoke.moves.forEach((move, i) => {
      const btn = this.add.text(50, 300 + i * 30, move.name, {
        fontSize: "16px", backgroundColor: "#444", padding: 4, fill: "#fff"
      }).setInteractive();
      btn.on("pointerdown", () => this.playerAttack(move));
    });
    const pokeBtn = this.add.text(200, 360, "Throw Pokéball", {
      fontSize: "16px", backgroundColor: "#844", padding: 4, fill: "#fff"
    }).setInteractive();
    pokeBtn.on("pointerdown", () => this.throwPokeball());
  }
  playerAttack(move) {
    this.enemyPoke.currentHP -= move.power;
    if (this.enemyPoke.currentHP < 0) this.enemyPoke.currentHP = 0;
    this.updateHP();
    this.log.setText(`${this.playerPoke.name} used ${move.name}!`);
    if (this.enemyPoke.currentHP <= 0) {
      this.log.setText(`${this.enemyPoke.name} fainted! You win! Gained EXP.`);
      this.gainExp();
      this.input.keyboard.once("keydown-SPACE", () => this.scene.start("MainScene"));
      return;
    }
    this.time.delayedCall(1000, () => this.enemyAttack(), [], this);
  }
  enemyAttack() {
    const move = Phaser.Utils.Array.GetRandom(this.enemyPoke.moves);
    this.playerPoke.currentHP -= move.power;
    if (this.playerPoke.currentHP < 0) this.playerPoke.currentHP = 0;
    this.updateHP();
    this.log.setText(`${this.enemyPoke.name} used ${move.name}!`);
    if (this.playerPoke.currentHP <= 0) {
      this.log.setText(`${this.playerPoke.name} fainted! You lost.`);
      this.input.keyboard.once("keydown-SPACE", () => this.scene.start("MainScene"));
    }
  }
  throwPokeball() {
    const chance = (1 - this.enemyPoke.currentHP / this.enemyPoke.maxHP) * 0.8 + 0.2;
    const roll = Math.random();
    if (roll < chance) {
      this.log.setText(`Gotcha! ${this.enemyPoke.name} was caught!`);
      playerTeam.push({ ...this.enemyPoke });
      localStorage.setItem("team", JSON.stringify(playerTeam));
      this.input.keyboard.once("keydown-SPACE", () => this.scene.start("MainScene"));
    } else {
      this.log.setText(`${this.enemyPoke.name} broke free!`);
      this.time.delayedCall(1000, () => this.enemyAttack(), [], this);
    }
  }
  gainExp() {
    this.playerPoke.level += 1;
    this.playerPoke.maxHP += 5;
    this.playerPoke.currentHP = this.playerPoke.maxHP;
    playerTeam[0] = this.playerPoke;
    localStorage.setItem("team", JSON.stringify(playerTeam));
  }
  updateHP() {
    this.playerHPBar.setText(`HP: ${this.playerPoke.currentHP}/${this.playerPoke.maxHP}`);
    this.enemyHPBar.setText(`HP: ${this.enemyPoke.currentHP}/${this.enemyPoke.maxHP}`);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  scene: [StarterScene, MainScene, BattleScene]
};

const game = new Phaser.Game(config);
