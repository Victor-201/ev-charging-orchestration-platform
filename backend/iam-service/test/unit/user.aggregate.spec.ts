import { User, UserStatus } from '../../src/domain/entities/user.aggregate';
import { UserInactiveException } from '../../src/domain/exceptions/auth.exceptions';

const validProps = {
  email: 'test@test.com',
  fullName: 'Test User',
  dateOfBirth: new Date('1990-01-15'),
  passwordHash: 'hash',
};

describe('User Aggregate', () => {
  it('creates user in ACTIVE status', () => {
    const user = User.create(validProps);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.emailVerified).toBe(false);
    expect(user.domainEvents).toHaveLength(1);
    expect(user.domainEvents[0].eventType).toBe('user.registered');
  });

  it('normalizes email to lowercase', () => {
    const user = User.create({ ...validProps, email: 'TEST@Domain.COM' });
    expect(user.email).toBe('test@domain.com');
  });

  it('stores fullName and phone correctly', () => {
    const user = User.create({ ...validProps, phone: '+84901234567' });
    expect(user.fullName).toBe('Test User');
    expect(user.phone).toBe('+84901234567');
  });

  it('assertIsActive passes for active user', () => {
    const user = User.create(validProps);
    expect(() => user.assertIsActive()).not.toThrow();
  });

  it('assertIsActive throws after deactivation', () => {
    const user = User.create(validProps);
    user.deactivate();
    expect(() => user.assertIsActive()).toThrow(UserInactiveException);
  });

  it('deactivate emits domain event', () => {
    const user = User.create(validProps);
    user.clearDomainEvents();
    user.deactivate();
    expect(user.status).toBe(UserStatus.INACTIVE);
    expect(user.domainEvents[0].eventType).toBe('user.deactivated');
  });

  it('deactivate is idempotent', () => {
    const user = User.create(validProps);
    user.deactivate();
    user.clearDomainEvents();
    user.deactivate(); // second call
    expect(user.domainEvents).toHaveLength(0); // no new event
  });

  it('updatePasswordHash emits password_changed event', () => {
    const user = User.create(validProps);
    user.clearDomainEvents();
    user.updatePasswordHash('new-hash');
    expect(user.passwordHash).toBe('new-hash');
    expect(user.domainEvents[0].eventType).toBe('user.password_changed');
  });

  it('clearDomainEvents empties events', () => {
    const user = User.create(validProps);
    user.clearDomainEvents();
    expect(user.domainEvents).toHaveLength(0);
  });

  it('reconstitute restores user without emitting events', () => {
    const user = User.reconstitute({
      id: 'abc', email: 'a@b.com', fullName: 'Alice', phone: null,
      dateOfBirth: new Date('1985-03-20'),
      passwordHash: 'h', status: UserStatus.ACTIVE,
      emailVerified: true, createdAt: new Date(), updatedAt: new Date(),
    });
    expect(user.id).toBe('abc');
    expect(user.fullName).toBe('Alice');
    expect(user.domainEvents).toHaveLength(0);
  });

  it('throws for user under 18 years old', () => {
    const underaged = { ...validProps, dateOfBirth: new Date() };
    expect(() => User.create(underaged)).toThrow();
  });
});

