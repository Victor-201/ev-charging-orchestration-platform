import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PricingRuleOrmEntity,
  ChargingPointOrmEntity,
  ConnectorOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/station.orm-entities';
import { ChargerNotFoundException } from '../../domain/exceptions/station.exceptions';

// ─── Constants: VinFast EV Charging Rate Standard (EVN TOU) ──────────────────

/** Giờ thấp điểm: 22:00 – 06:00 hàng ngày */
export const OFF_PEAK_HOURS = [22, 23, 0, 1, 2, 3, 4, 5] as const;

/** Giờ cao điểm (EVN peak): 09:30–11:30, 17:00–20:00 */
function isPeakHour(hour: number): boolean {
  return (hour >= 9 && hour < 12) || (hour >= 17 && hour < 20);
}
function isOffPeakHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

/** Fallback VinFast giá mặc định (VND/kWh) khi không có pricing_rule */
const DEFAULT_RATE: Record<string, Record<string, number>> = {
  CCS:     { off_peak: 2_500, normal: 3_500, peak: 4_500 },
  'CCS2':  { off_peak: 2_500, normal: 3_500, peak: 4_500 },
  CHAdeMO: { off_peak: 2_500, normal: 3_500, peak: 4_500 },
  Type2:   { off_peak: 2_300, normal: 3_200, peak: 4_200 },
  'GB/T':  { off_peak: 2_000, normal: 2_800, peak: 3_800 },
  Other:   { off_peak: 2_000, normal: 2_800, peak: 3_800 },
};

/** Default idle fee khi không có pricing_rule (VinFast standard) */
const DEFAULT_IDLE_GRACE_MINUTES = 20;
const DEFAULT_IDLE_FEE_PER_MINUTE = 1_000; // 1.000 VND/phút

export interface PricingQuote {
  stationId:             string;
  chargerId:             string;
  connectorType:         string;
  pricePerKwhVnd:        number;    // giá hiện tại VND/kWh (TOU)
  pricePerMinuteVnd:     number;    // phí time-based (nếu có)
  idleGraceMinutes:      number;    // số phút miễn phí sau khi sạc đầy
  idleFeePerMinuteVnd:   number;    // VND/phút sau grace period
  isPeakHour:            boolean;
  isOffPeakHour:         boolean;
  estimatedTotalVnd:     number;
  recommendedDepositVnd: number;    // ước tính × 1.20 (buffer idle fee)
  ruleId:                string | null;
  validFrom:             Date | null;
  validTo:               Date | null;
  label:                 string | null;
  currency:              string;
}

export interface SessionFeeBreakdown {
  energyFeeVnd:    number;   // tiền điện = kwhConsumed × pricePerKwh (TOU)
  idleFeeVnd:      number;   // phí chiếm dụng = max(0, idleMinutes - grace) × idleFeePerMinute
  totalFeeVnd:     number;   // energyFee + idleFee
  pricePerKwhVnd:  number;   // giá TOU được áp dụng
  idleGraceMinutes: number;
  idleFeePerMinuteVnd: number;
  chargeableIdleMinutes: number;  // số phút bị tính phí (đã trừ grace)
  ruleId:          string | null;
  tier:            'peak' | 'off_peak' | 'normal';
}

// ─── GetPricingUseCase ────────────────────────────────────────────────────────

/**
 * GetPricingUseCase — Tính giá sạc theo:
 *   - Loại connector (CCS, CHAdeMO, Type2, GB/T)
 *   - Khung giờ EVN TOU (cao điểm / thấp điểm / bình thường)
 *   - Ngày trong tuần (day_mask bitmask)
 *   - Admin-configurable idle fee (idle_grace_minutes, idle_fee_per_minute)
 */
@Injectable()
export class GetPricingUseCase {
  private readonly logger = new Logger(GetPricingUseCase.name);

  static readonly MIN_DEPOSIT_VND   = 50_000;
  static readonly EFFICIENCY_FACTOR = 0.85;
  static readonly DEPOSIT_BUFFER    = 1.20; // 20% buffer để cover idle fee

  constructor(
    @InjectRepository(PricingRuleOrmEntity)
    private readonly pricingRepo: Repository<PricingRuleOrmEntity>,
    @InjectRepository(ChargingPointOrmEntity)
    private readonly chargerRepo: Repository<ChargingPointOrmEntity>,
    @InjectRepository(ConnectorOrmEntity)
    private readonly connectorRepo: Repository<ConnectorOrmEntity>,
  ) {}

