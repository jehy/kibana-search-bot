const fs = require('fs-extra');
const uuid = require('uuid/v4');
const SlackUpload = require('node-slack-upload');
const processText = require('./process');


class SlackBot {
  constructor(bot, config, app) {
    const slackUpload = new SlackUpload(config.slack.token);

    bot.on('message', (msg) => {
      // app.log.e(JSON.stringify(msg, null, 3));
      if (msg.type !== 'message' && msg.type !== 'bot_message') {
        app.log.v(`no need to process this (not my message type ${msg.type})`);
        return;
      }

      if (msg.user === config.slack.id) {
        app.log.v('no need to process this (my own message)');
        return;
      }

      if (msg.subtype === 'file_share') {
        app.log.v(`no need to process this (wrong message subtype ${msg.subtype})`);
        return;
      }

      if (msg.text === undefined) {
        app.log.v('no need to process this (empty message)');
        return;
      }
      // replace to avoid extra data in id like %22requestId%22:%22mApi:7260
      let foundRequestId = msg.text.replace(new RegExp('%22', 'g'), '"').match(new RegExp(config.kibana.myKey, 'i'));
      if (foundRequestId !== null) {
        foundRequestId = foundRequestId[0];
        app.log.v(`Found key in message: ${foundRequestId}`);
      }

      if (msg.attachments != null && msg.attachments[0] != null && msg.attachments[0].text != null && foundRequestId === null) {
        // replace to avoid extra data in id like %22requestId%22:%22mApi:7260
        foundRequestId = msg.attachments[0].text.replace(new RegExp('%22', 'g'), '"').match(new RegExp(config.kibana.myKey, 'i'));
        if (foundRequestId !== null) {
          foundRequestId = foundRequestId[0];
          app.log.v(`Found key in attachment: ${foundRequestId}`);
        }
      }

      if ((foundRequestId === null) && (msg.channel[0] !== 'D') && (msg.text.indexOf(config.slack.id) === -1)) {
        app.log.v('not message for me (no my id, no found request IDs, not direct)');
        return;
      }
      const query  = foundRequestId || msg.text;


      const chatId = msg.channel;
      app.log.i(`Processing ${chatId}: ${query}`);

      const timerId = setInterval(()=> {
        try {
          bot.ws.send(JSON.stringify({type: 'typing', channel: chatId}));
        } catch (e) {
          app.log.e(e);
        }
      });

      processText(query, app.log)
        .then((data) => {
          let text = '';
          if (!data || !data.count || data.count === 0 || !data.data || data.data === '[]') {
            text = `По запросу *${query}* ничего не нашлось за последние ${config.kibana.searchFor} часов :(`;
            app.log.i(`Nothing found for ${query}`);
            bot.postMessage(chatId, text, {as_user: true});
            return false;
          }
          text = `${data.count} результатов найдено по запросу *${query}*  за последние ${config.kibana.searchFor} часов`;
          app.log.i(`${data.count} results found for ${query}`);
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
           }; */
          const tempFileName = `tmp/${uuid()}.json`;
          return fs.writeFile(tempFileName, data.data)
            .then(()=> new Promise((resolve, reject)=> {
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
                  app.log.e('Error uploading file to slack: ', err);
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
          app.log.e(err);
          bot.postMessage(chatId, `Ошибка: ${errShort}`, {as_user: true});
        })
        .finally(()=> {
          clearInterval(timerId);
        });
    });
  }
}
module.exports = SlackBot;
