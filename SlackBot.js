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

      bot.postMessage(chatId, null, {as_user: true, type: 'typing'});
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
          const errLen = Math.min(255, err.toString().length);
          const errShort = err.toString().substr(0, errLen);
          console.log(colors.red(errShort));
          bot.postMessage(chatId, `Ошибка: ${errShort}`, {as_user: true});
        });
    });
  }
}
module.exports = SlackBot;