  async execute(opts: {
    stationId:     string;
    chargerId:     string;
    connectorType: string;
    startTime:     Date;
    endTime:       Date;
  }): Promise<PricingQuote> {
    const charger = await this.chargerRepo.findOne({
      where: { id: opts.chargerId, stationId: opts.stationId },
      relations: ['connectors'],
    });
    if (!charger) throw new ChargerNotFoundException(opts.chargerId);

    const connector = charger.connectors?.find(
      (c) => c.connectorType === opts.connectorType,
    );
    if (!connector) {
      throw new Error(
        `Charger ${opts.chargerId} không có connector type ${opts.connectorType}. ` +
        `Available: ${charger.connectors?.map((c) => c.connectorType).join(', ')}`,
      );
    }

    const hour      = opts.startTime.getHours();
    const dayOfWeek = opts.startTime.getDay() || 7;

    const rule = await this.findBestPricingRule(
      opts.stationId, opts.connectorType, opts.startTime, hour, dayOfWeek,
    );

    let pricePerKwhVnd: number;
    let pricePerMinuteVnd    = 0;
    let idleGraceMinutes     = DEFAULT_IDLE_GRACE_MINUTES;
    let idleFeePerMinuteVnd  = DEFAULT_IDLE_FEE_PER_MINUTE;
    let ruleId: string | null = null;
    let validFrom: Date | null = null;
    let validTo: Date | null   = null;
    let label: string | null   = null;

    if (rule) {
      pricePerKwhVnd      = Number(rule.pricePerKwh);
      pricePerMinuteVnd   = rule.pricePerMinute ? Number(rule.pricePerMinute) : 0;
      idleGraceMinutes    = rule.idleGraceMinutes;
      idleFeePerMinuteVnd = Number(rule.idleFeePerMinute);
      ruleId              = rule.id;
      validFrom           = rule.validFrom;
      validTo             = rule.validTo;
      label               = rule.label ?? null;
    } else {
      const tier = isPeakHour(hour) ? 'peak' : isOffPeakHour(hour) ? 'off_peak' : 'normal';
      const rates = DEFAULT_RATE[opts.connectorType] ?? DEFAULT_RATE['Other'];
      pricePerKwhVnd = rates[tier];
      this.logger.debug(
        `No rule for station=${opts.stationId} connector=${opts.connectorType}. ` +
        `Fallback: ${pricePerKwhVnd} VND/kWh (${tier})`,
      );
    }

    const durationMs    = opts.endTime.getTime() - opts.startTime.getTime();
    const durationHours = durationMs / (1000 * 3600);
    const maxPowerKw    = Number(charger.maxPowerKw) || 22;
    const estimatedKwh  = durationHours * maxPowerKw * GetPricingUseCase.EFFICIENCY_FACTOR;
    const estimatedTotalVnd = Math.ceil(estimatedKwh * pricePerKwhVnd);

    const rawDeposit = Math.ceil(estimatedTotalVnd * GetPricingUseCase.DEPOSIT_BUFFER);
    const recommendedDepositVnd = Math.max(rawDeposit, GetPricingUseCase.MIN_DEPOSIT_VND);

    return {
      stationId:            opts.stationId,
      chargerId:            opts.chargerId,
      connectorType:        opts.connectorType,
      pricePerKwhVnd,
      pricePerMinuteVnd,
      idleGraceMinutes,
      idleFeePerMinuteVnd,
      isPeakHour:           isPeakHour(hour),
      isOffPeakHour:        isOffPeakHour(hour),
      estimatedTotalVnd,
      recommendedDepositVnd,
      ruleId,
      validFrom,
      validTo,
      label,
      currency: 'VND',
    };
  }

  private async findBestPricingRule(
    stationId:     string,
    connectorType: string,
    startTime:     Date,
    hour:          number,
    dayOfWeek:     number,
  ): Promise<PricingRuleOrmEntity | null> {
    const dayBit = 1 << (dayOfWeek - 1);
    const rules = await this.pricingRepo
      .createQueryBuilder('pr')
      .where('pr.station_id = :stationId', { stationId })
      .andWhere('pr.connector_type = :connectorType', { connectorType })
      .andWhere('pr.valid_from <= :now', { now: startTime })
      .andWhere('(pr.valid_to IS NULL OR pr.valid_to >= :now)', { now: startTime })
      .andWhere('(pr.day_mask = 0 OR (pr.day_mask & :dayBit) > 0)', { dayBit })
      .andWhere('(pr.hour_start IS NULL OR pr.hour_start <= :hour)', { hour })
      .andWhere('(pr.hour_end IS NULL OR pr.hour_end > :hour)', { hour })
      .orderBy('pr.valid_from', 'DESC')
      .getMany();
    return rules[0] ?? null;
  }
}

