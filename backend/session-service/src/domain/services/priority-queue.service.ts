import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEntry } from '../repositories/queue.repository.interface';

/**
 * PriorityQueueService - in-memory Min-Heap
 * Score = lower is higher priority
 * Rebuilt from DB on startup; DB is source of truth for durability.
 */
@Injectable()
export class PriorityQueueService {
  private readonly heap: (QueueEntry & { score: number })[] = [];

  constructor(private readonly config: ConfigService) {}

  /**
   * score formula (lower = more priority):
   *   base 100
   *   - userPriority * 10     (premium subscriber gets big boost)
   *   - waitMinutes (capped 60)  (anti-starvation: wait longer -> lower score)
   *   - urgencyScore * 5      (low battery = urgent)
   */
  private calcScore(entry: QueueEntry): number {
    const waitMinutes =
      (Date.now() - entry.requestedAt.getTime()) / 60_000;
    return (
      100 -
      entry.userPriority * 10 -
      waitMinutes * 2 -              // anti-starvation: 2x weight, no cap -> 70min wait score=-50 beats priority=9 score=10
      entry.urgencyScore * 5
    );
  }

  /** Load all entries from DB on service startup */
  loadFromDb(entries: QueueEntry[]): void {
    this.heap.length = 0;
    for (const e of entries) {
      this.heap.push({ ...e, score: this.calcScore(e) });
    }
    this.buildHeap();
  }

  enqueue(entry: QueueEntry): void {
    const scored = { ...entry, score: this.calcScore(entry) };
    this.heap.push(scored);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeueForCharger(chargerId: string): QueueEntry | undefined {
    const idx = this.heap.findIndex((e) => e.chargerId === chargerId);
    if (idx === -1) return undefined;

    const entry = this.heap[idx];
    const last = this.heap.pop()!;
    if (idx < this.heap.length) {
      this.heap[idx] = last;
      this.sinkDown(idx);
      this.bubbleUp(idx);
    }
    return entry;
  }

  /** Re-score all entries - called every QUEUE_REBALANCE_MS to fight starvation */
  rebalance(): void {
    for (let i = 0; i < this.heap.length; i++) {
      this.heap[i].score = this.calcScore(this.heap[i]);
    }
    this.buildHeap();
  }

  removeByUser(userId: string, chargerId: string): void {
    const idx = this.heap.findIndex(
      (e) => e.userId === userId && e.chargerId === chargerId,
    );
    if (idx === -1) return;
    const last = this.heap.pop()!;
    if (idx < this.heap.length) {
      this.heap[idx] = last;
      this.sinkDown(idx);
      this.bubbleUp(idx);
    }
  }

  getPosition(userId: string, chargerId: string): number {
    const chargerEntries = this.heap
      .filter((e) => e.chargerId === chargerId)
      .sort((a, b) => a.score - b.score);
    const pos = chargerEntries.findIndex((e) => e.userId === userId);
    return pos === -1 ? -1 : pos + 1;
  }

  size(chargerId?: string): number {
    return chargerId
      ? this.heap.filter((e) => e.chargerId === chargerId).length
      : this.heap.length;
  }

  peek(chargerId: string): QueueEntry | undefined {
    return this.heap
      .filter((e) => e.chargerId === chargerId)
      .sort((a, b) => a.score - b.score)[0];
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score <= this.heap[i].score) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }

  private buildHeap(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.sinkDown(i);
    }
  }
}
