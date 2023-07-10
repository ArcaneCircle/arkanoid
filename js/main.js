//@ts-check
import "../styles.css"

import "./webxdc-scores.js"
import "./levels.js"
import { DROP_FALL_SPEED, Flags, PADDLE_EXTENSION, SCORE_DROP_AMOUNT, SELF_HEALING_REGEN_TIME, TNT_EXPLOSION_DELAY, TNT_EXPLOSION_DURATION, TNT_EXPLOSION_FRAME_DURATION, TNT_FULL_DAMAGE } from "./constants";
import {Howl} from 'howler';
import { playExplosionSFX } from "./sfx";

let arkanoidGame,
    imgBall,
    imgPaddle,
    imgBricks,
    imgSelfHealingBricks,
    imgExplodingBricks,
    imgExplosion,
    sfxBounce,
    sfxHit,
    sfxWin;
let BallDirs = {
    NONE : 0,
    LEFT : 1,
    RIGHT : 2,
    UP : 4,
    DOWN : 8
};
let BricksTypes = {
    DEFAULT: 1,
};
let KeyCodes = {
    SPACE: 32,
    LEFT: 37,
    RIGHT: 39,
};

function Paddle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};

function Ball(x, y, radius, dir, speed) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dir = BallDirs.NONE;
    this.speed = speed;
    this.changeDir = (dir) => {
        switch (dir) {
        case BallDirs.LEFT:
            if (this.dir & BallDirs.RIGHT) this.dir -= BallDirs.RIGHT;
            if (!(this.dir & BallDirs.LEFT)) this.dir += BallDirs.LEFT;
            break;
        case BallDirs.RIGHT:
            if (this.dir & BallDirs.LEFT) this.dir -= BallDirs.LEFT;
            if (!(this.dir & BallDirs.RIGHT)) this.dir += BallDirs.RIGHT;
            break;
        case BallDirs.UP:
            if (this.dir & BallDirs.DOWN) this.dir -= BallDirs.DOWN;
            if (!(this.dir & BallDirs.UP)) this.dir += BallDirs.UP;
            break;
        case BallDirs.DOWN:
            if (this.dir & BallDirs.UP) this.dir -= BallDirs.UP;
            if (!(this.dir & BallDirs.DOWN)) this.dir += BallDirs.DOWN;
            break;
        default:
            this.dir = BallDirs.NONE;
        }
    };
}

function Brick(x, y, width, height, lifes, flags = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.lifes = lifes;
    this.original_lifes = lifes;
    this.flags = flags

    // decoded flags
    this.is_self_healing = this.flags & Flags.SELF_HEALING
    this.has_2x_score = this.flags & Flags.SCORE_X2
    this.is_exploding = this.flags & Flags.EXPLODING

    // functions:
    this._regen_timeout = null;
    this._regenerate = () => {
      // I know that this does not respect pauses, we'd need some game tick system for that
      if (this.lifes < this.original_lifes && this.lifes > 0) {
        this.lifes++;
        if (this.lifes > this.original_lifes) {
          this._regen_timeout = setTimeout(
            this._regenerate,
            SELF_HEALING_REGEN_TIME
          );
        }
      } else if (this._regen_timeout) {
        clearTimeout(this._regen_timeout);
        this._regen_timeout = null;
      }
    };
    this.damage = (hits = 1) => {
      if(this.original_lifes === -1){return}
      this.lifes = Math.max(0, this.lifes-hits);
      if (this.is_self_healing && this.lifes < this.original_lifes) {
        if (this._regen_timeout) {
          clearTimeout(this._regen_timeout);
          this._regen_timeout = null;
        }
        this._regen_timeout = setTimeout(
          this._regenerate,
          SELF_HEALING_REGEN_TIME
        );
      }
    };
}

function Bricks(hor_num, vert_num, brick_width, brick_height, level, level_flags=[]) {
    this.bricks = new Array();
    for (var y = 0; y < vert_num; y++) {
        this.bricks[y] = new Array();
        for (var x = 0; x < hor_num; x++) {
            let flags = !level_flags ? 0 : (level_flags.find(b=>b.x === x && b.y === y) || {}).f || 0
            this.bricks[y][x] = new Brick(x * brick_width, y * brick_height, brick_width, brick_height, level? (level[y][x]||0): 0, flags);
        }
    }
}

