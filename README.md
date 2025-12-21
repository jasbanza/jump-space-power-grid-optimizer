# Jump Space Power Grid Optimizer

A web-based tool to optimize component placement on your ship's power grid in Jump Space.

## [Launch the App Here](https://jasbanza.github.io/jump-space-power-grid-optimizer/)

---

## Features

### Grid Configuration
- **Visual Dropdowns**: Custom dropdowns with grid previews showing power cell layouts
- **Tiered Reactors & Generators**: Support for multiple tiers (Mk 1, Mk 2, etc.) with different layouts
- **Dynamic Grid Composition**:
  - Reactor (rows 1-4) + Aux Generator 1 (rows 5-6) + Aux Generator 2 (rows 7-8)
- **Protected Cells**: Blue cells indicate priority placement areas

### Build Order & Priority System
- **Priority List**: Drag-and-drop to reorder component placement priority
- **Mandatory Components**: Check "Must" to mark components as required
- **Visual Feedback**: 
  - Red highlight for components that couldn't be placed
  - Green highlight for placed components
  - Hover sync between grid and priority list

### Component Library
- **Collapsible Categories**: Organized by type (Sensors, Engines, Weapons, etc.)
- **Tier Support**: Multiple tiers per component with different shapes
- **Advanced Filters**: Filter by name, block count, and tier

### Smart Solver
- **Priority-Based Placement**: Respects your build order
- **Mandatory First**: Uses backtracking to fit all mandatory components
- **Protected Cell Priority**: Prefers placing on protected (blue) cells
- **Semi-Transparent Overlays**: See power cells beneath placed components

## Usage

1. **Configure your grid**
   - Select a reactor from the dropdown (left of rows 1-4)
   - Optionally add aux generators (rows 5-6 and 7-8)

2. **Add components to Build Order**
   - Expand categories and set quantities for each tier
   - Components automatically appear in the priority list

3. **Organize priority**
   - Drag components to reorder placement priority
   - Check "Must" for mandatory components

4. **Solve**
   - Click Solve - the optimizer places components in priority order
   - Hover over placed components to highlight in the list (and vice versa)

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

Edit `data/reactors.json` - now supports tiers:

```json
{
  "reactorId": {
    "id": "reactorId",
    "name": "Reactor Name",
    "category": "REACTORS",
    "tiers": {
      "1": {
        "powerGeneration": 22,
        "protectedPower": 8,
        "unprotectedPower": 14,
        "grid": [
          [2, 2, 0, 0, 0, 0, 2, 2],
          [1, 2, 1, 0, 0, 1, 2, 1],
          [1, 1, 1, 0, 0, 1, 1, 1],
          [1, 1, 1, 0, 0, 1, 1, 1]
        ]
      },
      "2": {
        "powerGeneration": 26,
        "protectedPower": 10,
        "unprotectedPower": 16,
        "grid": [...]
      }
    }
  }
}
```

### Adding Aux Generators (8x2 grids)

Edit `data/auxGenerators.json` - now supports tiers:

```json
{
  "auxId": {
    "id": "auxId",
    "name": "Aux Generator Name",
    "category": "AUX GENERATORS",
    "tiers": {
      "1": {
        "powerGeneration": 10,
        "protectedPower": 4,
        "unprotectedPower": 6,
        "grid": [
          [0, 2, 1, 1, 1, 1, 2, 0],
          [0, 2, 1, 1, 1, 1, 2, 0]
        ]
      }
    }
  }
}
```

**Grid values:** `0` = unpowered, `1` = powered (green), `2` = protected (blue)

---

## Layout

```
+------------------+   +--------------+   +----------------+
|   POWER GRID     |   |  BUILD ORDER |   |   COMPONENTS   |
|                  |   |              |   |                |
| [Reactor ▼]      |   | ≡ Comp 1  ☑  |   | ▶ SENSORS (3)  |
| ████████████     |   | ≡ Comp 2  ☐  |   | ▶ ENGINES (4)  |
| ████████████     |   | ≡ Comp 3  ☐  |   | ▼ WEAPONS (5)  |
| ████████████     |   |              |   |   ├ Weapon A   |
| [Aux 1 ▼]        |   | [  SOLVE  ]  |   |   └ Weapon B   |
| ████████████     |   |              |   |                |
| [Aux 2 ▼]        |   | Status msg   |   | [Filters]      |
| ████████████     |   +--------------+   +----------------+
+------------------+
```

## Project Structure

```
├── index.html            # Main page
├── css/
│   └── styles.css        # Styling (dark theme, 3-column layout)
├── data/
│   ├── components.json   # Component shapes by category/tier
│   ├── reactors.json     # Reactor grid layouts (8x4) with tiers
│   └── auxGenerators.json # Aux generator layouts (8x2) with tiers
├── js/
│   ├── main.js           # App initialization
│   ├── grid.js           # Grid state management
│   ├── components.js     # Component loader & utilities
│   ├── templates.js      # Reactor/aux loader with tier support
│   ├── solver.js         # Priority-based solver with mandatory support
│   └── ui.js             # UI rendering, drag-drop, hover sync
├── GAME_RULES.md         # Game mechanics documentation
└── README.md             # This file
```

## License

MIT
