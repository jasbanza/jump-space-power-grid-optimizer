# Jump Space Power Grid Optimizer

A web-based tool to optimize component placement on your ship's power grid in Jump Space.

## [🚀 Launch the App Here](https://jasbanza.github.io/jump-space-power-grid-optimizer/)

---

## Features

- **Interactive Grid Editor**: Click to toggle cells between powered (green) and unpowered (black)
- **Protected Cells**: Light blue cells indicate priority placement areas (from templates)
- **Component Library**: Pre-defined tetris-like pieces with multiple upgrade tiers
- **Component Filters**: Filter by name or number of blocks
- **Auto-Solver**: Automatically finds optimal piece placements (prioritizes protected cells)
- **Grid Templates**: Pre-configured engine/power layouts to quickly load
- **Two Solve Modes**:
  - *Require All*: Must place all selected components (fails if impossible)
  - *Maximize Coverage*: Place as many components as possible
- **Persistent State**: Grid configuration saved to localStorage

## Usage

1. **Select a template** or click cells to configure powered squares
2. **Filter components** by name or block count (optional)
3. **Expand component groups** and set tier quantities
4. **Click Solve**: The optimizer will find valid placements

---

## Contributing

**Help improve this tool by contributing component shapes and engine layouts from the game!**

### Quick Links
- [Edit Components](https://github.com/jasbanza/jump-space-power-grid-optimizer/edit/main/data/components.json)
- [Edit Templates](https://github.com/jasbanza/jump-space-power-grid-optimizer/edit/main/data/templates.json)

### How to Contribute

1. **Fork this repository**
2. **Edit the JSON files** (see formats below)
3. **Submit a Pull Request**

### Adding Component Shapes

Edit `data/components.json`:

```json
{
  "myComponent": {
    "id": "myComponent",
    "name": "Component Name",
    "tiers": {
      "1": {
        "shape": [
          [1, 0],
          [1, 1]
        ]
      },
      "2": {
        "shape": [
          [1, 0, 0],
          [1, 0, 0],
          [1, 1, 1]
        ]
      },
      "3": {
        "shape": [
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      }
    }
  }
}
```

**Shape values:**
- `1` = filled cell
- `0` = empty cell
- Each row is a separate array, place them on separate lines for readability

### Adding Engine/Power Grid Templates

Edit `data/templates.json`:

```json
{
  "myTemplate": {
    "id": "myTemplate",
    "name": "Engine Name + Aux Setup",
    "grid": [
      [2, 2, 0, 0, 0, 0, 2, 2],
      [1, 2, 1, 0, 0, 1, 2, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  }
}
```

**Grid values:**
- `0` = unpowered (black)
- `1` = powered (green)
- `2` = protected (light blue) - solver prioritizes these cells

### What We Need

- **All component shapes** from the game (weapons, shields, systems, etc.)
- **Component tiers** - each upgrade tier may have a different shape
- **Engine layouts** for different engine types
- **Auxiliary engine combinations** that modify the power grid

Screenshots from the game are helpful for reference!

---

## Project Structure

```
├── index.html           # Main page
├── css/
│   └── styles.css       # Styling (dark theme)
├── data/
│   ├── components.json  # Component definitions (CONTRIBUTE HERE)
│   └── templates.json   # Grid templates (CONTRIBUTE HERE)
├── js/
│   ├── main.js          # App initialization
│   ├── grid.js          # Grid state management
│   ├── components.js    # Component loader & utilities
│   ├── templates.js     # Template loader
│   ├── solver.js        # Backtracking solver
│   └── ui.js            # UI rendering & events
├── CONSTRAINTS.md       # Game rules & planning notes
└── README.md            # This file
```

## License

MIT