//-----------------------------------------------------------------------------------
// Arkanoid Game class
//-----------------------------------------------------------------------------------
function ArkanoidGame(canvas, context) {

    let PADDLE_WIDTH = 60,
        PADDLE_HEIGHT = 15,
        PADDLE_SPEED = 3,
        BALL_RADIUS = 5,
        BALL_DEFAULT_SPEED = 5,
        BALL_MAX_SPEED = 10,
        BRICK_WIDTH = 81,
        BRICK_HEIGHT = 35,
        BRICK_SCORE = 5,
        INITIAL_LIFES = 3,
        LIFE_REGEN = 1000*60*60*3;

    this.scoreboard = document.getElementById("scoreboard");
    this.body = document.getElementsByTagName("body")[0];
    this.scoreContainer = document.getElementById("score-container");
    this.lifesContainer = document.getElementById("lifes-container");
    this.levelContainer = document.getElementById("level-container");
    this.timerContainer = document.getElementById("timer-container");
    this.width = Math.max(canvas.width, PADDLE_WIDTH * 3);
    canvas.width = this.width;
    this.height = canvas.height;
    this.paddle = new Paddle(this.width / 2 - PADDLE_WIDTH / 2, this.height - 18, PADDLE_WIDTH, PADDLE_HEIGHT);
    this.ball = new Ball(this.width / 2, this.height / 2, BALL_RADIUS, BallDirs.NONE, BALL_DEFAULT_SPEED);
    this.bricks = new Bricks(5, 2, BRICK_WIDTH, BRICK_HEIGHT);
    /** @type {{x: number, y: number, startTime: number, ended?:true}[]} */
    this.explosionVisuals = [] // [{x:5, y:5, startTime:Date.now()}]
    this.brick_width = 0
    this.brick_height = 0
    /** @type {{kind: 'score' | 'biggerPaddle' | 'life', x: number, y: number, removed?: true}[]} */
    this.drops = []

    this.init = () => {
        this.level = parseInt(localStorage.level) || 1;
        this.lifesContainer.innerText = this.lifes = localStorage.lifes? parseInt(localStorage.lifes) : INITIAL_LIFES;
        this.scoreContainer.innerText = this.score = parseInt(localStorage.score) || 0;
        this.gamePaused = false;
        this.paddle.x = this.width / 2 - PADDLE_WIDTH / 2;
        this.ball.dir = BallDirs.NONE;  // idle state
        this.drops = []
        this.initLevel();
        let respawn = parseInt(localStorage.respawn) || 0;
        let now = new Date().getTime();
        if (respawn > now) {
            localStorage.lifes = 0;
            localStorage.timer = now;
            localStorage.respawn = 0;
        }
        if (this.lifes === 0) this.interval = setInterval(this.updateTimer, 500);
    };

    this.initLevel = () => {
        // reset
        this.drops = []
        this.paddle.width = PADDLE_WIDTH
        // init level
        this.scoreboard.classList.add("opened");
        this.levelContainer.innerText = this.level;
        let level = this.level;
        if (level >= 60) level = (level % 60) + 2;
        if (window.levels[level]) {
            let level_flags = window.levels["flags_"+level] || [];
            let level_content = window.levels[level];
            let brick_width = Math.round(this.width/level_content[0].length);
            this.brick_width = brick_width
            this.brick_height = BRICK_HEIGHT
            this.bricks = new Bricks(level_content[0].length, level_content.length, brick_width, BRICK_HEIGHT, level_content, level_flags);
        } else {
            let cols = 6 + getRandomInt(0, level < 20? 1 : 3);
            let brick_width = Math.round(this.width/cols);
            let offset = level < 20? 1: getRandomInt(0, 1);
            let rows = (level < 20? 5 : getRandomInt(6, 11)) + offset;
            this.bricks = new Bricks(cols, rows, brick_width, BRICK_HEIGHT);

            let max_empty = (rows-offset-2)*cols / 3;
            let empty = 0;
            let permanent = 0;
            let permanent2 = 0;
            for (var i = rows-1; i >= offset ; i--) {
                for (var j = 0; j < cols; j++) {
                    let lifes = 0;
                    if (i === rows-1) {
                        if (permanent2 < 3) {
                            lifes = getRandomInt(-1, 0);
                            if (lifes === -1) permanent2++;
                        }
                    } else if (i !== rows-2) {
                        lifes = getRandomInt(0, 6) * getRandomInt(0, 1);
                        if (lifes === 0) {
                            if (empty++ >= max_empty) {
                                if (getRandomInt(0, 1) && permanent < 1) {
                                    lifes = -1;
                                    permanent++;
                                } else {
                                    lifes = getRandomInt(1, 6);
                                }
                            }
                        }
                    }
                    this.bricks.bricks[i][j].lifes = lifes;
                }
            }
        }
    };

    this.drawBall = () => {
        // ball is idle on the paddle
        if (this.ball.dir === BallDirs.NONE) {
            this.ball.x = this.paddle.x + this.paddle.width / 2;
            this.ball.y = this.paddle.y - this.ball.radius;
        }

        context.drawImage(imgBall, this.ball.x - this.ball.radius, this.ball.y - this.ball.radius);
    };

    this.drawPaddle = () => {
        context.drawImage(imgPaddle, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    };

    this.drawBricks = () => {
        for (var i = 0; i < this.bricks.bricks.length; i++) {
            for (var j = 0; j < this.bricks.bricks[i].length; j++) {
                let brick = this.bricks.bricks[i][j];
                let lifes = brick.lifes;
                // console.log("bt", brick_type)
                if (lifes !== 0) {
                    if (lifes === -1) {lifes = 0;}
                    let img = brick.is_self_healing ? imgSelfHealingBricks : imgBricks
                    if (brick.is_exploding){
                        img = imgExplodingBricks
                    }
                    context.drawImage(img,
                                      0, lifes * 45, BRICK_WIDTH, 45,
                                      brick.x, brick.y, brick.width, brick.height);
                }
            }
        }
    };

    this.drawExplosions = () => {
        const now = Date.now()
        for (const explosionVisual of this.explosionVisuals) {
            const {x, y, startTime} = explosionVisual

            const width = this.brick_width * 3
            const height = this.brick_height * 3

            const animation_time = (now - startTime) % TNT_EXPLOSION_DURATION
            const frame = Math.floor(animation_time / TNT_EXPLOSION_FRAME_DURATION)

            if(frame == 7){
                explosionVisual.ended = true
            }

            context.drawImage(
              imgExplosion,
              192 * (frame % 4),
              192 * (Math.floor(frame / 4)),
              192,
              192,
              (this.brick_width * x)- this.brick_width,
              (this.brick_height * y)- this.brick_height,
              width,
              height
            );
            // context.fillStyle = 'rgb(10,100,0)';
            // const xx = (this.brick_width * x) - this.brick_width
            // const yy = (this.brick_height * y)- this.brick_height
            // context.fillRect(xx, yy, width, height);
        }
    }

    this.updateExplosionVisuals = ()=>{
        if (this.explosionVisuals.length !== 0) {
            this.explosionVisuals = this.explosionVisuals.filter(({ended})=>!ended)
        }
    }

    this.drawDrops = () => {
        for (const drop of this.drops) {
            context.fillStyle = 'rgb(60,60,60)';
            context.fillRect(drop.x-4, drop.y-4, 18, 18);
            if (drop.kind === 'score'){
                context.fillStyle = 'rgb(100,100,0)';
            } else if (drop.kind === 'biggerPaddle') {
                context.fillStyle = 'rgb(0,100,0)';
            } else if (drop.kind === 'life') {
                context.fillStyle = 'rgb(100,0,0)';
            }
            context.fillRect(drop.x, drop.y, 10, 10);
        }
        // context.fillStyle = 'rgb(0,100,0)';
        // context.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    }

    this.updateDrops = () => {
        for (const drop of this.drops) {
            // move down
            drop.y += DROP_FALL_SPEED
            // when moved out of screen then delete
            if(drop.y > this.height + 20 /* make sure it fully falls out of the screen */){
                drop.removed = true
            }
            // if collide with paddle then delete and activate
            if(this.isPointInRect(drop.x, drop.y, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height)){
                drop.removed = true
                console.log("collect drop:", drop);
                // TODO play Sound
                if (drop.kind === 'score'){
                    this.score += SCORE_DROP_AMOUNT
                    this.scoreContainer.innerText = String(this.score);
                } else if(drop.kind === 'biggerPaddle') {
                    this.paddle.width = Math.min(this.paddle.width + PADDLE_EXTENSION, Math.min(PADDLE_WIDTH*3, this.width/2.5))
                } else if(drop.kind === 'life'){
                    if (this.lifes < 5) {
                        this.lifesContainer.innerText = localStorage.lifes = ++this.lifes;
                    }
                }
            }
        }
        this.drops = this.drops.filter(({removed})=>!removed)
    }

    this.draw = () => {
        context.fillStyle = 'rgb(0,10,0)';
        context.fillRect(0, 0, this.width, this.height);

        if (this.lifes) {
            this.drawBall();
            this.drawPaddle();
            this.drawBricks();
            this.drawExplosions()
            this.drawDrops();
        }

        if (this.gamePaused) {
            context.fillStyle = 'rgb(255,255,0)';
            context.font = 'bold 20px Arial';
            context.fillText('Pause', this.width / 2 - 30, this.height / 2);
        }
    };

    this.damageBrick = (brick, x, y, damage_hits = 1) => {
        brick.damage(damage_hits)
        if (brick.lifes <= 0) {
            // brick is destroyed
            let points = BRICK_SCORE * brick.original_lifes
            if (brick.has_2x_score){
                points *= 2;
            } 
            this.score += points

            if (brick.is_exploding) {
                const explosion = (x,y) => {
                    // console.log("ex", {x,y});
                    // draw explosion effect and play sound
                    this.explosionVisuals.push({x, y, startTime: Date.now()})
                    playExplosionSFX()
                    // TNT damages blocks around it, the near blocks get full damage, the other get weak damage
                    // damage radius:
                    // [1][X][1]
                    // [X] X [X]
                    // [1][X][1]
                    explode_brick(x-1, y-1)
                    explode_brick(x-1, y, TNT_FULL_DAMAGE)
                    explode_brick(x-1,y+1)
                    explode_brick(x,y-1, TNT_FULL_DAMAGE)
                    const brick = this.bricks.bricks[y][x]
                    if (brick) {brick.damage(TNT_FULL_DAMAGE + 1)}
                    explode_brick(x,y+1, TNT_FULL_DAMAGE)
                    explode_brick(x+1,y,TNT_FULL_DAMAGE)
                    explode_brick(x+1,y-1)
                    explode_brick(x+1,y+1)
                }

                const explode_brick = (x, y, damage_hits=1)=>{
                    // console.log({x,y}, this.bricks.bricks);
                    
                    if (x < 0 || y < 0) {
                        return
                    }
                    // console.log("x",x, this.bricks.bricks.length, x > this.bricks.bricks.length-1);
                    // console.log("y", y, this.bricks.bricks[0].length, y > this.bricks.bricks[0].length-1);
                    if (x > this.bricks.bricks[0].length-1 || y > this.bricks.bricks.length-1) {
                        return
                    }

                    const brick = this.bricks.bricks[y][x]
                    if (brick && brick.lifes !== 0) {
                        if (brick.is_exploding) {
                            setTimeout(() => {explosion(x,y)}, TNT_EXPLOSION_DELAY)
                            brick.is_exploding = false
                        }
                        if (brick.lifes !== -1){
                            this.damageBrick(brick, x, y, damage_hits)
                        }
                    }
                }
                
                explosion(x,y)
            }

            //TODO if has drop
            this.spawnDrop(x , y)
        }
    }

    this.spawnDrop = (brickX, brickY) => {
        const randomXOffset = (this.brick_width * (Math.random()-0.5)*0.5)
        const x = ((brickX-0.5) * this.brick_width) + randomXOffset
        const y = brickY * this.brick_height + (this.brick_height/2)
        /** @type {(typeof this.drops[0])['kind']} */
        let kind = Math.random()>0.5?'score':'biggerPaddle'
        if (Math.random()< 0.2){
            kind = 'life'
        }
        this.drops.push({kind, x,y})
    }

    this.update = () => {
        this.updateExplosionVisuals()
        if (this.gamePaused || !this.lifes || this.ball.dir === BallDirs.NONE) return;

        // update ball pos
        if (this.ball.dir & BallDirs.RIGHT) this.ball.x += this.ball.speed;
        else if (this.ball.dir & BallDirs.LEFT) this.ball.x -= this.ball.speed;
        if (this.ball.dir & BallDirs.UP) this.ball.y -= this.ball.speed;
        else if (this.ball.dir & BallDirs.DOWN) this.ball.y += this.ball.speed;

        // collision with paddle
        if ((this.ball.x + this.ball.radius >= this.paddle.x && this.ball.x - this.ball.radius <= this.paddle.x + this.paddle.width) &&
            (this.ball.y + this.ball.radius >= this.paddle.y)) {
            let maxSpeed = BALL_MAX_SPEED - (this.level < 5? 2 : this.level < 10? 1 : 0);
            if (this.ball.speed < maxSpeed) {
                this.ball.speed += getRandomInt(2, 3)*0.1 + (this.level < 10? 0.1 : 0.2);
                console.log("ball.speed=" + this.ball.speed);
            }
            if (this.ball.dir & BallDirs.DOWN) {
                this.ball.changeDir(BallDirs.UP);
                this.ball.y = this.paddle.y - this.ball.radius;
                // avoid infinite bouncing loops
                this.ball.x += ((this.ball.x > this.paddle.x + this.paddle.width/2)? -1 : 1) * this.ball.radius*2;
            }
        }

        // collision with wall
        if (this.ball.x - this.ball.radius <= 0) {
            this.ball.x = this.ball.radius;
            this.ball.changeDir(BallDirs.RIGHT);
        }
        if (this.ball.x + this.ball.radius >= this.width) {
            this.ball.x = this.width - this.ball.radius;
            this.ball.changeDir(BallDirs.LEFT);
        }
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.changeDir(BallDirs.DOWN);
        }

        // update/collect drops
        this.updateDrops()

        // lost one life
        if (this.ball.y + this.ball.radius >= this.height) {
            this.drops = []
            sfxHit.play();
            try {
                window.navigator.vibrate(100);
            } catch (e) {
                console.error(e);
            }
            localStorage.lifes = --this.lifes;
            this.lifesContainer.innerText = String(this.lifes);
            this.ball.speed = BALL_DEFAULT_SPEED;
            if (this.lifes === 0) {
                window.highscores.setScore(this.score);
                localStorage.timer = new Date().getTime() + LIFE_REGEN;
                this.init();
            } else {
                this.ball.dir = BallDirs.NONE;  // idle state
                this.scoreboard.classList.add("opened");
            }
            return;
        }

        let levelUp = true;

        // collision with brick
        let collision = 0;
        let oldDir = this.ball.dir;
        let oldX = this.ball.x;
        for (var i = 0; i < this.bricks.bricks.length; i++) {
            for (var j = 0; j < this.bricks.bricks[i].length; j++) {
                let brick = this.bricks.bricks[i][j];
                if (brick.lifes !== 0) {
                    if (oldDir === BallDirs.LEFT + BallDirs.UP) {
                        if (this.isPointInRect(oldX - this.ball.speed, this.ball.y, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision right of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.x = brick.x + brick.width + this.ball.radius;
                            this.ball.changeDir(BallDirs.RIGHT);
                            if (brick.lifes === -1) {
                                // Indestructible brick
                                this.ball.x += getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y - this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision bottom of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y + brick.height + this.ball.radius;
                            this.ball.changeDir(BallDirs.DOWN);
                            if (brick.lifes === -1) {
                                // Indestructible brick
                                this.ball.y += getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                    }
                    else if (oldDir === BallDirs.LEFT + BallDirs.DOWN) {
                        if (this.isPointInRect(oldX - this.ball.speed, this.ball.y + 0, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision right of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.x = brick.x + brick.width + this.ball.radius;
                            this.ball.changeDir(BallDirs.RIGHT);
                            if (brick.lifes === -1) {
                                // Indestructible brick
                                this.ball.x += getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y + this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision top of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y - this.ball.radius;
                            this.ball.changeDir(BallDirs.UP);
                            if (brick.lifes === -1) {
                                this.ball.y -= getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                    }
                    else if (oldDir === BallDirs.RIGHT + BallDirs.UP) {
                        if (this.isPointInRect(oldX + this.ball.speed, this.ball.y, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision left of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.x = brick.x - this.ball.radius;
                            this.ball.changeDir(BallDirs.LEFT);
                            if (brick.lifes === -1) {
                                this.ball.x -= getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y - this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision bottom of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y + brick.height + this.ball.radius;
                            this.ball.changeDir(BallDirs.DOWN);
                            if (brick.lifes === -1) {
                                this.ball.y += getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                    }
                    else if (oldDir === BallDirs.RIGHT + BallDirs.DOWN) {
                        if (this.isPointInRect(oldX + this.ball.speed, this.ball.y, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision left of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.x = brick.x - this.ball.radius;
                            this.ball.changeDir(BallDirs.LEFT);
                            if (brick.lifes === -1) {
                                this.ball.x -= getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y + this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision top of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y - this.ball.radius;
                            this.ball.changeDir(BallDirs.UP);
                            if (brick.lifes === -1) {
                                this.ball.y -= getRandomInt(0, this.ball.radius*2);
                            } else {
                                this.damageBrick(brick, j, i)
                            }
                            collision++;
                        }
                    }

                    if (brick.lifes > 0) {
                        levelUp = false;
                    }
                }
            }
        }

        if(this.explosionVisuals.length !== 0){
            // don't end level if there are still explosions on the screen
            levelUp = false;
        }

        if (levelUp) {
            sfxWin.play();
            window.highscores.setScore(this.score);
            localStorage.score = this.score;
            this.ball.dir = BallDirs.NONE;  // idle state
            this.ball.speed = BALL_DEFAULT_SPEED;
            if (this.lifes < 5) {
                this.lifesContainer.innerText = localStorage.lifes = ++this.lifes;
            }
            localStorage.level = ++this.level;
            this.initLevel();
        }

        if (collision) {
            this.scoreContainer.innerText = String(this.score);
        }
    };


    this.isPointInRect = (x, y, rect_x, rect_y, rect_width, rect_height) => {
        if ((x >= rect_x && x <= rect_x + rect_width) &&
            (y >= rect_y && y <= rect_y + rect_height))
            return true;
        return false;
    };

    this.render = () => {
        context.clearRect(0, 0, this.width, this.height);
        this.update();
        this.draw();
        window.requestAnimationFrame(this.render);
    };

    this.updateTimer = () => {
        let timer = parseInt(localStorage.timer) || 0;
        if (timer) {
            let now = new Date().getTime();
            let distance = timer - now;
            if (distance < 0) {
                localStorage.timer = 0;
                localStorage.respawn = new Date().getTime();
                localStorage.lifes = INITIAL_LIFES;
                clearInterval(this.interval);
                this.interval = null;
                this.setTimerVisibility(false);
                this.init();
                return;
            }

            let hours = Math.floor(distance/(1000*60*60));
            if (hours < 10) hours = "0" + hours;
            let minutes = Math.floor((distance % (1000*60*60)) / (1000*60));
            if (minutes < 10) minutes = "0" + minutes;
            let seconds = Math.floor((distance % (1000*60)) / 1000);
            if (seconds < 10) seconds = "0" + seconds;
            this.timerContainer.innerText = `${hours}:${minutes}:${seconds}`;
            this.setTimerVisibility(true);
        } else {
            this.setTimerVisibility(false);
            clearInterval(this.interval);
            this.interval = null;
        }
    };

    this.togglePause = () => {
        this.gamePaused = !this.gamePaused;
    };

    this.movePaddleLeft = () => {
        if (this.gamePaused || !this.lifes) return;
        let x = this.paddle.x - 10 * PADDLE_SPEED;
        if (x < 0) x = 0;
        if (x > this.width - this.paddle.width) x = this.width - this.paddle.width;
        this.paddle.x = x;
    };

    this.movePaddleRight = () => {
        if (this.gamePaused || !this.lifes) return;
        let x = this.paddle.x + 10 * PADDLE_SPEED;
        if (x < 0) x = 0;
        if (x > this.width - this.paddle.width) x = this.width - this.paddle.width;
        this.paddle.x = x;
    };

    this.setPaddlePos = (x) => {
        if (this.gamePaused || !this.lifes) return;
        if (x < this.paddle.width/2) {
            x = 0;
        } else if (x > this.width - this.paddle.width/2) {
            x = this.width - this.paddle.width;
        } else {
            x -= this.paddle.width/2 + 5;
        }
        this.paddle.x = x;
    };

    this.setTimerVisibility = (visible) => {
        if (visible) {
            this.body.classList.add("dead");
        } else {
            this.body.classList.remove("dead");
        }
    };

    this.startGame = () => {
        this.scoreboard.classList.remove("opened");
        let dirs = [BallDirs.LEFT, BallDirs.RIGHT];
        this.ball.dir = dirs[getRandomInt(0, 1)] + BallDirs.UP;
    };

    this.restart = (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearInterval(this.interval);
        localStorage.timer = 0;
        localStorage.score = 0;
        localStorage.level = 1;
        localStorage.lifes = INITIAL_LIFES;
        this.setTimerVisibility(false);
        this.init();
    };
    document.getElementById("restart").addEventListener("click", this.restart);
};

//-----------------------------------------------------------------------------------
// Utilities
//-----------------------------------------------------------------------------------

function loadAssets() {
    imgBricks = new Image(); imgBricks.src = "./images/bricks.png";
    imgSelfHealingBricks = new Image(); imgSelfHealingBricks.src = "./images/self_healing_bricks.png";
    imgExplodingBricks = new Image(); imgExplodingBricks.src = "./images/tnt_bricks.png";
    imgPaddle = new Image(); imgPaddle.src = "./images/paddle.png";
    imgBall = new Image(); imgBall.src = "./images/ball.png";
    imgExplosion = new Image(); imgExplosion.src = "./images/explosion.png";

    //load audio
    sfxBounce = new Howl({src: ["sounds/bounce.mp3"]});
    sfxWin = new Howl({src: ["sounds/victory.mp3"]});
    sfxHit = new Howl({src: ["sounds/hit.mp3"]});
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setup() {
    let canvas = document.getElementById("canvas");
    canvas.width = Math.min(
        (window.innerWidth || document.documentElement.clientWidth
         || document.body.clientWidth)-15, 500);
    canvas.height = Math.min(
        (window.innerHeight || document.documentElement.clientHeight
         || document.body.clientHeight)*9/10, canvas.width*2);

    if (canvas.getContext) {
        arkanoidGame = new ArkanoidGame(canvas, canvas.getContext('2d'));
        arkanoidGame.init();
        window.requestAnimationFrame(arkanoidGame.render);
    }
}

function onclick() {
    if (arkanoidGame.lifes) {
        if (arkanoidGame.ball.dir === BallDirs.NONE) {  // idle state
            arkanoidGame.startGame();
        } else {
            arkanoidGame.togglePause();
        }
    }
}

// Preload assets
loadAssets();

window.addEventListener("load", () => {
    window.highscores.init("Arkanoid", "scoreboard").then(() => {
        setup();

        document.onmousemove = (event) => {
            event.preventDefault();
            arkanoidGame.setPaddlePos(event.pageX);
        };

        document.ontouchmove = (event) => {
            arkanoidGame.setPaddlePos(event.touches[0].clientX);
        };

        document.onclick = onclick;

        document.onkeydown = (event) => {
            var keyCode;
            if (event == null) {
                keyCode = window.event.keyCode;
            } else {
                keyCode = event.keyCode;
            }
            switch (keyCode) {
            case KeyCodes.SPACE:
                onclick();
                break;
            case KeyCodes.LEFT:
                arkanoidGame.movePaddleLeft();
                break;
            case KeyCodes.RIGHT:
                arkanoidGame.movePaddleRight();
                break;
            default:
                break;
            }
        }
    });
});
