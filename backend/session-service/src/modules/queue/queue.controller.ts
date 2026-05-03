import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JoinQueueUseCase, LeaveQueueUseCase } from '../../application/use-cases/queue.use-case';
import { JoinQueueDto } from '../../application/dtos/booking.dto';
import { QueuePositionResponseDto } from '../../application/dtos/response.dto';
import { PriorityQueueService } from '../../domain/services/priority-queue.service';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly joinQueue: JoinQueueUseCase,
    private readonly leaveQueue: LeaveQueueUseCase,
    private readonly priorityQueue: PriorityQueueService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async join(@Body() dto: JoinQueueDto, @Req() req: any): Promise<QueuePositionResponseDto> {
    return this.joinQueue.execute({
      userId: req.user?.id ?? (dto as any)['userId'],
      chargerId: dto.chargerId,
      connectorType: dto.connectorType,
      userPriority: req.user?.subscriptionTier ?? 1,
      urgencyScore: dto.urgencyScore ?? 0,
    });
  }

  @Delete(':chargerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Param('chargerId') chargerId: string, @Req() req: any): Promise<void> {
    await this.leaveQueue.execute({
      userId: req.user?.id ?? '',
      chargerId,
    });
  }

  @Get(':chargerId/position')
  async getPosition(
    @Param('chargerId') chargerId: string,
    @Req() req: any,
  ): Promise<{ position: number; queueSize: number }> {
    const position = this.priorityQueue.getPosition(req.user?.id, chargerId);
    const queueSize = this.priorityQueue.size(chargerId);
    return { position, queueSize };
  }
}
