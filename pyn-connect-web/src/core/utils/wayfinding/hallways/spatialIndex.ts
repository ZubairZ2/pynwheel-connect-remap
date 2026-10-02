import type { BBox } from './types';

/**
 * A static spatial index over boxes, answering "which items overlap this
 * box". The POC uses `rbush` (`load` + `search`) for every proximity question
 * — clustering, crossings, gap bridging, k-NN, obstacles, stop snapping —
 * and this is the same contract on a uniform grid, so the ported algorithms
 * read unchanged without adding a dependency. Items are bucketed into every
 * cell their box touches; a search de-duplicates with a per-query stamp.
 */
export class SpatialIndex<T extends BBox> {
  private readonly items: T[];
  private readonly cells = new Map<number, number[]>();
  private readonly stamp: Uint32Array;
  private query = 0;
  private readonly minX: number;
  private readonly minY: number;
  private readonly size: number;
  private readonly cols: number;
  private readonly rows: number;

  constructor(items: T[]) {
    this.items = items;
    this.stamp = new Uint32Array(items.length);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const item of items) {
      minX = Math.min(minX, item.minX);
      minY = Math.min(minY, item.minY);
      maxX = Math.max(maxX, item.maxX);
      maxY = Math.max(maxY, item.maxY);
    }
    if (!items.length || !Number.isFinite(minX)) {
      this.minX = 0;
      this.minY = 0;
      this.size = 1;
      this.cols = 1;
      this.rows = 1;
      return;
    }
    const extent = Math.max(maxX - minX, maxY - minY, 1e-6);
    const perSide = Math.max(1, Math.min(256, Math.ceil(Math.sqrt(items.length))));
    this.minX = minX;
    this.minY = minY;
    this.size = extent / perSide;
    this.cols = Math.max(1, Math.ceil((maxX - minX) / this.size) + 1);
    this.rows = Math.max(1, Math.ceil((maxY - minY) / this.size) + 1);
    items.forEach((item, index) => {
      const [c0, r0, c1, r1] = this.range(item);
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          const key = r * this.cols + c;
          const bucket = this.cells.get(key);
          if (bucket) bucket.push(index);
          else this.cells.set(key, [index]);
        }
      }
    });
  }

  private range(box: BBox): [number, number, number, number] {
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
    const c0 = clamp(Math.floor((box.minX - this.minX) / this.size), this.cols - 1);
    const r0 = clamp(Math.floor((box.minY - this.minY) / this.size), this.rows - 1);
    const c1 = clamp(Math.floor((box.maxX - this.minX) / this.size), this.cols - 1);
    const r1 = clamp(Math.floor((box.maxY - this.minY) / this.size), this.rows - 1);
    return [c0, r0, c1, r1];
  }

  /** Every item whose box overlaps `box` (edges touching count), in insertion order. */
  search(box: BBox): T[] {
    if (!this.items.length) return [];
    if (box.maxX < this.minX || box.maxY < this.minY) return [];
    this.query += 1;
    if (this.query === 0xffffffff) {
      this.stamp.fill(0);
      this.query = 1;
    }
    const hits: number[] = [];
    const [c0, r0, c1, r1] = this.range(box);
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        const bucket = this.cells.get(r * this.cols + c);
        if (!bucket) continue;
        for (const index of bucket) {
          if (this.stamp[index] === this.query) continue;
          this.stamp[index] = this.query;
          const item = this.items[index];
          if (item.minX <= box.maxX && item.maxX >= box.minX && item.minY <= box.maxY && item.maxY >= box.minY) hits.push(index);
        }
      }
    }
    hits.sort((a, b) => a - b);
    return hits.map((index) => this.items[index]);
  }

  all(): T[] {
    return this.items.slice();
  }
}
