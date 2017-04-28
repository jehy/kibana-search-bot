const processText = require('./process'),
      colors      = require('colors/safe'),
      fs          = require('fs'),
      uuid        = require('uuid/v4'),
      SlackUpload = require('node-slack-upload');


class SlackBot {
  constructor(bot, config) {
    const slackUpload = new SlackUpload(config.slack.token);

    bot.on('message', (msg) => {
      let finished = false;
      if (msg.type !== 'message' || !!msg.bot_id || msg.subtype === 'file_share') {
        console.log(colors.blue('no need to process this'));
        return;
      } else if (msg.type === 'message') {
        console.log(colors.yellow(JSON.stringify(msg)));
      }
      if ((msg.text.indexOf(config.slack.id) === -1) && (msg.channel !== config.slack.channel)) {
        console.log(colors.blue('not my message!'));
        return;
      }
      const query  = msg.text,
            chatId = msg.channel;
      console.log(`${chatId}: ${query}`);
      processText(query)
        .then((data) => {
          finished = true;
          let text = '';
          if (!data || data.length === 0 || !data[0] || data === '[]') {
            text = `По запросу *${query}* ничего не нашлось :(`;
            bot.postMessage(chatId, text);
            return;
          }
          text = `Найдено по запросу ${query}`;
          /* we could also send it as an attachment
           let params = {
           "attachments": [
           {
           "fallback": data,
           //"pretext": text,
           //"title": text,
           "text": "```\n" + data + '\n```',
           "mrkdwn_in": ["text"],
           "color": "#7CD197"
           }
           ]
           };*/
          const tempFileName = `tmp/${uuid()}.json`;
          fs.writeFileSync(tempFileName, data);
          slackUpload.uploadFile({
            file: fs.createReadStream(tempFileName),
            filetype: 'javascript',
            // title: 'Kibana log '+query+'.json',
            title: `Kibana log ${query}.json`,
            initialComment: `Найдено по запросу ${query}`,
            channels: msg.channel,
          }, (err, uploadData) => {
            if (err !== null) {
              console.log(err);
              console.log(colors.red(JSON.stringify(err)));
              bot.postMessage(chatId, `Ошибка при загрузке файла: ${err}`);
            } else {
              console.log('Uploaded file details: ', uploadData);
            }
            fs.unlinkSync(tempFileName);
          });
        })
        .catch((err)=> {
          console.log(err);
          console.log(colors.red(JSON.stringify(err)));
          bot.postMessage(chatId, `Ошибка: ${err}`);
        });
    });
  }
}
module.exports = SlackBot;
