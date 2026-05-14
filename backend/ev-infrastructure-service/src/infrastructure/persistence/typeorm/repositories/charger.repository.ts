import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Charger, ChargerStatus, ConnectorType } from '../../../../domain/entities/charger.aggregate';
import {
  IChargerRepository,
  ChargerFilter,
} from '../../../../domain/repositories/charger.repository.interface';
import { ChargingPointOrmEntity, ConnectorOrmEntity } from '../entities/station.orm-entities';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChargerRepository implements IChargerRepository {
  constructor(
    @InjectRepository(ChargingPointOrmEntity)
    private readonly cpRepo: Repository<ChargingPointOrmEntity>,
    @InjectRepository(ConnectorOrmEntity)
    private readonly connectorRepo: Repository<ConnectorOrmEntity>,
  ) {}

  async findById(id: string): Promise<Charger | null> {
    const cp = await this.cpRepo.findOne({
      where: { id },
      relations: ['connectors'],
    });
    if (!cp) return null;
    return this.toDomain(cp);
  }

  async findByStationId(stationId: string): Promise<Charger[]> {
    const rows = await this.cpRepo.find({
      where: { stationId },
      relations: ['connectors'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async existsByExternalId(externalId: string, excludeId?: string): Promise<boolean> {
    const qb = this.cpRepo.createQueryBuilder('cp')
      .where('cp.external_id = :externalId', { externalId });
    if (excludeId) qb.andWhere('cp.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }

  async countByStation(stationId: string): Promise<number> {
    return this.cpRepo.count({ where: { stationId } });
  }

  async save(charger: Charger, manager?: EntityManager): Promise<void> {
    const e: Partial<ChargingPointOrmEntity> = {
      id:          charger.id,
      stationId:   charger.stationId,
      name:        charger.name,
      externalId:  charger.externalId,
      maxPowerKw:  charger.maxPowerKw,
      status:      charger.status,
    };

    if (manager) {
      await manager.save(ChargingPointOrmEntity, e);
      // Upsert connectors
      for (const c of charger.connectors) {
        await manager.save(ConnectorOrmEntity, {
          id:               c.id,
          chargingPointId:  c.chargingPointId,
          connectorType:    c.connectorType,
          maxPowerKw:       c.maxPowerKw,
        });
      }
    } else {
      await this.cpRepo.save(e as ChargingPointOrmEntity);
      for (const c of charger.connectors) {
        await this.connectorRepo.save({
          id:               c.id,
          chargingPointId:  c.chargingPointId,
          connectorType:    c.connectorType,
          maxPowerKw:       c.maxPowerKw,
        } as ConnectorOrmEntity);
      }
    }
  }

  async updateStatus(
    chargerId: string,
    status: ChargerStatus,
    manager?: EntityManager,
  ): Promise<void> {
    if (manager) {
      await manager.update(ChargingPointOrmEntity, { id: chargerId }, { status });
    } else {
      await this.cpRepo.update({ id: chargerId }, { status });
    }
  }

  // Mapper

  private toDomain(cp: ChargingPointOrmEntity): Charger {
    return Charger.reconstitute({
      id:         cp.id,
      stationId:  cp.stationId,
      name:       cp.name,
      externalId: cp.externalId,
      maxPowerKw: Number(cp.maxPowerKw),
      status:     cp.status as ChargerStatus,
      connectors: (cp.connectors ?? []).map((c: ConnectorOrmEntity) => ({
        id:              c.id,
        chargingPointId: c.chargingPointId,
        connectorType:   c.connectorType as ConnectorType,
        maxPowerKw:      c.maxPowerKw ? Number(c.maxPowerKw) : null,
      })),
      createdAt:  cp.createdAt,
      updatedAt:  cp.updatedAt,
    });
  }
}
