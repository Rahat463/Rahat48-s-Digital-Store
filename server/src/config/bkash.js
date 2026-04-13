const bkashConfig = {
  baseURL: process.env.BKASH_BASE_URL,
  username: process.env.BKASH_USERNAME,
  password: process.env.BKASH_PASSWORD,
  appKey: process.env.BKASH_APP_KEY,
  appSecret: process.env.BKASH_APP_SECRET,
  callbackURL: process.env.BKASH_CALLBACK_URL,
};

module.exports = bkashConfig;
