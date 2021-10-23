import { OrderStatus } from '@ldxtickets/common';
import request from 'supertest';
import { app } from '../../app';
import { Order } from '../../models/order';
import { Payment } from '../../models/payment';
import { stripe } from '../../stripe';

// jest.mock('../../stripe');

it('returns a 404 when purchasing an order that does not exist', async () => {
  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      token: 'asdas',
      orderId: global.createId(),
    })
    .expect(404);
});

it('return a 401 when purchasing an order that doesnt belong to the user', async () => {
  const order = await Order.build({
    id: global.createId(),
    version: 0,
    userId: global.createId(),
    price: 20,
    status: OrderStatus.Created,
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      token: 'asdas',
      orderId: order.id,
    })
    .expect(401);
});

it('returns a 400 when purchasing a cancelled order', async () => {
  const userId = global.createId();

  const order = await Order.build({
    id: global.createId(),
    version: 1,
    userId,
    price: 20,
    status: OrderStatus.Cancelled,
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      token: 'asdas',
      orderId: order.id,
    })
    .expect(400);
});

it('returns a 201 with valid inputs', async () => {
  const userId = global.createId();

  const price = Math.floor(Math.random() * 100000);

  const order = Order.build({
    id: global.createId(),
    version: 1,
    userId,
    price: price,
    status: OrderStatus.Created,
  });
  await order.save();

  const response = await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      token: 'tok_visa',
      orderId: order.id,
    })
    .expect(201);

  const stripeCharges = await stripe.charges.list({ limit: 50 });

  const stripeCharge = stripeCharges.data.find((charge) => {
    return charge.amount === price * 100;
  });

  expect(stripeCharge).toBeDefined();
  const { id, currency, amount } = stripeCharge!;

  // const { source, currency, amount } = (stripe.charges.create as jest.Mock).mock
  //   .calls[0][0];

  // expect(source).toEqual('tok_visa');
  expect(currency).toEqual('usd');
  expect(amount).toEqual(order.price * 100);

  const payment = await Payment.findOne({
    orderId: order.id,
    stripeId: id,
  });
  expect(payment).not.toBeNull();
  expect(response.body.id).toEqual(payment!.id);
});
