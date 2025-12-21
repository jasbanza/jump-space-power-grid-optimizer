# Jump Space Power Grid Optimizer

A web-based tool to optimize component placement on your ship's power grid in Jump Space.

## Features

- **Interactive Grid Editor**: Click to toggle cells between powered (green) and unpowered (black)
- **Component Library**: Pre-defined tetris-like pieces to place on the grid
- **Auto-Solver**: Automatically finds optimal piece placements using backtracking algorithm
- **Two Solve Modes**:
  - *Require All*: Must place all selected pieces (fails if impossible)
  - *Maximize Coverage*: Place as many pieces as possible
- **Persistent State**: Grid configuration saved to localStorage

## Usage

1. **Open `index.html`** in a modern web browser (no server required)
2. **Configure the grid**: Click cells to mark them as powered (green)
3. **Select components**: Check the pieces you want to place
4. **Click Solve**: The optimizer will find valid placements

## Hosting

### GitHub Pages
1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select the branch to deploy (usually `main`)
4. Your site will be available at `https://username.github.io/jump-space-power-grid-optimizer/`

### Local
Simply open `index.html` in your browser - no build step or server required.

## Customizing Pieces

Edit `js/pieces.js` to add or modify component shapes. See `CONSTRAINTS.md` for details.

## Project Structure

```
├── index.html          # Main page
├── css/
│   └── styles.css      # Styling (dark theme)
├── js/
│   ├── main.js         # App initialization
│   ├── grid.js         # Grid state management
│   ├── pieces.js       # Piece definitions
│   ├── solver.js       # Backtracking solver
│   └── ui.js           # UI rendering & events
├── CONSTRAINTS.md      # Game rules & planning notes
└── README.md           # This file
```

## License

MIT
