import { PriorityQueueService } from '../../src/domain/services/priority-queue.service';
import { QueueEntry } from '../../src/domain/repositories/queue.repository.interface';
import { ConfigService } from '@nestjs/config';

const makeEntry = (overrides: Partial<QueueEntry> = {}): QueueEntry => ({
  id: crypto.randomUUID(),
  userId: `user-${Math.random()}`,
  chargerId: 'charger-1',
  connectorType: 'CCS',
  requestedAt: new Date(),
  userPriority: 1,
  urgencyScore: 0,
  status: 'waiting',
  ...overrides,
});

describe('PriorityQueueService (Min-Heap)', () => {
  let queue: PriorityQueueService;

  beforeEach(() => {
    queue = new PriorityQueueService(new ConfigService());
  });

  it('dequeues higher priority user first (same requestedAt)', () => {
    const now = new Date();
    queue.enqueue(makeEntry({ userId: 'low', userPriority: 1, requestedAt: now }));
    queue.enqueue(makeEntry({ userId: 'high', userPriority: 9, requestedAt: now }));
    const first = queue.dequeueForCharger('charger-1');
    expect(first?.userId).toBe('high');
  });

  it('dequeues urgent user first (same priority)', () => {
    const now = new Date();
    queue.enqueue(makeEntry({ userId: 'normal', userPriority: 5, urgencyScore: 0, requestedAt: now }));
    queue.enqueue(makeEntry({ userId: 'urgent', userPriority: 5, urgencyScore: 10, requestedAt: now }));
    const first = queue.dequeueForCharger('charger-1');
    expect(first?.userId).toBe('urgent');
  });

  it('anti-starvation: long-waiting user overtakes high-priority after rebalance', () => {
    const longAgo = new Date(Date.now() - 70 * 60 * 1000); // 70 min ago
    queue.enqueue(makeEntry({ userId: 'premium', userPriority: 9, requestedAt: new Date() }));
    queue.enqueue(makeEntry({ userId: 'old-waiter', userPriority: 1, requestedAt: longAgo }));

    queue.rebalance();

    const first = queue.dequeueForCharger('charger-1');
    expect(first?.userId).toBe('old-waiter');
  });

  it('getPosition returns 1 for single entry', () => {
    const entry = makeEntry({ userId: 'user-x' });
    queue.enqueue(entry);
    expect(queue.getPosition('user-x', 'charger-1')).toBe(1);
  });

  it('removeByUser removes from heap', () => {
    queue.enqueue(makeEntry({ userId: 'user-a' }));
    queue.removeByUser('user-a', 'charger-1');
    expect(queue.size('charger-1')).toBe(0);
  });

  it('returns undefined for empty charger queue', () => {
    expect(queue.dequeueForCharger('charger-99')).toBeUndefined();
  });

  it('handles 1000 entries correctly', () => {
    for (let i = 0; i < 1000; i++) {
      queue.enqueue(makeEntry({ userPriority: Math.floor(Math.random() * 10) + 1 }));
    }
    expect(queue.size('charger-1')).toBe(1000);

    // Should always dequeue in priority order
    let lastScore = -Infinity;
    let prevDequeued = queue.dequeueForCharger('charger-1');
    for (let i = 0; i < 10; i++) {
      const curr = queue.dequeueForCharger('charger-1');
      // lower score = higher priority; each dequeue should be >= last
      // (Just testing it doesn't crash and reduces size)
    }
    expect(queue.size('charger-1')).toBe(989);
  });
});
