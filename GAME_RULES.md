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

## Components

### Component Properties
- Each component has a **tetris-like shape** defined by a 2D array
- Components have multiple **tiers** (Mk1, Mk2, Mk3, etc.)
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

## Reactors

Reactors determine the top half (8x4) of the power grid.

| Reactor | Total | Protected | Unprotected |
|---------|-------|-----------|-------------|
| Split Reactor | 22 | 8 | 14 |
| Solid State Reactor | 16 | 16 | 0 |
| Materia Scatter Reactor | 24 | 8 | 16 |
| Null Wave Reactor | 20 | 10 | 10 |

## Auxiliary Generators

Aux generators each provide an 8x2 section. A ship can have **0, 1, or 2** aux generators.

| Aux Generator | Total | Protected | Unprotected |
|---------------|-------|-----------|-------------|
| Bio Fission Generator | 10 | 0 | 10 |
| Null Tension Generator | 8 | 4 | 4 |
| Materia Shift Generator | 8 | 4 | 4 |

## Solver Behavior

### Mode 1: Require All Components
- All selected components **must** be placed
- Fails if not all components can fit

### Mode 2: Maximize Coverage (default)
- Places as many components as possible
- **Prioritizes protected cells** first
- Larger components are tried first
- Always succeeds (may place 0 components if none fit)

### Optimization Priority
1. Cover protected (blue) cells first
2. Maximize total coverage
3. Fit larger components before smaller ones

## Contributing Data

### Component Shapes
Components are defined in `data/components.json`. Each shape is a 2D array where:
- `1` = filled cell
- `0` = empty cell

### Reactor Grids
Reactors are defined in `data/reactors.json`. Each grid is an 8x4 array where:
- `0` = unpowered
- `1` = powered (green)
- `2` = protected (blue)

### Aux Generator Grids
Aux generators are defined in `data/auxGenerators.json`. Each grid is an 8x2 array using the same values.

---

*This document reflects the game state as of late December 2025. Game updates may change these mechanics.*
