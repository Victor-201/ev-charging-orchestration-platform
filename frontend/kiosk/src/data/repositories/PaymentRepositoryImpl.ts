import { IPaymentRepository } from "../../domain/repositories/repository.interfaces";
import { PaymentCreateResponse } from "../../domain/entities/entities";
import { apiClient } from "../sources/apiClient";

export class PaymentRepositoryImpl implements IPaymentRepository {
  async createVnpayPayment(amount: number, sessionId?: string): Promise<PaymentCreateResponse> {
    const { data } = await apiClient.post<PaymentCreateResponse>('/payments/create', {
      bookingId: sessionId,
      amount,
      ipAddr: '127.0.0.1',
    });
    return data;
  }
}
