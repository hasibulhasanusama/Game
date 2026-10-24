# EcoSurvival Frontend Prototype

## Run
1. Install Node.js LTS.
2. Open this folder in VS Code.
3. In terminal run:
   ```powershell
   npm install
   npm run dev
   ```
   If `package.json` is missing, create the Vite vanilla-ts project first using the commands in the ChatGPT instructions, then replace the generated files with these files.

## Files
- `index.html` — HUD, menus, overlay and canvas
- `src/main.ts` — initializes Three.js, survival HUD, resource collection and render loop
- `src/style.css` — visual design and responsive UI
- `src/game/World.ts` — terrain, forest, resource objects and lighting
- `src/game/Player.ts` — player model, movement, jump and camera controls

## Controls
- Click Enter the Wildlands
- Click the 3D view to capture the mouse
- WASD: move
- Mouse: look around (while pointer locked)
- Shift: sprint
- Space: jump
- E: collect nearby wood/stone
- Esc: release mouse; press pause button to pause/resume

This is a frontend prototype. Multiplayer, persistent saves, polished character animations, proper terrain collision, and production anti-cheat are not implemented yet.
