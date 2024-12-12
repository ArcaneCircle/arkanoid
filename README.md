# Arkanoid.xdc

An Arkanoid clon for Webxdc.

## Contributing

### Installing Dependencies

After cloning this repo, install dependencies:

```
pnpm i
```

### Checking code format

```
pnpm check
```

### Testing the app in the browser

To test your work in your browser (with hot reloading!) while developing:

```
pnpm start
```

### Building

To package the WebXDC file:

```
pnpm build
```

To package the WebXDC with developer tools inside to debug in Delta Chat, set the `NODE_ENV`
environment variable to "debug":

```
NODE_ENV=debug pnpm build
```

The resulting optimized `.xdc` file is saved in `dist-xdc/` folder.

### Releasing

To automatically build and create a new GitHub release with the `.xdc` file:

```
git tag -a v1.0.1
git push origin v1.0.1
```

### Credits

Initially based on [arkanoid-js](https://github.com/delimitry/arkanoid-js)

#### Sounds

- `sounds/bounce.mp3` taken from https://github.com/city41/breakouts/blob/master/resources/sfx/brickDeath.mp3
- `sounds/hit.mp3` taken from https://github.com/city41/breakouts/blob/master/resources/sfx/powerdown.mp3
- `sounds/victory.mp3` taken from [MonsterPong](https://github.com/michelebucelli/monsterpong)

#### Images

The graphics were taken from [MonsterPong](https://github.com/michelebucelli/monsterpong) and tweaked a bit, they are licensed under CC-By-SA 3.0 and available on [OpenGameArt](https://opengameart.org/content/monsterpong-assets)

The score/trophy, level and life icons are from the Carbon icons from [Iconify](https://iconify.design)
