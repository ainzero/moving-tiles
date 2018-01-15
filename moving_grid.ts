import { particles, Application, Sprite, Graphics } from "pixi.js";

class Point {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    isEqualTo(p: Point): boolean {
        if (this.x == p.x && this.y == p.y) {
            return true;
        }
        return false;
    }
}

class Tile {

    current_pos: Point; // current positon
    next_pos: Point; // next position in the future

    readonly width: number;
    readonly height: number;

    sprite: Sprite; // Sprite to draw, thanks to pixi

    velocity_x: number;
    velocity_y: number;

    moving: boolean; // is this tile moving right now?

    constructor(x: number, y: number, tile_w: number, tile_h: number) {
        this.next_pos = undefined;
        this.current_pos = new Point(x, y);

        this.width = tile_w;
        this.height = tile_h;

        this.sprite = undefined;

        this.velocity_x = 0;
        this.velocity_y = 0;
        this.moving = false;
    }
}

/*
 * TileRenderer - responsible for drawing the tiles moving on the canvas
 */
class TileRenderer {

    readonly app: Application; // pixi.js application

    private readonly tile_width: number;
    private readonly tile_height: number;

    private readonly board_width: number;
    private readonly board_height: number;

    private readonly tile_container: particles.ParticleContainer; // container for all tiles to draw

    private tile_list_size: number;
    private finished_tile_count: number;

    moving_tiles: boolean; // is the renderer moving tiles at this moment?

    private tile_moving_index: number;
    private readonly speed: number;

    constructor(tile_width: number,
        tile_height: number, board_width: number, board_height: number, app: Application, velocity = 1.0) {

        this.board_width = board_width;
        this.board_height = board_height;

        this.tile_width = tile_width;
        this.tile_height = tile_height;

        this.tile_container = new particles.ParticleContainer();

        this.tile_list_size = undefined;
        this.finished_tile_count = undefined;

        this.moving_tiles = false;

        this.tile_moving_index = 0;

        this.speed = velocity;

        this.app = app;

    }

    initialize(tile_list: Array<Tile>, tile_color = 0x00FF00, element: Element) {

        element.appendChild(this.app.view);
        this.app.ticker.autoStart = true;

        // for each tile, create a sprite
        const that = this;
        tile_list.forEach(function (tile, index) {
            tile.sprite = that.createTile(
                tile_color, tile.current_pos.x, tile.current_pos.y, tile.width, tile.height
            );

            that.tile_container.addChild(tile.sprite);
        });

        this.app.stage.addChild(this.tile_container);
    }


    createTile(fillColor: number, x: number, y: number, width: number, height: number) {
        const rectangle = new Graphics();

        rectangle.beginFill(fillColor);
        rectangle.drawRect(0, 0, width, height);
        rectangle.endFill();
        rectangle.x = 0;
        rectangle.y = 0;

        const texture = PIXI.RenderTexture.create(width, height);
        this.app.renderer.render(rectangle, texture);

        const sp = new Sprite(texture);
        sp.x = x;
        sp.y = y;

        return sp;
    }

    moveTiles(tile_list: Array<Tile>, delta: number) {

        if (this.tile_list_size == undefined) {
            this.tile_list_size = tile_list.length;
            this.tile_moving_index = 0;
            this.finished_tile_count = 0;
        }

        if (this.tile_moving_index >= this.tile_list_size - 1) {
            this.moving_tiles = false;
            this.tile_list_size = undefined;
            return;
        }

        const tile = tile_list[this.tile_moving_index];

        if (tile.moving) {

            const moving_right = tile.next_pos.x - tile.current_pos.x > 0 &&
                tile.sprite.x < tile.next_pos.x;

            const moving_left = tile.next_pos.x - tile.current_pos.x < 0 &&
                tile.sprite.x > tile.next_pos.x;

            const moving_down = tile.next_pos.y - tile.current_pos.y > 0 &&
                tile.sprite.y < tile.next_pos.y;

            const moving_up = tile.next_pos.y - tile.current_pos.y < 0 &&
                tile.sprite.y > tile.next_pos.y;

            if (moving_right) {
                tile.velocity_x = this.speed;
                tile.velocity_y = 0;
            } else if (moving_left) {
                tile.velocity_x = -1 * this.speed;
                tile.velocity_y = 0;
            } else if (moving_down) {
                tile.velocity_y = this.speed;
                tile.velocity_x = 0;
            } else if (moving_up) {
                tile.velocity_y = -1 * this.speed;
                tile.velocity_x = 0;
            } else {
                // tile is finished moving
                tile.velocity_x = 0;
                tile.velocity_y = 0;

                tile.current_pos = tile.next_pos;
                tile.next_pos = undefined;
                tile.moving = false;

                this.finished_tile_count++;

                if (this.tile_moving_index < this.tile_list_size - 1) {
                    this.tile_moving_index++;
                }
            }

            tile.sprite.x += tile.velocity_x
            tile.sprite.y += tile.velocity_y

            if (this.finished_tile_count == this.tile_list_size) {
                this.moving_tiles = false;
                this.tile_list_size = undefined;
            }
        } else {
            this.tile_moving_index++;
            this.finished_tile_count++;
        }


    }

}