// ─── CalculateSessionFeeUseCase ───────────────────────────────────────────────

/**
 * Tính chi tiết hóa đơn thực tế sau khi kết thúc phiên sạc.
 *
 * Billing logic:
 *   1. Lookup pricing rule tại thời điểm startTime (TOU — Time Of Use)
 *   2. energyFee = kwhConsumed × pricePerKwh
 *   3. idleFee   = max(0, idleMinutes - idleGraceMinutes) × idleFeePerMinute
 *   4. totalFee  = energyFee + idleFee
 *
 * Chú ý: idle_grace_minutes và idle_fee_per_minute do Admin cấu hình trong
 * pricing_rules — không hardcode.
 */
@Injectable()
export class CalculateSessionFeeUseCase {
  private readonly logger = new Logger(CalculateSessionFeeUseCase.name);

  constructor(
    @InjectRepository(PricingRuleOrmEntity)
    private readonly pricingRepo: Repository<PricingRuleOrmEntity>,
    @InjectRepository(ChargingPointOrmEntity)
    private readonly chargerRepo: Repository<ChargingPointOrmEntity>,
  ) {}

  async execute(opts: {
    chargerId:     string;
    stationId:     string;
    connectorType: string;
    startTime:     Date;   // thời điểm bắt đầu sạc (dùng để lookup TOU rule)
    kwhConsumed:   number; // kWh thực tế tiêu thụ
    idleMinutes:   number; // phút chiếm dụng sau khi sạc đầy (từ OCPP event)
  }): Promise<SessionFeeBreakdown> {
    const charger = await this.chargerRepo.findOne({
      where: { id: opts.chargerId, stationId: opts.stationId },
    });

    const hour      = opts.startTime.getHours();
    const dayOfWeek = opts.startTime.getDay() || 7;
    const dayBit    = 1 << (dayOfWeek - 1);

    // Lookup pricing rule
    const rules = await this.pricingRepo
      .createQueryBuilder('pr')
      .where('pr.station_id = :stationId', { stationId: opts.stationId })
      .andWhere('pr.connector_type = :connectorType', { connectorType: opts.connectorType })
      .andWhere('pr.valid_from <= :now', { now: opts.startTime })
      .andWhere('(pr.valid_to IS NULL OR pr.valid_to >= :now)', { now: opts.startTime })
      .andWhere('(pr.day_mask = 0 OR (pr.day_mask & :dayBit) > 0)', { dayBit })
      .andWhere('(pr.hour_start IS NULL OR pr.hour_start <= :hour)', { hour })
      .andWhere('(pr.hour_end IS NULL OR pr.hour_end > :hour)', { hour })
      .orderBy('pr.valid_from', 'DESC')
      .getMany();

    const rule = rules[0] ?? null;

    // Determine TOU tier & rate
    let pricePerKwhVnd: number;
    let idleGraceMinutes    = DEFAULT_IDLE_GRACE_MINUTES;
    let idleFeePerMinuteVnd = DEFAULT_IDLE_FEE_PER_MINUTE;
    let ruleId: string | null = null;
    let tier: 'peak' | 'off_peak' | 'normal';

    if (isPeakHour(hour))       tier = 'peak';
    else if (isOffPeakHour(hour)) tier = 'off_peak';
    else                         tier = 'normal';

    if (rule) {
      pricePerKwhVnd      = Number(rule.pricePerKwh);
      idleGraceMinutes    = rule.idleGraceMinutes;
      idleFeePerMinuteVnd = Number(rule.idleFeePerMinute);
      ruleId              = rule.id;
    } else {
      const rates = DEFAULT_RATE[opts.connectorType] ?? DEFAULT_RATE['Other'];
      pricePerKwhVnd = rates[tier];
      this.logger.warn(
        `No pricing rule — fallback for charger=${opts.chargerId} tier=${tier}: ${pricePerKwhVnd} VND/kWh`,
      );
    }

    // Calculate fees
    const energyFeeVnd = Math.ceil(opts.kwhConsumed * pricePerKwhVnd);
    const chargeableIdleMinutes = Math.max(0, opts.idleMinutes - idleGraceMinutes);
    const idleFeeVnd   = Math.ceil(chargeableIdleMinutes * idleFeePerMinuteVnd);
    const totalFeeVnd  = energyFeeVnd + idleFeeVnd;

    this.logger.log(
      `SessionFee: charger=${opts.chargerId} ` +
      `energy=${energyFeeVnd}VND (${opts.kwhConsumed}kWh × ${pricePerKwhVnd}) ` +
      `idle=${idleFeeVnd}VND (${chargeableIdleMinutes}min × ${idleFeePerMinuteVnd}) ` +
      `total=${totalFeeVnd}VND tier=${tier}`,
    );

    return {
      energyFeeVnd,
      idleFeeVnd,
      totalFeeVnd,
      pricePerKwhVnd,
      idleGraceMinutes,
      idleFeePerMinuteVnd,
      chargeableIdleMinutes,
      ruleId,
      tier,
    };
  }
}

