import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, ParseUUIDPipe, NotFoundException, BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  StaffProfileOrmEntity,
  AttendanceOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/user.orm-entities';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/guards/jwt-auth.guard';

class CreateStaffDto {
  userId: string;
  position: string;
  shift: string;
  notes?: string;
  stationId?: string;
}

class UpdateStaffDto {
  position?: string;
  shift?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

class CheckInDto {
  latitude: number;
  longitude: number;
  stationId?: string;
}

class CheckOutDto {
  latitude: number;
  longitude: number;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(
    @InjectRepository(StaffProfileOrmEntity)
    private readonly staffRepo: Repository<StaffProfileOrmEntity>,
    @InjectRepository(AttendanceOrmEntity)
    private readonly attendanceRepo: Repository<AttendanceOrmEntity>,
  ) {}

  /**
   * GET /api/v1/staff
   * Admin/Staff only: List staff profiles.
   */
  @Get('staff')
  @Roles('admin', 'staff')
  async listStaff(
    @Query('position') position?: string,
    @Query('shift') shift?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const where: any = {};
    if (position) where.position = position.toLowerCase();
    if (shift) where.shift = shift.toLowerCase();

    return this.staffRepo.find({
      where,
      take: limit ? Number(limit) : 20,
      skip: offset ? Number(offset) : 0,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * POST /api/v1/staff
   * Admin only: Create a new staff profile.
   */
  @Post('staff')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() dto: CreateStaffDto) {
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    const existing = await this.staffRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new BadRequestException('Staff profile already exists for this user');
    }

    const staff = this.staffRepo.create({
      id: uuidv4(),
      userId: dto.userId,
      position: dto.position ? dto.position.toLowerCase() : 'operator',
      shift: dto.shift ? dto.shift.toLowerCase() : 'morning',
      notes: dto.notes ?? null,
      stationId: dto.stationId ?? '00000000-0000-0000-0000-000000000000',
      stationName: 'EV Station',
      isActive: true,
      hireDate: new Date(),
    });

    return this.staffRepo.save(staff);
  }

  /**
   * PATCH /api/v1/staff/:id
   * Admin only: Update a staff profile.
   */
  @Patch('staff/:id')
  @Roles('admin')
  async updateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const staff = await this.staffRepo.findOne({ where: { id } });
    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    if (dto.position) staff.position = dto.position.toLowerCase();
    if (dto.shift) staff.shift = dto.shift.toLowerCase();
    if (dto.status) {
      staff.isActive = (dto.status === 'ACTIVE');
    }

    return this.staffRepo.save(staff);
  }

  /**
   * POST /api/v1/attendance/check-in
   * Staff only: Attendance check-in.
   */
  @Post('attendance/check-in')
  @Roles('staff', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
  ) {
    const staff = await this.staffRepo.findOne({ where: { userId: user.id } });
    if (!staff) {
      throw new NotFoundException('Staff profile not found for the current user');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let attendance = await this.attendanceRepo.findOne({
      where: { staffId: staff.id, workDate: today },
    });

    if (!attendance) {
      attendance = this.attendanceRepo.create({
        id: uuidv4(),
        staffId: staff.id,
        workDate: today,
        checkIn: new Date(),
        checkOut: null,
        status: 'present',
        notes: `Checked in (Lat: ${dto.latitude}, Lng: ${dto.longitude})`,
      });
    } else {
      attendance.checkIn = new Date();
      attendance.status = 'present';
    }

    return this.attendanceRepo.save(attendance);
  }

  /**
   * POST /api/v1/attendance/check-out
   * Staff only: Attendance check-out.
   */
  @Post('attendance/check-out')
  @Roles('staff', 'admin')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckOutDto,
  ) {
    const staff = await this.staffRepo.findOne({ where: { userId: user.id } });
    if (!staff) {
      throw new NotFoundException('Staff profile not found for the current user');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let attendance = await this.attendanceRepo.findOne({
      where: { staffId: staff.id, workDate: today },
    });

    if (!attendance) {
      attendance = this.attendanceRepo.create({
        id: uuidv4(),
        staffId: staff.id,
        workDate: today,
        checkIn: null,
        checkOut: new Date(),
        status: 'present',
        notes: `Checked out directly (Lat: ${dto.latitude}, Lng: ${dto.longitude})`,
      });
    } else {
      attendance.checkOut = new Date();
    }

    return this.attendanceRepo.save(attendance);
  }

  /**
   * GET /api/v1/attendance
   * Admin/Staff only: List attendance records.
   */
  @Get('attendance')
  @Roles('admin', 'staff')
  async listAttendance(
    @Query('userId') userId?: string,
    @Query('stationId') stationId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const qb = this.attendanceRepo.createQueryBuilder('att');

    if (userId) {
      qb.innerJoin(StaffProfileOrmEntity, 'staff', 'att.staffId = staff.id')
        .andWhere('staff.userId = :userId', { userId });
    }

    if (stationId) {
      if (!userId) {
        qb.innerJoin(StaffProfileOrmEntity, 'staff', 'att.staffId = staff.id');
      }
      qb.andWhere('staff.stationId = :stationId', { stationId });
    }

    if (fromDate) {
      qb.andWhere('att.workDate >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      qb.andWhere('att.workDate <= :toDate', { toDate: new Date(toDate) });
    }

    qb.take(limit ? Number(limit) : 20)
      .skip(offset ? Number(offset) : 0)
      .orderBy('att.workDate', 'DESC');

    return qb.getMany();
  }
}
