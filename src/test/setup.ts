import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

declare global {
  var signin: (id?: string) => string[];
  var createId: () => string;
}

jest.mock('../nats-wrapper');

let mongo: any;

process.env.STRIPE_KEY =
  'sk_test_51JnJGvIH0aL45by73djk6lq9ycDYJTwxxIYePRwQssDT2Zx0nxpCi7hE2TJRP3W4ES73VzRR5F2XWy369JEOoaKL00l1dEK2Nr';

beforeAll(async () => {
  process.env.JWT_KEY = 'asdf';

  mongo = new MongoMemoryServer();
  await mongo.start();
  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  jest.clearAllMocks();
  const collections = await mongoose.connection.db.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});

global.createId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

global.signin = (id?: string) => {
  // build a jwt payload { id, email }
  const payload = {
    id: id || global.createId(),
    email: 'test@test.com',
  };

  // create the JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  // build session object { jwt: MY_JWT} in JSON
  const sessionJSON = JSON.stringify({ jwt: token });

  // encode JSON as base64
  const base64 = Buffer.from(sessionJSON).toString('base64');

  // return a string as the cookie { express:sess= base64 }
  return [`express:sess=${base64}`];
};
