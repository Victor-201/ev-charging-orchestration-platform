import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmailVerificationTokenOrmEntity } from '../entities/auth.orm-entities';
import {
  IEmailVerificationRepository,
  EmailVerificationToken,
} from '../../../../domain/repositories/auth.repository.interface';

@Injectable()
export class EmailVerificationRepository implements IEmailVerificationRepository {
  constructor(
    @InjectRepository(EmailVerificationTokenOrmEntity)
    private readonly repo: Repository<EmailVerificationTokenOrmEntity>,
  ) {}

  private toModel(e: EmailVerificationTokenOrmEntity): EmailVerificationToken {
    return {
      id: e.id,
      userId: e.userId,
      tokenHash: e.tokenHash,
      shortCode: e.shortCode,
      expiresAt: e.expiresAt,
      verifiedAt: e.verifiedAt,
      createdAt: e.createdAt,
    };
  }

  async create(
    userId: string,
    tokenHash: string,
    shortCode: string,
    expiresAt: Date,
  ): Promise<EmailVerificationToken> {
    const entity = this.repo.create({
      id: uuidv4(),
      userId,
      tokenHash,
      shortCode,
      expiresAt,
      verifiedAt: null,
    });
    await this.repo.save(entity);
    return this.toModel(entity);
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    const e = await this.repo.findOne({ where: { tokenHash } });
    return e ? this.toModel(e) : null;
  }

  async findByShortCode(shortCode: string): Promise<EmailVerificationToken | null> {
    const e = await this.repo.findOne({ where: { shortCode } });
    return e ? this.toModel(e) : null;
  }

  async markVerified(id: string): Promise<void> {
    await this.repo.update(id, { verifiedAt: new Date() });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
