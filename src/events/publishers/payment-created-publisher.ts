import { PaymentCreatedEvent, Publisher, Subjects } from '@ldxtickets/common';

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  readonly subject = Subjects.PaymentCreated;
}