// ─── UpsertPricingRuleUseCase (Admin) ─────────────────────────────────────────

/**
 * Admin tạo hoặc cập nhật một pricing rule.
 * Không bao giờ xóa rule cũ — chỉ set valid_to để deactivate.
 */
@Injectable()
export class UpsertPricingRuleUseCase {
  constructor(
    @InjectRepository(PricingRuleOrmEntity)
    private readonly pricingRepo: Repository<PricingRuleOrmEntity>,
  ) {}

  async execute(dto: {
    id?:                string;   // nếu có → update, không → create
    stationId:          string;
    connectorType:      string;
    validFrom:          Date;
    validTo?:           Date;
    hourStart?:         number;
    hourEnd?:           number;
    dayMask?:           number;
    pricePerKwh:        number;   // VND/kWh (TOU giá mới)
    pricePerMinute?:    number;
    idleGraceMinutes?:  number;   // phút miễn phí idle (default 20)
    idleFeePerMinute?:  number;   // VND/phút idle (default 1000)
    label?:             string;
    currency?:          string;
  }): Promise<PricingRuleOrmEntity> {
    const existing = dto.id
      ? await this.pricingRepo.findOne({ where: { id: dto.id } })
      : null;

    const entity = existing ?? this.pricingRepo.create({ id: crypto.randomUUID() });

    entity.stationId         = dto.stationId;
    entity.connectorType     = dto.connectorType as any;
    entity.validFrom         = dto.validFrom;
    entity.validTo           = dto.validTo ?? null;
    entity.hourStart         = dto.hourStart ?? null;
    entity.hourEnd           = dto.hourEnd   ?? null;
    entity.dayMask           = dto.dayMask   ?? 0;
    entity.pricePerKwh       = dto.pricePerKwh;
    entity.pricePerMinute    = dto.pricePerMinute ?? null;
    entity.idleGraceMinutes  = dto.idleGraceMinutes  ?? 20;
    entity.idleFeePerMinute  = dto.idleFeePerMinute  ?? 1_000;
    entity.label             = dto.label    ?? null;
    entity.currency          = dto.currency ?? 'VND';

    return this.pricingRepo.save(entity);
  }
}

// ─── DeactivatePricingRuleUseCase (Admin) ─────────────────────────────────────

@Injectable()
export class DeactivatePricingRuleUseCase {
  constructor(
    @InjectRepository(PricingRuleOrmEntity)
    private readonly pricingRepo: Repository<PricingRuleOrmEntity>,
  ) {}

  async execute(ruleId: string): Promise<void> {
    await this.pricingRepo.update(ruleId, { validTo: new Date() });
  }
}

// ─── ListPricingRulesUseCase ──────────────────────────────────────────────────

@Injectable()
export class ListPricingRulesUseCase {
  constructor(
    @InjectRepository(PricingRuleOrmEntity)
    private readonly pricingRepo: Repository<PricingRuleOrmEntity>,
  ) {}

  async execute(stationId?: string, activeOnly = false): Promise<PricingRuleOrmEntity[]> {
    const qb = this.pricingRepo.createQueryBuilder('pr').orderBy('pr.valid_from', 'DESC');
    if (stationId) qb.where('pr.station_id = :stationId', { stationId });
    if (activeOnly) {
      const now = new Date();
      qb.andWhere('pr.valid_from <= :now', { now })
        .andWhere('(pr.valid_to IS NULL OR pr.valid_to >= :now)', { now });
    }
    return qb.getMany();
  }
}
