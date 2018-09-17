/**
 * logRotate module - allows rotating logs on SIGHUP
 * @module logRotate
 */

const
  LogWriter = require('logfox');


const Promise   = require('bluebird');


module.exports = function (app, config) {
  process.on('SIGHUP', () => {
    const logWriterNew = new LogWriter(config.Logging);
    logWriterNew.start();
    logWriterNew.on('fatal', () => {
      if (app.terminate) {
        app.terminate();
      } else {
        process.exit(1);
      }
    });

    logWriterNew.on('started', () => {
      const logWriterOld = app.logWriter;
      app.logWriter = logWriterNew;
      app.log = app.logWriter.getLogger();
      Promise.resolve()
        .timeout(1000 * 60 * 20)
        .then(() => {
          logWriterOld.stop();
        });
    });
  });
};
