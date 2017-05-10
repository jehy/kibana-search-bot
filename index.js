const config = require('./config/config.json');

const // TelegramBotApi  = require('node-telegram-bot-api'),
  SlackBotApi = require('slackbots'),
  SlackBot    = require('./SlackBot');

const // telegramBotInstance = new TelegramBotApi(config.telegram.token, {polling: true}),
  slackBotInstance = new SlackBotApi({token: config.slack.token, name: config.slack.name});

const // bot1 = new DumbBot(telegramBotInstance, config),
  bot2 = new SlackBot(slackBotInstance, config);
