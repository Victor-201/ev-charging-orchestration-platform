import {
  Controller, Get, Post, Patch, Body, Param, Query,
  HttpCode, HttpStatus, NotFoundException, BadRequestException,
  ConflictException, UnprocessableEntityException,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  CreateStationUseCase, UpdateStationUseCase, GetStationUseCase,
  ListStationsUseCase, GetNearbyStationsUseCase,
  AddChargerUseCase, UpdateChargerStatusUseCase,
  GetChargersUseCase, GetCitiesUseCase,
} from '../../application/use-cases/station.use-cases';
import { GetPricingUseCase, CalculateSessionFeeUseCase, UpsertPricingRuleUseCase, DeactivatePricingRuleUseCase, ListPricingRulesUseCase } from '../../application/use-cases/pricing.use-case';
import { CreateStationDto, UpdateStationDto, ListStationsQueryDto } from '../../application/dtos/station.dto';
import { AddChargerDto, UpdateChargerStatusDto } from '../../application/dtos/charger.dto';
import {
  StationNotFoundException, ChargerNotFoundException, CityNotFoundException,
  DuplicateGeoLocationException, DuplicateExternalIdException,
  InvalidStationDataException, InvalidChargerDataException,
  InvalidStatusTransitionException,
} from '../../domain/exceptions/station.exceptions';
import { JwtAuthGuard }             from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }               from '../../shared/guards/roles.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles, Public } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser }   from '../../shared/guards/jwt-auth.guard';

/**
 * StationController Ã¢â‚¬â€ Auth policy:
 *
 *   GET  /stations            Ã¢â€ â€™ @Public  (ai cÃ…Â©ng xem Ã„â€˜Ã†Â°Ã¡Â»Â£c)
 *   GET  /stations/nearby     Ã¢â€ â€™ @Public
 *   GET  /stations/cities     Ã¢â€ â€™ @Public
 *   GET  /stations/:id        Ã¢â€ â€™ @Public
 *   GET  /:id/chargers        Ã¢â€ â€™ @Public
 *
 *   POST /stations            Ã¢â€ â€™ @Roles('admin')          (chÃ¡Â»â€° admin tÃ¡ÂºÂ¡o trÃ¡ÂºÂ¡m)
 *   PATCH /stations/:id       Ã¢â€ â€™ @Roles('admin')          (chÃ¡Â»â€° admin sÃ¡Â»Â­a trÃ¡ÂºÂ¡m)
 *   POST /:id/chargers        Ã¢â€ â€™ @Roles('admin', 'staff') (thÃƒÂªm charger)
 *   PATCH /:id/chargers/status Ã¢â€ â€™ @Roles('admin','staff') (thay Ã„â€˜Ã¡Â»â€¢i status charger)
 */
