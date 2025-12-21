# Jump Space Power Grid Optimizer

A web-based tool to optimize component placement on your ship's power grid in Jump Space.

## [Launch the App Here](https://jasbanza.github.io/jump-space-power-grid-optimizer/)

---

## Features

- **Visual Grid Configuration**: Dropdowns positioned next to their grid sections
  - Reactor selector next to rows 1-4
  - Aux Generator 1 selector next to rows 5-6
  - Aux Generator 2 selector next to rows 7-8
- **Protected Cells**: Blue cells indicate priority placement areas
- **Component Library**: All game components organized by category with multiple tiers
- **Component Filters**: Filter by name or number of blocks
- **Auto-Solver**: Finds optimal placements (prioritizes protected cells)
- **Two Solve Modes**:
  - *Require All*: Must place all selected components (fails if impossible)
  - *Maximize Coverage*: Place as many components as possible

## Usage

1. **Select a reactor** (left of grid rows 1-4) to set the top half of your grid
2. **Optionally add aux generators** (left of rows 5-6 and 7-8)
3. **Filter and select components** - set quantities for each tier
4. **Click Solve** - the optimizer finds valid placements

---

## Contributing

**Help us build the component library with accurate game data!**

### Quick Links
- [Edit Components](https://github.com/jasbanza/jump-space-power-grid-optimizer/edit/main/data/components.json)
- [Edit Reactors](https://github.com/jasbanza/jump-space-power-grid-optimizer/edit/main/data/reactors.json)
- [Edit Aux Generators](https://github.com/jasbanza/jump-space-power-grid-optimizer/edit/main/data/auxGenerators.json)

### How to Contribute

1. **Fork this repository**
2. **Edit the JSON files** (see formats below)
3. **Submit a Pull Request**

### Adding Component Shapes

Edit `data/components.json`:

```json
{
  "componentId": {
    "id": "componentId",
    "name": "Component Name",
    "category": "CATEGORY NAME",
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
      }
    }
  }
}
```

**Categories:** SENSORS, ENGINES, PILOT CANNONS, MULTI-TURRET SYSTEMS, SPECIAL WEAPONS

### Adding Reactors (8x4 grids)

Edit `data/reactors.json`:

```json
{
  "reactorId": {
    "id": "reactorId",
    "name": "Reactor Name",
    "powerGeneration": 22,
    "protectedPower": 8,
    "unprotectedPower": 14,
    "grid": [
      [2, 2, 0, 0, 0, 0, 2, 2],
      [1, 2, 1, 0, 0, 1, 2, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 1]
    ]
  }
}
```

### Adding Aux Generators (8x2 grids)

Edit `data/auxGenerators.json`:

```json
{
  "auxId": {
    "id": "auxId",
    "name": "Aux Generator Name",
    "powerGeneration": 10,
    "protectedPower": 4,
    "unprotectedPower": 6,
    "grid": [
      [0, 2, 1, 1, 1, 1, 2, 0],
      [0, 2, 1, 1, 1, 1, 2, 0]
    ]
  }
}
```

**Grid values:** `0` = unpowered, `1` = powered (green), `2` = protected (blue)

---

## Grid Structure

```
+------------------+
|   REACTOR (8x4)  | <- Rows 1-4, selected by Reactor dropdown
+------------------+
| AUX GEN 1 (8x2)  | <- Rows 5-6, optional
+------------------+
| AUX GEN 2 (8x2)  | <- Rows 7-8, optional
+------------------+
```

## Project Structure

```
├── index.html            # Main page
├── css/
│   └── styles.css        # Styling (dark theme)
├── data/
│   ├── components.json   # Component shapes by category/tier
│   ├── reactors.json     # Reactor grid layouts (8x4)
│   └── auxGenerators.json # Aux generator layouts (8x2)
├── js/
│   ├── main.js           # App initialization
│   ├── grid.js           # Grid state management
│   ├── components.js     # Component loader & utilities
│   ├── templates.js      # Reactor/aux loader & combiner
│   ├── solver.js         # Backtracking solver
│   └── ui.js             # UI rendering & events
├── GAME_RULES.md         # Game mechanics documentation
└── README.md             # This file
```

## License

MIT
