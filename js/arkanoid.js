import {Howl} from 'howler';

let arkanoidGame,
    imgBall,
    imgPaddle,
    imgBricks,
    sfxBounce,
    sfxHit,
    sfxWin,
    scoreboard = document.getElementById("scoreboard"),
    LIFE_REGEN = 1000*60*60*8;  // 8 hours
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

function Brick(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.lifes = type;
}

function Bricks(hor_num, vert_num, brick_width, brick_height, level) {
    this.bricks = new Array();
    for (var i = 0; i < vert_num; i++) {
        this.bricks[i] = new Array();
        for (var j = 0; j < hor_num; j++) {
            this.bricks[i][j] = new Brick(j * brick_width, i * brick_height, brick_width, brick_height, level? level[i][j]: 0);
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
        BRICK_SCORE = 5;

    this.scoreContainer = document.getElementById("score-container");
    this.lifesContainer = document.getElementById("lifes-container");
    this.levelContainer = document.getElementById("level-container");
    this.timerContainer = document.getElementById("timer-container");
    this.timerWrapper = document.getElementById("timer-wrapper");
    this.width = Math.max(canvas.width, PADDLE_WIDTH * 3);
    canvas.width = this.width;
    this.height = canvas.height;
    this.paddle = new Paddle(this.width / 2 - PADDLE_WIDTH / 2, this.height - 18, PADDLE_WIDTH, PADDLE_HEIGHT);
    this.ball = new Ball(this.width / 2, this.height / 2, BALL_RADIUS, BallDirs.NONE, BALL_DEFAULT_SPEED);
    this.bricks = new Bricks(5, 2, BRICK_WIDTH, BRICK_HEIGHT);

    this.init = () => {
        this.level = parseInt(localStorage.level) || 1;
        this.lifes = localStorage.lifes? parseInt(localStorage.lifes) : 3;
        this.score = window.highscores.getScore();
        this.gamePaused = false;
        this.paddle.x = this.width / 2 - PADDLE_WIDTH / 2;
        this.ball.dir = BallDirs.NONE;  // idle state
        this.scoreContainer.innerHTML = this.score;
        this.lifesContainer.innerHTML = this.lifes;
        this.initLevel();
        this.interval = setInterval(this.updateTimer, 500);
    };

    this.initLevel = () => {
        if (scoreboard.innerHTML) scoreboard.classList.add("opened");
        this.levelContainer.innerHTML = this.level;
        let level = this.level;
        if (level >= 60) level = (level % 60) + 2;
        if (window.levels[level]) {
            level = window.levels[level];
            let brick_width = Math.round(this.width/level[0].length);
            this.bricks = new Bricks(level[0].length, level.length, brick_width, BRICK_HEIGHT, level);
        } else {
            let cols = 6 + getRandomInt(0, level < 10? 1 : 3);
            let brick_width = Math.round(this.width/cols);
            let offset = getRandomInt(0, 1);
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
        context.drawImage(imgPaddle, this.paddle.x, this.paddle.y);
    };

    this.drawBricks = () => {
        for (var i = 0; i < this.bricks.bricks.length; i++) {
            for (var j = 0; j < this.bricks.bricks[i].length; j++) {
                let brick = this.bricks.bricks[i][j];
                let lifes = brick.lifes;
                if (lifes !== 0) {
                    if (lifes === -1) {lifes = 0;}
                    context.drawImage(imgBricks,
                                      0, lifes * 45, BRICK_WIDTH, 45,
                                      brick.x, brick.y, brick.width, brick.height);
                }
            }
        }
    };

    this.draw = () => {
        context.fillStyle = 'rgb(0,10,0)';
        context.fillRect(0, 0, this.width, this.height);

        if (this.lifes) {
            this.drawBall();
            this.drawPaddle();
            this.drawBricks();
        }

        if (this.gamePaused) {
            context.fillStyle = 'rgb(255,255,0)';
            context.font = 'bold 20px Arial';
            context.fillText('Pause', this.width / 2 - 30, this.height / 2);
        }
    };

    this.update = () => {
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
                this.ball.x += (this.ball.x > this.paddle.x + this.paddle.width/2)? 10 : -10;
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

        // lost one life
        if (this.ball.y + this.ball.radius >= this.height) {
            sfxHit.play();
            try {
                window.navigator.vibrate(100);
            } catch (e) {
                console.error(e);
            }
            if (scoreboard.innerHTML) scoreboard.classList.add("opened");
            localStorage.lifes = --this.lifes;
            this.lifesContainer.innerHTML = this.lifes;
            this.ball.speed = BALL_DEFAULT_SPEED;
            if (this.lifes === 0) {
                localStorage.timer = new Date().getTime() + LIFE_REGEN;
                this.init();
            } else {
                this.ball.dir = BallDirs.NONE;  // idle state
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
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y - this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision bottom of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y + brick.height + this.ball.radius;
                            this.ball.changeDir(BallDirs.DOWN);
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
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
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y + this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision top of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y - this.ball.radius;
                            this.ball.changeDir(BallDirs.UP);
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
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
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y - this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision bottom of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y + brick.height + this.ball.radius;
                            this.ball.changeDir(BallDirs.DOWN);
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
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
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
                            }
                            collision++;
                        }
                        else if (this.isPointInRect(oldX, this.ball.y + this.ball.speed, brick.x, brick.y, brick.width, brick.height)) {
                            console.log(`collision top of brick(${i}, ${j})`);
                            sfxBounce.play();
                            this.ball.y = brick.y - this.ball.radius;
                            this.ball.changeDir(BallDirs.UP);
                            if (brick.lifes > 0) {
                                brick.lifes--;
                                this.score += BRICK_SCORE;
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

        if (levelUp) {
            sfxWin.play();
            window.highscores.setScore(this.score);
            this.ball.dir = BallDirs.NONE;  // idle state
            this.ball.speed = BALL_DEFAULT_SPEED;
            if (this.lifes < 5) {
                this.lifesContainer.innerHTML = localStorage.lifes = ++this.lifes;
            }
            localStorage.level = ++this.level;
            this.initLevel();
        }

        if (collision) {
            this.scoreContainer.innerHTML = this.score;
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
    };

    this.updateTimer = () => {
        let timer = parseInt(localStorage.timer) || 0;
        if (timer) {
            let now = new Date().getTime();
            let distance = timer - now;
            if (distance < 0) {
                localStorage.timer = 0;
                clearInterval(this.interval);
                this.interval = null;
                this.timerWrapper.classList.remove("opened");
                this.lifesContainer.innerHTML = localStorage.lifes = ++this.lifes;
                return;
            }

            let hours = Math.floor(distance/(1000*60*60));
            if (hours < 10) hours = "0" + hours;
            let minutes = Math.floor((distance % (1000*60*60)) / (1000*60));
            if (minutes < 10) minutes = "0" + minutes;
            let seconds = Math.floor((distance % (1000*60)) / 1000);
            if (seconds < 10) seconds = "0" + seconds;
            this.timerContainer.innerHTML = `${hours}:${minutes}:${seconds}`;
            this.timerWrapper.classList.add("opened");
        } else {
            this.timerWrapper.classList.remove("opened");
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

    this.startGame = () => {
        scoreboard.classList.remove("opened");
        let dirs = [BallDirs.LEFT, BallDirs.RIGHT];
        this.ball.dir = dirs[getRandomInt(0, 1)] + BallDirs.UP;
    };
};

//-----------------------------------------------------------------------------------
// Utilities
//-----------------------------------------------------------------------------------

function loadAssets() {
    imgBricks = new Image(); imgBricks.src = "./images/bricks.png";
    imgPaddle = new Image(); imgPaddle.src = "./images/paddle.png";
    imgBall = new Image(); imgBall.src = "./images/ball.png";

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

        setInterval(arkanoidGame.render, 1000 / 60);
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
            event.preventDefault()
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
