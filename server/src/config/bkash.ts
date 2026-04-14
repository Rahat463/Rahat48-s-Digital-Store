import config from './index.js';
import type { BkashConfig } from '../types/index.js';

const bkashConfig: BkashConfig = {
  baseURL: config.BKASH_BASE_URL,
  username: config.BKASH_USERNAME,
  password: config.BKASH_PASSWORD,
  appKey: config.BKASH_APP_KEY,
  appSecret: config.BKASH_APP_SECRET,
  callbackURL: config.BKASH_CALLBACK_URL,
};

export default bkashConfig;
