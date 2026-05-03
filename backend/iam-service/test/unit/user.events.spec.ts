import { User, UserStatus } from '../../src/domain/entities/user.aggregate';
import { UserInactiveException } from '../../src/domain/exceptions/auth.exceptions';
import { UserRegisteredEvent } from '../../src/domain/events/auth.events';

describe('Auth — User Aggregate TDD', () => {
  const validProps = {
    email: 'test@ev.com',
    fullName: 'Test User',
    dateOfBirth: new Date('1990-01-01'),
    passwordHash: 'hashed',
  };

  it('User.create emits UserRegisteredEvent', () => {
    const u = User.create(validProps);
    expect(u.domainEvents[0]).toBeInstanceOf(UserRegisteredEvent);
    expect(u.domainEvents[0].eventType).toBe('user.registered');
  });

  it('User starts as ACTIVE', () => {
    const u = User.create(validProps);
    expect(u.status).toBe(UserStatus.ACTIVE);
  });

  it('User.deactivate sets status to INACTIVE', () => {
    const u = User.create(validProps);
    u.deactivate();
    expect(u.status).toBe(UserStatus.INACTIVE);
  });

  it('assertIsActive throws for inactive user', () => {
    const u = User.create(validProps);
    u.deactivate();
    expect(() => u.assertIsActive()).toThrow(UserInactiveException);
  });
});

