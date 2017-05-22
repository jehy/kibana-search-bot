const processText = require('./process'),
      colors      = require('colors/safe'),
      fs          = require('fs-extra'),
      uuid        = require('uuid/v4'),
      SlackUpload = require('node-slack-upload');


class SlackBot {
  constructor(bot, config) {
    const slackUpload = new SlackUpload(config.slack.token);

    bot.on('message', (msg) => {
      if (msg.type !== 'message' || !!msg.bot_id || msg.subtype === 'file_share') {
        console.log(colors.blue('no need to process this'));
        return;
      }
      if (msg.text === undefined) {
        console.log(colors.blue('empty message'));
        return;
      }
      let foundRequestId = msg.text.match(new RegExp(config.kibana.myKey, 'i'));
      if (foundRequestId !== null) {
        foundRequestId = foundRequestId[0];
        console.log(colors.blue(`Found key in message: ${foundRequestId[0]}`));
      }

      if ((foundRequestId === null) && (msg.text.indexOf(config.slack.id) === -1) && (msg.channel !== config.slack.channel)) {
        console.log(colors.blue('not my message'));
        return;
      }
      const query  = foundRequestId || msg.text,
            chatId = msg.channel;
      console.log(colors.yellow(`Processing ${chatId}: ${query}`));
      bot.ws.send(JSON.stringify({type: 'typing', channel: chatId}));
      processText(query)
        .then((data) => {
          let text = '';
          if (!data || !data.count || data.count === 0 || !data.data || data.data === '[]') {
            text = `По запросу *${query}* ничего не нашлось за последние ${config.kibana.searchFor} часов :(`;
            bot.postMessage(chatId, text, {as_user: true});
            return false;
          }
          text = `${data.count} результатов найдено по запросу *${query}*  за последние ${config.kibana.searchFor} часов`;
          /* we could also send it as an attachment but sending as a file is much cooler
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
          return fs.writeFile(tempFileName, data.data)
            .then(()=>
              new Promise((resolve, reject)=> {
                slackUpload.uploadFile({
                  file: fs.createReadStream(tempFileName),
                  // content: data.data,  it simply does not work :(
                  filetype: 'javascript',
                  // title: 'Kibana log '+query+'.json',
                  title: `Kibana log ${query}.json`,
                  initialComment: text,
                  channels: msg.channel,
                }, (err, uploadData) => {
                  if (err !== null) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              })
                .then(()=>fs.unlink(tempFileName)));
        })
        .catch((err)=> {
          const errorString = err.toString();
          const errLen = Math.min(255, errorString.length);
          const errShort = errorString.substr(0, errLen);
          console.log(colors.red(errShort));
          bot.postMessage(chatId, `Ошибка: ${errShort}`, {as_user: true});
        });
    });
  }
}
module.exports = SlackBot;
