#!/usr/bin/env python3
"""Rebuild tier-{1..5} hero assets: flood-remove light matte from edges, emit PNG."""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def flood_background_mask(rgb_u8: np.ndarray, *, seed_min: float, pair_tol: float) -> np.ndarray:
    """4-neighbor flood from border seeds; neighbor joins if RGB L1 delta to neighbor <= pair_tol."""
    h, w, _ = rgb_u8.shape
    visited = np.zeros((h, w), dtype=np.bool_)
    q: deque[tuple[int, int]] = deque()

    def try_seed(yy: int, xx: int) -> None:
        if rgb_u8[yy, xx].min() >= seed_min:
            visited[yy, xx] = True
            q.append((yy, xx))

    for x in range(w):
        try_seed(0, x)
        try_seed(h - 1, x)
    for y in range(h):
        try_seed(y, 0)
        try_seed(y, w - 1)

    while q:
        y, x = q.popleft()
        nyx = [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
        cy = rgb_u8[y, x].astype(np.int16)
        for ny, nx in nyx:
            if ny < 0 or ny >= h or nx < 0 or nx >= w or visited[ny, nx]:
                continue
            dn = rgb_u8[ny, nx].astype(np.int16)
            if np.abs(dn - cy).sum() <= pair_tol:
                visited[ny, nx] = True
                q.append((ny, nx))

    return visited


def knockout_one(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGB")
    rgb = np.asarray(im, dtype=np.uint8)

    fg = np.ones(im.size[::-1], dtype=np.float32)

    attempts = [(228.0, 38.0), (218.0, 44.0), (212.0, 50.0)]
    for seed_min, pair_tol in attempts:
        bg = flood_background_mask(rgb.astype(np.uint8), seed_min=seed_min, pair_tol=pair_tol).astype(np.float32)
        feather = Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2.0))
        bg_smooth = np.asarray(feather, dtype=np.float32) / 255.0
        fg = np.clip(1.0 - bg_smooth, 0.0, 1.0)
        frac = float(fg.mean())
        if 0.12 < frac < 0.88:
            break

    fg_u8 = (np.clip(np.round(fg * 255), 0, 255)).astype(np.uint8)

    rgba = np.empty((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = fg_u8

    h, w = rgba.shape[:2]
    out = Image.frombytes("RGBA", (w, h), rgba.tobytes())

    bbox = out.getbbox()
    if bbox:
        pad = 4
        l, u, r, d = bbox
        l = max(0, l - pad)
        u = max(0, u - pad)
        r = min(out.width - 1, r + pad)
        d = min(out.height - 1, d + pad)
        out = out.crop((l, u, r + 1, d + 1))

    max_side = max(out.width, out.height)
    cap = 400
    if max_side > cap:
        ratio = cap / float(max_side)
        nw = max(1, int(round(out.width * ratio)))
        nh = max(1, int(round(out.height * ratio)))
        out = out.resize((nw, nh), Image.Resampling.LANCZOS)

    out.save(dst, compress_level=9, optimize=True)
    print(f"wrote {dst} ({out.width}x{out.height}), fg_mean={rgba[:,:,3].mean()/255:.3f}")


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "public" / "tier-hero"
    for i in range(1, 6):
        jpg = root / f"tier-{i}.jpeg"
        png = root / f"tier-{i}.png"
        if not jpg.is_file():
            raise SystemExit(f"missing {jpg}")
        knockout_one(jpg, png)


if __name__ == "__main__":
    main()
