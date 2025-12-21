# Jump Space Power Grid Optimizer

A web-based tool to optimize component placement on your ship's power grid in Jump Space.

## [Launch the App Here](https://jasbanza.github.io/jump-space-power-grid-optimizer/)

---

## Features

- **Interactive Grid Editor**: Click to toggle cells between powered (green) and unpowered (black)
- **Component Library**: Pre-defined tetris-like pieces to place on the grid
- **Auto-Solver**: Automatically finds optimal piece placements using backtracking algorithm
- **Grid Templates**: Pre-configured engine/power layouts to quickly load
- **Two Solve Modes**:
  - *Require All*: Must place all selected pieces (fails if impossible)
  - *Maximize Coverage*: Place as many pieces as possible
- **Persistent State**: Grid configuration saved to localStorage

## Usage

1. **Select a template** or click cells to configure powered squares
2. **Set component quantities**: Enter how many of each piece you have
3. **Click Solve**: The optimizer will find valid placements

---

## Contributing

**Help improve this tool by contributing component shapes and engine layouts from the game!**

### How to Contribute

1. **Fork this repository**
2. **Add your contributions** (see below)
3. **Submit a Pull Request**

### Adding Component Shapes

Edit `js/pieces.js` and add new pieces following this format:

```javascript
myComponent: {
    id: 'myComponent',
    name: 'Component Name',
    shape: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 0]
    ]
}
```

Where `1` = filled cell, `0` = empty cell.

### Adding Engine/Power Grid Templates

Edit `js/templates.js` and add new templates following this format:

```javascript
myTemplate: {
    id: 'myTemplate',
    name: 'Engine Name + Aux Setup',
    grid: [
        [1, 1, 0, 0, 0, 0, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ]
}
```

Where `1` = powered (green), `0` = unpowered (black).

### What We Need

- **All component shapes** from the game (weapons, shields, systems, etc.)
- **Engine layouts** for different engine types
- **Auxiliary engine combinations** that modify the power grid

Screenshots from the game are helpful for reference!

---

## Project Structure

```
├── index.html          # Main page
├── css/
│   └── styles.css      # Styling (dark theme)
├── js/
│   ├── main.js         # App initialization
│   ├── grid.js         # Grid state management
│   ├── pieces.js       # Component definitions
│   ├── templates.js    # Grid templates
│   ├── solver.js       # Backtracking solver
│   └── ui.js           # UI rendering & events
├── CONSTRAINTS.md      # Game rules & planning notes
└── README.md           # This file
```

## License

MIT