@Controller('stations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StationController {
  constructor(
    private readonly createStation:       CreateStationUseCase,
    private readonly updateStation:       UpdateStationUseCase,
    private readonly getStation:          GetStationUseCase,
    private readonly listStations:        ListStationsUseCase,
    private readonly getNearbyStations:   GetNearbyStationsUseCase,
    private readonly addCharger:          AddChargerUseCase,
    private readonly updateChargerStatus: UpdateChargerStatusUseCase,
    private readonly getChargers:         GetChargersUseCase,
    private readonly getCities:           GetCitiesUseCase,
    private readonly getPricing:          GetPricingUseCase,
    private readonly calcSessionFee:      CalculateSessionFeeUseCase,
    private readonly upsertPricingRule:   UpsertPricingRuleUseCase,
    private readonly deactivateRule:      DeactivatePricingRuleUseCase,
    private readonly listPricingRules:    ListPricingRulesUseCase,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Public Read Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  @Get()
  @Public()
  async list(@Query() query: ListStationsQueryDto) {
    return this.listStations.execute(query);
  }

  @Get('nearby')
  @Public()
  async nearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radiusKm') radiusKm = 10,
    @Query('limit')    limit    = 20,
  ) {
    return this.handleDomainErrors(() =>
      this.getNearbyStations.execute(Number(lat), Number(lng), Number(radiusKm), Number(limit)),
    );
  }

  @Get('cities')
  @Public()
  async cities() {
    return this.getCities.execute();
  }

  @Get(':id')
  @Public()
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.handleDomainErrors(() => this.getStation.execute(id));
  }

  @Get(':stationId/chargers')
  @Public()
  async listChargers(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.handleDomainErrors(() => this.getChargers.execute(stationId));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Admin/Staff Write Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  /**
   * POST /api/v1/stations
   * ChÃ¡Â»â€° admin Ã„â€˜Ã†Â°Ã¡Â»Â£c tÃ¡ÂºÂ¡o trÃ¡ÂºÂ¡m mÃ¡Â»â€ºi.
   * ownerId inject tÃ¡Â»Â« JWT Ã¢â‚¬â€ khÃƒÂ´ng trust body.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(
    @Body() body: CreateStationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.ownerId) body.ownerId = user.id;
    return this.handleDomainErrors(() => this.createStation.execute(body));
  }

  /**
   * PATCH /api/v1/stations/:id
   * ChÃ¡Â»â€° admin Ã„â€˜Ã†Â°Ã¡Â»Â£c sÃ¡Â»Â­a thÃƒÂ´ng tin trÃ¡ÂºÂ¡m.
   */
  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStationDto,
  ) {
    return this.handleDomainErrors(() => this.updateStation.execute(id, body));
  }

  /**
   * POST /api/v1/stations/:stationId/chargers
   * Admin/staff thÃƒÂªm charger vÃƒÂ o trÃ¡ÂºÂ¡m.
   */
  @Post(':stationId/chargers')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'staff')
  async addChargerToStation(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Body() body: AddChargerDto,
  ) {
    return this.handleDomainErrors(() => this.addCharger.execute(stationId, body));
  }

  /**
   * PATCH /api/v1/stations/:stationId/chargers/:chargerId/status
   * Admin/staff cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t trÃ¡ÂºÂ¡ng thÃƒÂ¡i charger.
   */
  @Patch(':stationId/chargers/:chargerId/status')
  @Roles('admin', 'staff')
  async updateStatus(
    @Param('chargerId', ParseUUIDPipe) chargerId: string,
    @Body() body: UpdateChargerStatusDto,
  ) {
    return this.handleDomainErrors(() => this.updateChargerStatus.execute(chargerId, body));
  }

  // â”€â”€â”€ Pricing Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /api/v1/stations/:stationId/chargers/:chargerId/pricing
   * @Public â€” booking-service vÃ  frontend Ä‘á»u cÃ³ thá»ƒ gá»i
   *
   * Query:
   *   connectorType  : string (required) â€” CCS | CHAdeMO | Type2 | GB/T
   *   startTime      : ISO string (required)
   *   endTime        : ISO string (required)
   *
   * Response: PricingQuote (giÃ¡, tiá»n cá»c Ä‘á» xuáº¥t, isPeakHour)
   */
  @Get(':stationId/chargers/:chargerId/pricing')
  @Public()
  async getChargerPricing(
    @Param('stationId',  ParseUUIDPipe) stationId:  string,
    @Param('chargerId',  ParseUUIDPipe) chargerId:  string,
    @Query('connectorType') connectorType: string,
    @Query('startTime')     startTimeStr:  string,
    @Query('endTime')       endTimeStr:    string,
  ) {
    if (!connectorType || !startTimeStr || !endTimeStr) {
      throw new BadRequestException('connectorType, startTime, endTime Ä‘á»u báº¯t buá»™c');
    }
    const startTime = new Date(startTimeStr);
    const endTime   = new Date(endTimeStr);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('startTime / endTime khÃ´ng há»£p lá»‡ (pháº£i Ä‘Ãºng ISO 8601)');
    }
    return this.handleDomainErrors(() =>
      this.getPricing.execute({ stationId, chargerId, connectorType, startTime, endTime }),
    );
  }

  /**
   * POST /api/v1/stations/:stationId/chargers/:chargerId/pricing/calculate-session-fee
   * Internal endpoint â€” billing-service gá»i sau khi session káº¿t thÃºc.
   * TÃ­nh energyFeeVnd + idleFeeVnd tá»« kWh vÃ  idleMinutes thá»±c táº¿.
   * @Public vÃ¬ billing-service khÃ´ng cÃ³ JWT user context khi consume event
   */
  @Post(':stationId/chargers/:chargerId/pricing/calculate-session-fee')
  @HttpCode(HttpStatus.OK)
  @Public()
  async calculateSessionFee(
    @Param('stationId',  ParseUUIDPipe) stationId:  string,
    @Param('chargerId',  ParseUUIDPipe) chargerId:  string,
    @Body() body: {
      connectorType: string;
      startTime:     string;   // ISO â€” dÃ¹ng Ä‘á»ƒ lookup TOU rule
      kwhConsumed:   number;
      idleMinutes:   number;   // phÃºt chiáº¿m dá»¥ng sau khi sáº¡c Ä‘áº§y (0 náº¿u khÃ´ng cÃ³)
    },
  ) {
    if (!body.connectorType || !body.startTime) {
      throw new BadRequestException('connectorType vÃ  startTime báº¯t buá»™c');
    }
    const startTime = new Date(body.startTime);
    if (isNaN(startTime.getTime())) throw new BadRequestException('startTime khÃ´ng há»£p lá»‡');
    return this.calcSessionFee.execute({
      chargerId,
      stationId,
      connectorType: body.connectorType,
      startTime,
      kwhConsumed:   body.kwhConsumed  ?? 0,
      idleMinutes:   body.idleMinutes  ?? 0,
    });
  }

  // â”€â”€â”€ Admin: Pricing Rules CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /api/v1/stations/pricing-rules?stationId=&activeOnly=true
   * Admin xem toÃ n bá»™ pricing rules (TOU + idle fee).
   */
  @Get('pricing-rules')
  @Roles('admin', 'staff')
  async listRules(
    @Query('stationId')  stationId:  string,
    @Query('activeOnly') activeOnly: string,
  ) {
    return this.listPricingRules.execute(
      stationId  || undefined,
      activeOnly === 'true',
    );
  }

  /**
   * POST /api/v1/stations/pricing-rules
   * Admin táº¡o pricing rule má»›i (TOU tier má»›i hoáº·c thay Ä‘á»•i idle fee).
   * Body cho phÃ©p thay Ä‘á»•i pricePerKwh, idleGraceMinutes, idleFeePerMinute tá»± do.
   */
  @Post('pricing-rules')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async createRule(@Body() body: {
    stationId:          string;
    connectorType:      string;
    validFrom:          string;  // ISO date
    validTo?:           string;
    hourStart?:         number;
    hourEnd?:           number;
    dayMask?:           number;
    pricePerKwh:        number;
    pricePerMinute?:    number;
    idleGraceMinutes?:  number;
    idleFeePerMinute?:  number;
    label?:             string;
  }) {
    return this.upsertPricingRule.execute({
      ...body,
      validFrom: new Date(body.validFrom),
      validTo:   body.validTo ? new Date(body.validTo) : undefined,
    });
  }

  /**
   * Patch /api/v1/stations/pricing-rules/:ruleId
   * Admin cáº­p nháº­t pricing rule (thay Ä‘á»•i giÃ¡, idle fee, grace period).
   */
  @Patch('pricing-rules/:ruleId')
  @Roles('admin')
  async updateRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() body: {
      stationId:          string;
      connectorType:      string;
      validFrom:          string;
      validTo?:           string;
      hourStart?:         number;
      hourEnd?:           number;
      dayMask?:           number;
      pricePerKwh:        number;
      pricePerMinute?:    number;
      idleGraceMinutes?:  number;
      idleFeePerMinute?:  number;
      label?:             string;
    },
  ) {
    return this.upsertPricingRule.execute({
      id: ruleId,
      ...body,
      validFrom: new Date(body.validFrom),
      validTo:   body.validTo ? new Date(body.validTo) : undefined,
    });
  }

  /**
   * DELETE /api/v1/stations/pricing-rules/:ruleId
   * Admin vÃ´ hiá»‡u hÃ³a pricing rule (set valid_to = NOW()).
   * KhÃ´ng xÃ³a váº­t lÃ½ Ä‘á»ƒ giá»¯ lá»‹ch sá»­.
   */
  @Patch('pricing-rules/:ruleId/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  async deactivateRuleEndpoint(@Param('ruleId', ParseUUIDPipe) ruleId: string) {
    await this.deactivateRule.execute(ruleId);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Error Mapper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  private async handleDomainErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof StationNotFoundException || e instanceof ChargerNotFoundException || e instanceof CityNotFoundException) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof DuplicateGeoLocationException || e instanceof DuplicateExternalIdException) {
        throw new ConflictException(e.message);
      }
      if (e instanceof InvalidStationDataException || e instanceof InvalidChargerDataException || e instanceof InvalidStatusTransitionException) {
        throw new UnprocessableEntityException(e.message);
      }
      throw e;
    }
  }
}

