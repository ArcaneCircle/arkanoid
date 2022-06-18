let arkanoidGame,
    imgBall,
    imgPaddle,
    imgBricks;
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

window.addEventListener("load", () => {
    window.highscores.init("Arkanoid").then(() =>{
        checkCanvasIsSupported();
        // Preload images
        loadImages();

        document.onmousemove = function(event) {
            event.preventDefault()
            arkanoidGame.setPaddlePos(event.pageX);
        }

        document.ontouchmove = function(event) {
            arkanoidGame.setPaddlePos(event.touches[0].clientX);
        }

        document.onclick = function(){
            if (arkanoidGame.gameOver) {
                document.location.reload(true);
            } else {
                arkanoidGame.startGame();
            }
        }

        document.onkeydown = function(event) {
            var keyCode;
            if (event == null) {
                keyCode = window.event.keyCode;
            } else {
                keyCode = event.keyCode;
            }
            switch (keyCode) {
            case KeyCodes.SPACE:
                if (arkanoidGame.ball.dir === BallDirs.NONE) {
                    arkanoidGame.startGame();
                } else if (arkanoidGame.gameOver) {
                    document.location.reload(true);
                } else {
                    arkanoidGame.togglePause();
                }
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

// Function to preload all images
var loadImages = function ( ) {
   imgBricks = new Image(); imgBricks.src = "./images/bricks.png";
   imgPaddle = new Image(); imgPaddle.src = "./images/paddle.png";
   imgBall = new Image(); imgBall.src = "./images/ball.png";
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

//-----------------------------------------------------------------------------------------------------------
// Arkanoid Game class
//-----------------------------------------------------------------------------------------------------------
function ArkanoidGame(canvas, context) {

    let PADDLE_WIDTH = 60,
        PADDLE_HEIGHT = 15,
        PADDLE_SPEED = 3,
        BALL_RADIUS = 5,
        BALL_DEFAULT_SPEED = 5,
        BALL_MAX_SPEED = 8,
        BRICK_WIDTH = 81,
        BRICK_HEIGHT = 35,
        BRICK_SCORE = 5;

    this.level = 1;
    this.lifes = 3;
    this.score = 0;
    canvas.width = Math.max(canvas.width, PADDLE_WIDTH * 3);
    this.paddle = new Paddle(canvas.width / 2 - PADDLE_WIDTH / 2, canvas.height - 20, PADDLE_WIDTH, PADDLE_HEIGHT);
    this.ball = new Ball(canvas.width / 2, canvas.height / 2, BALL_RADIUS, BallDirs.NONE, BALL_DEFAULT_SPEED);
    this.gameOver = false;
    this.gamePaused = false;
    this.bricks = new Bricks(5, 2, BRICK_WIDTH, BRICK_HEIGHT);

    this.init = function() {
        this.level = parseInt(localStorage.level) || this.level;
        this.lifes = parseInt(localStorage.lifes) || this.lifes;
        this.score = parseInt(localStorage.score) || this.score;
        this.gameOver = false;
        this.gamePaused = false;
        this.ball.dir = BallDirs.NONE;
        this.initLevel(this.level);
    };

    this.initLevel = function(level) {
        if (window.levels[level]) {
            level = window.levels[level];
            let brick_width = Math.round(canvas.width/level[0].length);
            this.bricks = new Bricks(level[0].length, level.length, brick_width, BRICK_HEIGHT, level);
        } else {
            let cols = 6 + getRandomInt(0, level < 10? 1 : 3);
            let brick_width = Math.round(canvas.width/cols);
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

    this.drawBall = function() {
        context.drawImage(imgBall, this.ball.x, this.ball.y);
    };

    this.drawPaddle = function() {
        context.drawImage(imgPaddle, this.paddle.x, this.paddle.y);
    };

    this.drawBricks = function() {
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

    this.draw = function() {
        context.fillStyle = 'rgb(0,10,0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        this.drawBall();
        this.drawPaddle();
        this.drawBricks();

        if (this.gamePaused && !this.gameOver) {
            context.fillStyle = 'rgb(255,255,0)';
            context.font = 'bold 20px Arial';
            context.fillText('Pause', canvas.width / 2 - 30, canvas.height / 2);
        } else if (this.gameOver) {
            if (!this.gamePaused) {
                window.highscores.setScore(this.score);
                this.bricks = new Bricks(0, 0, BRICK_WIDTH, BRICK_HEIGHT);
            }
            this.drawScoreboard();
            this.gamePaused = true;
        } else if(this.ball.dir==BallDirs.NONE) {
            this.drawScoreboard();
        }

        context.fillStyle = 'rgb(255,255,220)';
        context.font = 'bold 15px Arial';
        context.fillText('Score: ' + this.score, 5, 15);

        context.fillStyle = 'rgb(255,255,220)';
        context.font = 'bold 15px Arial';
        context.fillText('Lifes: ' + this.lifes, 5, 35);
    };

    this.update = function() {
        if (this.gamePaused || this.gameOver) return;

        // update ball pos
        if (this.ball.dir & BallDirs.RIGHT) this.ball.x += this.ball.speed;
        else if (this.ball.dir & BallDirs.LEFT) this.ball.x -= this.ball.speed;
        if (this.ball.dir & BallDirs.UP) this.ball.y -= this.ball.speed;
        else if (this.ball.dir & BallDirs.DOWN) this.ball.y += this.ball.speed;

        // ball bounce from paddle
        if ((this.ball.x + this.ball.radius > this.paddle.x && this.ball.x - this.ball.radius < this.paddle.x + this.paddle.width) &&
            (this.ball.y + this.ball.radius > this.paddle.y)) {
            let maxSpeed = BALL_MAX_SPEED - (this.level < 10? 1 : 0);
            if (this.ball.speed < maxSpeed) {
                this.ball.speed += getRandomInt(1, 3)*0.1 + (this.level < 10? 0.1 : 0.2);
            }
            if (this.ball.dir & BallDirs.DOWN) {
                this.ball.dir = this.ball.dir - BallDirs.DOWN + BallDirs.UP;
            } else if (this.ball.dir & BallDirs.UP) {
                this.ball.dir = this.ball.dir - BallDirs.UP + BallDirs.DOWN;
            }
        }

        // update ball
        if (this.ball.x - this.ball.radius < 0) {
            this.ball.x = this.ball.radius;
            this.ball.dir = this.ball.dir - BallDirs.LEFT + BallDirs.RIGHT;
        }
        if (this.ball.x + this.ball.radius > canvas.width) {
            this.ball.x = canvas.width - this.ball.radius;
            this.ball.dir = this.ball.dir - BallDirs.RIGHT + BallDirs.LEFT;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.y = this.ball.radius;
            this.ball.dir = this.ball.dir - BallDirs.UP + BallDirs.DOWN;
        }

        if (this.ball.y + this.ball.radius > canvas.height) {
            // lost one life
            window.navigator.vibrate(100);
            localStorage.lifes = --this.lifes;
            this.ball.speed = BALL_DEFAULT_SPEED;
            if (this.lifes == 0) {
                this.gameOver = true;
                localStorage.removeItem("level");
                localStorage.removeItem("score");
            } else {
                this.ball.x = canvas.width / 2;
                this.ball.y = canvas.height / 2;
                this.ball.dir = BallDirs.NONE;
            }
        }

        if (this.ball.dir == BallDirs.NONE) {
            this.ball.x = this.paddle.x + this.paddle.width / 2 - this.ball.radius;
            this.ball.y = this.paddle.y - this.ball.radius * 2;
        }

        // bounces
        for (var i = 0; i < this.bricks.bricks.length; i++) {
            for (var j = 0; j < this.bricks.bricks[i].length; j++) {
                let brickLifes = this.bricks.bricks[i][j].lifes;
                if (brickLifes !== 0) {
                    if (this.ball.dir == BallDirs.LEFT + BallDirs.UP) {
                        if (this.isPointInRect(this.ball.x - this.ball.speed, this.ball.y - 0, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.x = this.bricks.bricks[i][j].x + this.bricks.bricks[i][j].width + this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.LEFT + BallDirs.RIGHT;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                        if (this.isPointInRect(this.ball.x - 0, this.ball.y - this.ball.speed, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.y = this.bricks.bricks[i][j].y + this.bricks.bricks[i][j].height + this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.UP + BallDirs.DOWN;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                    } else if (this.ball.dir == BallDirs.LEFT + BallDirs.DOWN) {
                        if (this.isPointInRect(this.ball.x - this.ball.speed, this.ball.y + 0, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.x = this.bricks.bricks[i][j].x + this.bricks.bricks[i][j].width + this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.LEFT + BallDirs.RIGHT;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                        if (this.isPointInRect(this.ball.x - 0, this.ball.y + this.ball.speed, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.y = this.bricks.bricks[i][j].y - this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.DOWN + BallDirs.UP;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                    } else if (this.ball.dir == BallDirs.RIGHT + BallDirs.UP) {
                        if (this.isPointInRect(this.ball.x + this.ball.speed, this.ball.y - 0, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.x = this.bricks.bricks[i][j].x - this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.RIGHT + BallDirs.LEFT;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                        if (this.isPointInRect(this.ball.x + 0, this.ball.y - this.ball.speed, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.y = this.bricks.bricks[i][j].y + this.bricks.bricks[i][j].height + this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.UP + BallDirs.DOWN;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                    } else if (this.ball.dir == BallDirs.RIGHT + BallDirs.DOWN) {
                        if (this.isPointInRect(this.ball.x + this.ball.speed, this.ball.y + 0, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.x = this.bricks.bricks[i][j].x - this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.RIGHT + BallDirs.LEFT;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                        if (this.isPointInRect(this.ball.x + 0, this.ball.y + this.ball.speed, this.bricks.bricks[i][j].x, this.bricks.bricks[i][j].y, this.bricks.bricks[i][j].width, this.bricks.bricks[i][j].height)) {
                            this.ball.y = this.bricks.bricks[i][j].y - this.ball.speed;
                            this.ball.dir = this.ball.dir - BallDirs.DOWN + BallDirs.UP;
                            if (brickLifes > 0) {
                                this.bricks.bricks[i][j].lifes--;
                                this.score += BRICK_SCORE;
                            }
                            return;
                        }
                    }
                }
            }
        }

        let levelUp = true;
        for (var i = 0; i < this.bricks.bricks.length; i++) {
            if (!levelUp) break;
            for (var j = 0; j < this.bricks.bricks[i].length; j++) {
                if (this.bricks.bricks[i][j].lifes > 0) {
                    levelUp = false;
                    break;
                }
            }
        }
        if (levelUp) {
            window.highscores.setScore(this.score);
            this.ball.dir = BallDirs.NONE;
            this.ball.speed = BALL_DEFAULT_SPEED;
            localStorage.lifes = ++this.lifes;
            localStorage.level = ++this.level;
            localStorage.score = this.score;
            this.initLevel(this.level);
        }
    };


    this.isPointInRect = function(x, y, rect_x, rect_y, rect_width, rect_height) {
        if ((x > rect_x && x < rect_x + rect_width) &&
            (y > rect_y && y < rect_y + rect_height))
            return true;
        return false;
    };

    this.isBallIntersectBrick = function(i, j) {
        if ((this.ball.x + this.ball.radius > this.bricks.bricks[i][j].x &&
             this.ball.x - this.ball.radius < this.bricks.bricks[i][j].x + this.bricks.bricks[i][j].width) &&
            (this.ball.y + this.ball.radius > this.bricks.bricks[i][j].y &&
             this.ball.y - this.ball.radius < this.bricks.bricks[i][j].y + this.bricks.bricks[i][j].height))
            return true;
        return false;
    };

    this.render = function() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.update();
        this.draw();
    };

    this.togglePause = function() {
        this.gamePaused = !this.gamePaused;
    };

    this.movePaddleLeft = function() {
        if (this.gamePaused || this.gameOver) return;
        let x = this.paddle.x - 10 * PADDLE_SPEED;
        if (x < 0) x = 0;
        if (x > canvas.width - this.paddle.width) x = canvas.width - this.paddle.width;
        this.paddle.x = x;
    };

    this.movePaddleRight = function() {
        if (this.gamePaused || this.gameOver) return;
        let x = this.paddle.x + 10 * PADDLE_SPEED;
        if (x < 0) x = 0;
        if (x > canvas.width - this.paddle.width) x = canvas.width - this.paddle.width;
        this.paddle.x = x;
    };

    this.setPaddlePos = function(x) {
        if (this.gamePaused || this.gameOver) return;
        if (x < this.paddle.width/2) {
            x = 0;
        } else if (x > canvas.width - this.paddle.width/2) {
            x = canvas.width - this.paddle.width;
        } else {
            x -= this.paddle.width/2 + 5;
        }
        this.paddle.x = x;
    };

    this.startGame = function() {
        if (this.gamePaused) return;
        if (this.ball.dir == BallDirs.NONE) {
            this.ball.dir = BallDirs.RIGHT + BallDirs.UP;
        }
    };

    this.drawScoreboard = function() {
        let board = window.highscores.getHighScores();
        if (board.length === 0) return;

        context.fillStyle = 'rgb(255,255,0)';
        context.font = 'bold 20px Arial';
        context.fillText('Scoreboard', canvas.width / 2 - 50, (canvas.height / 2)-20);
        for (let i = 0; i < board.length; i++) {
            context.fillText(board[i].pos + ". " + board[i].name + " " + board[i].score, canvas.width / 2 - 50, (canvas.height / 2)+i*20);
        }
    };
};


function getRandomRange(min, max) {
    return Math.random() * (max - min + 1) + min;
}

function render() {
    arkanoidGame.render();
}

function checkCanvasIsSupported() {
    let canvas = document.getElementById("gameCanvas");
    canvas.width =  Math.min((window.innerWidth || document.documentElement.clientWidth ||
                              document.body.clientWidth)-15, 500);
    canvas.height = (window.innerHeight|| document.documentElement.clientHeight||
                     document.body.clientHeight)-100;
    canvas.style.cursor = "none";
    if (canvas.getContext) {
        arkanoidGame = new ArkanoidGame(canvas, canvas.getContext('2d'));
        arkanoidGame.init();

        setInterval(render, 1000 / 60);
    } else {
        document.getElementById("body").innerHTML = "Sorry, but your browser doesn't support a canvas.";
    }
}