class TileController {
    private readonly _board_width: number;
    private readonly _board_height: number;

    private readonly _tile_width: number;
    private readonly _tile_height: number;

    moving_tiles: Array<Tile>;
    readonly all_tiles: Array<Tile>;

    constructor(board_width: number, board_height: number, tile_width: number,
        tile_height: number) {

        this._board_width = board_width;
        this._board_height = board_height;

        this._tile_width = tile_width;
        this._tile_height = tile_height;

        this.moving_tiles = new Array<Tile>();
        this.all_tiles = new Array<Tile>();
    }

    initialize(tile_creation_threshold = 0.5) {
        for (let y = 0; y < this._board_height; y += this._tile_height) {
            for (let x = 0; x < this._board_width; x += this._tile_width) {
                if (Math.random() > tile_creation_threshold) {
                    continue;
                }
                const new_tile = new Tile(x, y, this._tile_width, this._tile_height);
                this.all_tiles.push(new_tile);
            }
        }
    }

    transition(): boolean {
        let number_of_tiles_moving = 0;
        for (let tile of this.all_tiles) {

            const displacement_choice = Math.random();

            let positive_displacement = 1;
            if (displacement_choice <= 0.50) {
                positive_displacement = -1;
            }

            const axis_choice = Math.random();

            let move_on_x_axis = false;
            if (axis_choice <= 0.50) {
                move_on_x_axis = true;
            }

            let next_pos: [number, number];
            if (move_on_x_axis) {
                if (positive_displacement == 1) {
                    next_pos = [tile.current_pos.x + this._tile_width, tile.current_pos.y];
                } else {
                    next_pos = [tile.current_pos.x - this._tile_width, tile.current_pos.y];
                }
            } else {
                if (positive_displacement == 1) {
                    next_pos = [tile.current_pos.x, tile.current_pos.y + this._tile_height];
                } else {
                    next_pos = [tile.current_pos.x, tile.current_pos.y - this._tile_height];
                }
            }

            const next_move = new Point(next_pos[0], next_pos[1]);
            let continue_to = false;

            if ((next_move.x > this._board_width - this._tile_width || next_move.x < 0) ||
                (next_move.y > this._board_height - this._tile_height || next_move.y < 0)) {
                tile.next_pos = undefined;
                continue_to = true;
            }

            for (let t of this.all_tiles) {
                if (t.current_pos.isEqualTo(next_move) || (t.next_pos != undefined &&
                    t.next_pos.isEqualTo(next_move))) {
                    tile.next_pos = undefined;
                    continue_to = true;
                    break;
                }
            }

            if (continue_to) {
                continue;
            }

            tile.next_pos = next_move;
            tile.moving = true;
            number_of_tiles_moving++;
        }

        if (number_of_tiles_moving > 0) {
            return true;
        }

        return false;
    }
}

export class MovingTileGrid {

    readonly grid_height: number;
    readonly grid_width: number;
    readonly tile_width: number;
    readonly tile_height: number;

    readonly background_color: number;
    readonly tile_color: number;

    readonly element_to_attach: Element;

    readonly tile_controller: TileController;
    readonly tile_renderer: TileRenderer;

    constructor(g_width: number, g_height: number, t_width: number, t_height: number, tile_c: number, background_c: number, element: Element) {
        this.grid_height = g_height;
        this.grid_width = g_width;
        this.tile_width = t_width;
        this.tile_height = t_height;

        this.tile_color = tile_c;
        this.background_color = background_c;

        this.element_to_attach = element;

        const app = new Application({
            width: this.grid_width,
            height: this.grid_height,
            antialias: true,
            resolution: 1,
            transparent: false,
            clearBeforeRender: true,
            backgroundColor: this.background_color,
            forceFXAA: true
        });

        app.ticker.stop();

        this.tile_controller = new TileController(this.grid_width, this.grid_height, this.tile_width,
            this.tile_height);

        this.tile_renderer = new TileRenderer(this.tile_width, this.tile_height,
            this.grid_width, this.grid_height, app);
    }

    initialize() {
        this.tile_controller.initialize();
        this.tile_renderer.initialize(this.tile_controller.all_tiles, this.tile_color, this.element_to_attach);
    }

    start() {
        if (!this.tile_renderer.app.ticker.started) {
            const that = this;

            const displayLoop = function (delta: number) {

                if (!that.tile_renderer.moving_tiles) {
                    const tiles_to_move = that.tile_controller.transition();

                    if (tiles_to_move) {
                        that.tile_renderer.moving_tiles = true;
                    }
                }
                that.tile_renderer.moveTiles(that.tile_controller.all_tiles, delta);
            }

            that.tile_renderer.app.ticker.add(displayLoop);
        } else {

            this.tile_renderer.app.ticker.start();
        }
    }

    stop() {
        this.tile_renderer.app.ticker.stop();
    }
}
