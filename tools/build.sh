#!/bin/bash
# Reconstruye index.html a partir de src/ (el juego se distribuye como un único archivo).
set -e
cd "$(dirname "$0")/.."
{ cat src/01_head.html; cat src/02_data.js src/02b_npc.js src/02d_icons.js src/02c_levels.js src/03_sim.js src/03b_selftest.js src/04b_chars.js src/04c_flora.js src/04_world.js src/05_minigames.js src/06a_ui.js src/06b_ui.js src/06d_npc.js src/06e_modes.js src/06f_map.js src/06g_fac.js src/06c_ui.js; printf '\n</script>\n</body>\n</html>\n'; } > index.html
node -e "const s=require('fs').readFileSync('index.html','utf8');new Function(s.slice(s.indexOf('<script>')+8,s.lastIndexOf('</script>')));console.log('index.html OK')"
