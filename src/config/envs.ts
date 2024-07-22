import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  PUPPETEER_EXECUTABLE_PATH: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    PUPPETEER_EXECUTABLE_PATH: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  natsServers: envVars.NATS_SERVERS,
  puppeteerExecutablePath: envVars.PUPPETEER_EXECUTABLE_PATH,
  redisHost: envVars.REDIS_HOST,
  redisPort: envVars.REDIS_PORT,
};
