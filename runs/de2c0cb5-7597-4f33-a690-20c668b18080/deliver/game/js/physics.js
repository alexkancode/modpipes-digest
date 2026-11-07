// Phys: tile AABB collision. Bodies are feet-anchored: x is the centre, y the bottom.
// Tile codes: 0 empty, 1 solid, 2 one-way, 3 acid (solid), 4 slippery (solid).
var Phys = (function () {
  var T = 16;

  function tileAt(L, tx, ty) {
    if (tx < 0 || tx >= L.cols) return 1;      // level side walls
    if (ty < 0 || ty >= L.rows) return 0;      // open sky and open pits
    return L.tiles[ty * L.cols + tx];
  }
  function isSolid(c) { return c === 1 || c === 3 || c === 4; }
  function solidAt(L, px, py) { return isSolid(tileAt(L, Math.floor(px / T), Math.floor(py / T))); }

  function moveBody(L, b, dt) {
    var hw = b.w / 2, tx, ty, ty0, ty1, x0, x1, c;
    var nx = b.x + b.vx * dt;
    b.hitWall = 0;
    ty0 = Math.floor((b.y - b.h) / T);
    ty1 = Math.floor((b.y - 0.01) / T);
    if (b.vx > 0) {
      tx = Math.floor((nx + hw) / T);
      for (ty = ty0; ty <= ty1; ty++) if (isSolid(tileAt(L, tx, ty))) { nx = tx * T - hw - 0.01; b.vx = 0; b.hitWall = 1; break; }
    } else if (b.vx < 0) {
      tx = Math.floor((nx - hw) / T);
      for (ty = ty0; ty <= ty1; ty++) if (isSolid(tileAt(L, tx, ty))) { nx = (tx + 1) * T + hw + 0.01; b.vx = 0; b.hitWall = -1; break; }
    }
    b.x = nx;

    var ny = b.y + b.vy * dt;
    b.onGround = false;
    b.floor = 0;
    x0 = Math.floor((b.x - hw) / T);
    x1 = Math.floor((b.x + hw - 0.01) / T);
    if (b.vy >= 0) {
      ty = Math.floor(ny / T);
      for (tx = x0; tx <= x1; tx++) {
        c = tileAt(L, tx, ty);
        if (isSolid(c) || (c === 2 && b.y <= ty * T + 0.01)) { ny = ty * T; b.vy = 0; b.onGround = true; b.floor = c; break; }
      }
    } else {
      ty = Math.floor((ny - b.h) / T);
      for (tx = x0; tx <= x1; tx++) if (isSolid(tileAt(L, tx, ty))) { ny = (ty + 1) * T + b.h; b.vy = 0; break; }
    }
    b.y = ny;
  }

  function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
  }

  // Distance along dir to the first column with no floor at or below the feet row.
  function pitAhead(L, x, y, dir) {
    var row = Math.floor((y + 1) / T), d, col, ty, floor;
    for (d = 0; d <= 640; d += T) {
      col = Math.floor((x + dir * d) / T);
      if (col < 0 || col >= L.cols) return 9999;
      floor = false;
      for (ty = row; ty < L.rows; ty++) if (tileAt(L, col, ty) !== 0) { floor = true; break; }
      if (!floor) return Math.max(0, dir > 0 ? col * T - x : x - (col + 1) * T);
    }
    return 9999;
  }

  // Distance along dir to the first solid tile at feet height (a rise that needs a jump).
  function stepAhead(L, x, y, dir) {
    var row = Math.floor((y - 1) / T), d, col;
    for (d = 0; d <= 640; d += T) {
      col = Math.floor((x + dir * d) / T);
      if (col < 0 || col >= L.cols) return 9999;
      if (isSolid(tileAt(L, col, row))) return Math.max(0, dir > 0 ? col * T - x : x - (col + 1) * T);
    }
    return 9999;
  }

  return { tileAt: tileAt, solidAt: solidAt, isSolid: isSolid, moveBody: moveBody, overlap: overlap, pitAhead: pitAhead, stepAhead: stepAhead };
})();
