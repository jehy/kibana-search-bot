const config = require('./config/config.json');

const // TelegramBotApi  = require('node-telegram-bot-api'),
  SlackBotApi  = require('slackbots'),
  LogWriter    = require('logfox'),
  logWriter    = new LogWriter(config.Logging),
  app          = {logWriter},
  setLogRotate = require('./modules/logRotate'),
  SlackBot     = require('./SlackBot');

app.logWriter.start()
  .then(() => {
    app.log = app.logWriter.getLogger();
    setLogRotate(app, config);
    process.on('exit', () => {
      app.logWriter.stop(true);
    });
    const // telegramBotInstance = new TelegramBotApi(config.telegram.token, {polling: true}),
      slackBotInstance = new SlackBotApi({token: config.slack.token, name: config.slack.name});

    const // bot1 = new DumbBot(telegramBotInstance, config),
      bot2 = new SlackBot(slackBotInstance, config, app);
  });
