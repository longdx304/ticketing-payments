import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

declare global {
  var signin: () => string[];
  var createId: () => string;
}

jest.mock('../nats-wrapper');

let mongo: any;

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

global.signin = () => {
  // build a jwt payload { id, email }
  const payload = {
    id: global.createId(),
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
