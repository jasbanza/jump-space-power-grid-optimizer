# Jump Space Power Grid Optimizer - Constraints & Planning

This document tracks the game rules, constraints, and planning notes for the Power Grid Optimizer.

## Game Rules

### Power Grid
- **Grid Size**: 8x8 squares
- **Background**: Black (unpowered cells)
- **Powered Cells**: Green - determined by ship's engine and auxiliary engines
- **Components**: Must be placed entirely on green (powered) squares to function

### Component Placement Rules
- Components are tetris-like pieces of various shapes
- Components can only be placed on **powered (green) squares**
- Components **cannot overlap** each other
- Components can be **rotated** in 90-degree increments (0°, 90°, 180°, 270°)
- Components **cannot** be flipped/mirrored (only rotation allowed)

## Piece Definitions

Update `js/pieces.js` with actual game component shapes. Current shapes are placeholders.

### Placeholder Pieces (to be replaced with actual game pieces)
- I-Shape (4 cells in a line)
- O-Shape (2x2 square)
- T-Shape (T tetromino)
- L-Shape (L tetromino)
- J-Shape (J tetromino)
- S-Shape (S tetromino)
- Z-Shape (Z tetromino)
- Single (1x1)
- Domino (1x2)
- Tri-Line (1x3)
- Corner (2x2 L)
- Plus (+ shape)

### Adding New Pieces

To add a new piece, edit `js/pieces.js` and add an entry like:

```javascript
myNewPiece: {
    id: 'myNewPiece',
    name: 'My New Piece',
    shape: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 0]
    ]
}
```

Where `1` = filled cell, `0` = empty cell.

## Solver Modes

### Mode 1: Require All Pieces
- All selected pieces **must** be placed
- Fails if not possible to place all pieces

### Mode 2: Maximize Coverage (default)
- Places as many pieces as possible
- Prioritizes larger pieces first
- Always succeeds (may place 0 pieces if none fit)

## Technical Constraints

### Browser Support
- Modern browsers with ES6 module support
- localStorage for grid state persistence

### Performance
- For <= 10 pieces: tries all permutations for optimal solution
- For > 10 pieces: uses greedy algorithm (faster but may not be optimal)

## Future Enhancements (Ideas)

- [ ] Import/export grid configurations
- [ ] Predefined grid templates from the game
- [ ] Save/load piece selections
- [ ] Undo/redo for grid editing
- [ ] Show multiple solutions (if available)
- [ ] Mobile-friendly touch support
- [ ] Drag-and-drop piece placement
- [ ] Integration with game screenshots for auto-grid detection

## Notes

Add your notes and observations here as you use the tool:

---

*Last updated: Initial version*
