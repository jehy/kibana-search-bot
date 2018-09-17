
const SlackBotApi  = require('slackbots');
const LogWriter    = require('logfox');
const config = require('config');

const logWriter    = new LogWriter(config.Logging);
const app          = {logWriter};
const setLogRotate = require('./modules/logRotate');
const SlackBot     = require('./SlackBot');

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
