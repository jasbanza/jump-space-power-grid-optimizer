# Jump Space Power Grid - Game Rules & Mechanics

This document describes the game mechanics and rules that this optimizer is designed to work with.

## Power Grid Structure

### Grid Composition
The power grid is an **8x8** grid composed of three parts:

| Section | Rows | Size | Source |
|---------|------|------|--------|
| Reactor | 1-4 | 8x4 | Selected reactor determines layout |
| Aux Generator 1 | 5-6 | 8x2 | Optional auxiliary generator |
| Aux Generator 2 | 7-8 | 8x2 | Optional auxiliary generator |

### Cell Types
- **Unpowered (Black)**: Cannot place components here
- **Powered (Green)**: Standard power cells - components can be placed
- **Protected (Blue)**: Priority power cells - solver prioritizes placing components here first

### Power Stats
Each reactor and aux generator contributes:
- **Total Power**: Total number of powered cells
- **Protected Power**: Number of protected (blue) cells
- **Unprotected Power**: Number of standard powered (green) cells

## Reactors & Aux Generators

### Tier System
Both reactors and auxiliary generators support **multiple tiers** (Mk 1, Mk 2, etc.). Each tier can have:
- Different grid layouts
- Different power generation values
- Different protected/unprotected ratios

### Reactors (8x4)
Reactors determine the top half of the power grid.

| Reactor | Tier | Total | Protected | Unprotected |
|---------|------|-------|-----------|-------------|
| Split Reactor | Mk 1 | 22 | 8 | 14 |
| Solid State Reactor | Mk 1 | 16 | 16 | 0 |
| Materia Scatter Reactor | Mk 1 | 24 | 8 | 16 |
| Null Wave Reactor | Mk 1 | 20 | 10 | 10 |

### Auxiliary Generators (8x2)
Aux generators each provide an 8x2 section. A ship can have **0, 1, or 2** aux generators.

| Aux Generator | Tier | Total | Protected | Unprotected |
|---------------|------|-------|-----------|-------------|
| Bio Fission Generator | Mk 1 | 10 | 0 | 10 |
| Null Tension Generator | Mk 1 | 8 | 4 | 4 |
| Materia Shift Generator | Mk 1 | 8 | 4 | 4 |

## Components

### Component Properties
- Each component has a **tetris-like shape** defined by a 2D array
- Components have multiple **tiers** (Mk 1, Mk 2, Mk 3, etc.)
- Higher tiers may have **different shapes** (usually larger)
- Components are organized by **category**:
  - SENSORS
  - ENGINES
  - PILOT CANNONS
  - MULTI-TURRET SYSTEMS
  - SPECIAL WEAPONS

### Placement Rules
1. Components must be placed **entirely on powered cells** (green or blue)
2. Components **cannot overlap** each other
3. Components can be **rotated** in 90° increments (0°, 90°, 180°, 270°)
4. Components **cannot be flipped/mirrored** - only rotation is allowed

## Build Order & Priority System

### Priority List
When you add components to your build, they appear in a **priority list**:
- **Higher priority** items (top of list) are placed first
- **Lower priority** items may be skipped if space runs out
- Drag and drop to reorder priorities

### Mandatory Components
Mark components as **mandatory** (checkbox) to indicate "must have":
- The solver uses backtracking to ensure all mandatory components fit
- Non-mandatory components are placed greedily after mandatory ones
- If mandatory components can't all fit, they're highlighted in red

### Individual Instances
Each component instance is tracked separately:
- If you add "Fragment Cannon Mk 2 x3", three separate items appear
- Each can have different priority
- Each can be marked mandatory independently

## Solver Behavior

### Priority-Based Algorithm
The solver respects your build order:

1. **Mandatory Components First**
   - Uses backtracking to find a valid arrangement for all mandatory components
   - Prioritizes placements that cover protected (blue) cells

2. **Non-Mandatory Components**
   - Placed greedily in priority order (top to bottom)
   - Skipped if they don't fit

3. **Protected Cell Priority**
   - Within each placement decision, protected cells are preferred
   - This maximizes use of the limited protected power slots

### Visual Feedback
- **Placed components**: Semi-transparent overlay showing the power cells beneath
- **Component labels**: Names displayed on the grid
- **Hover sync**: Hovering a grid component highlights its list entry (and vice versa)
- **Not placed**: Items that couldn't fit are highlighted red in the list

## Contributing Data

### Component Shapes
Components are defined in `data/components.json`. Each shape is a 2D array where:
- `1` = filled cell
- `0` = empty cell

### Reactor Grids
Reactors are defined in `data/reactors.json` with tier support:
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
        "grid": [[...], [...], [...], [...]]
      }
    }
  }
}
```

Grid values:
- `0` = unpowered
- `1` = powered (green)
- `2` = protected (blue)

### Aux Generator Grids
Aux generators are defined in `data/auxGenerators.json` with the same tier structure.

---

*This document reflects the game state as of late December 2025. Game updates may change these mechanics.*
