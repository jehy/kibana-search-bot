const
  config    = require('./config/config.json'),
  rp        = require('request-promise'),
  Promise   = require('bluebird'),
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.29 Safari/537.36';

function shitToJson(str) {
  return str.replace(/\/n/g, '')
    .replace(/\/r/g, '') // remove end lines
    .replace(/=>/g, ':') // replace "=>" with ":"
    .replace(/nil/g, 'null') // replace "nil" with null
    .replace(/:#<(.*?)>/g, ':"Elastic data not parsed"');// replace shit like #<BigDecimal:37e001f1,'0.557179062418385E2',15(16)>
}

function fixLogEntry(logEntry) {
  let msgData = 'no data';
  if (logEntry._source.data && logEntry._source.data[0]) {
    msgData = (logEntry._source.data[0]);
    msgData = shitToJson(msgData);
    try {
      msgData = JSON.parse(msgData);
    } catch (e) {
      msgData = `Failed to parse: ${msgData}`;
    }
    msgData.headers = 'hidden'; // too many of them and we rare need it
  }
  return {
    type: logEntry._type,
    timestamp: logEntry._source['@timestamp'],
    level: logEntry._source.level,
    message: logEntry._source['@message'],
    orderId: logEntry._source['@orderId'], // custom field
    data: msgData, // custom field
  };
}

function getIndex(queryFrom, queryTo) {
  // request current index
  const kibanaUrl = config.kibana.url;
  const headers = {
    Origin: kibanaUrl,
    'Accept-Encoding': 'none',
    'Accept-Language': 'en-US,en;q=0.8,ru;q=0.6',
    'kbn-version': config.kibana.version,
    'User-Agent': userAgent,
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json, text/plain, */*',
    Referer: `${kibanaUrl}/app/kibana`,
    Connection: 'keep-alive',
    'Save-Data': 'on',
    Cookie: config.kibana.cookie,
  };

  const dataString = {
    fields: ['@timestamp'],
    index_constraints: {
      '@timestamp': {
        max_value: {gte: queryFrom/* 1494395361553*/, format: 'epoch_millis'},
        min_value: {lte: queryTo/* 1494398961553*/, format: 'epoch_millis'},
      },
    },
  };

  const options = {
    url: `${kibanaUrl}/elasticsearch/logstash-*/_field_stats?level=indices`,
    method: 'POST',
    headers,
    json: true,
    body: dataString,
  };
  return rp(options);
}

function getData(query, queryFrom, queryTo, index) {

  const kibanaUrl = config.kibana.url;
  const headers = {
    Origin: kibanaUrl,
    'Accept-Encoding': 'none',
    'Accept-Language': 'en-US,en;q=0.8,ru;q=0.6',
    'kbn-version': config.kibana.version,
    'User-Agent': userAgent,
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json, text/plain, */*',
    Referer: `${kibanaUrl}/app/kibana?`,
    Connection: 'close',
    'Save-Data': 'on',
    Cookie: config.kibana.cookie,
  };

  const dataString1 = {index: [index], ignore_unavailable: true};
  const dataString2 = {
    size: 500,
    sort: [{'@timestamp': {order: 'desc', unmapped_type: 'boolean'}}],
    query: {
      filtered: {
        query: {query_string: {analyze_wildcard: true, query}},
        filter: {
          bool: {
            must: [{
              range: {
                '@timestamp': {
                  gte: queryFrom,
                  lte: queryTo,
                  format: 'epoch_millis',
                },
              },
            }],
            must_not: [],
          },
        },
      },
    },
    highlight: {
      pre_tags: ['@kibana-highlighted-field@'],
      post_tags: ['@/kibana-highlighted-field@'],
      fields: {'*': {}},
      require_field_match: false,
      fragment_size: 2147483647,
    },
    aggs: {
      2: {
        date_histogram: {
          field: '@timestamp',
          interval: '1m',
          time_zone: 'Asia/Baghdad',
          min_doc_count: 0,
          extended_bounds: {min: queryFrom, max: queryTo},
        },
      },
    },
    fields: ['*', '_source'],
    script_fields: {},
    fielddata_fields: ['USER_CRASH_DATE', 'USER_APP_START_DATE', '@timestamp', 'date',
      'data.transaction.date', 'data.items.date', 'data.child_transactions.date', 'data.transactions.date',
      'data.date_from', 'data.date_to', 'BUILD.VERSION.SECURITY_PATCH'],
  };
  const dataString = `${JSON.stringify(dataString1)}\r\n${JSON.stringify(dataString2)}\r\n`;
  // const dataString = Object.assign(dataString1,dataString2);
  // console.log(colors.yellow(`Request:\n${JSON.stringify(dataString1, null, 3)}\r\n${JSON.stringify(dataString2, null, 3)}\r\n`));

  const options = {
    url: `${kibanaUrl}/elasticsearch/_msearch?timeout=0&ignore_unavailable=true&preference=${config.kibana.preference}`,
    method: 'POST',
    headers,
    json: false,
    body: dataString,
  };
  // console.log(colors.yellow(JSON.stringify(options, null, 3)));
  return rp(options);
}

module.exports = (query, log)=> {
  const queryTo = Date.now();
  const queryFrom = Date.now() - config.kibana.searchFor * 3600 * 1000;// for last searchFor hours

  const userQuery = `"${query
  // .replace(/:/g, '*')
    .replace(new RegExp('"', 'g'), '')
    .replace(new RegExp("'", 'g'), '')
    .replace(/<(.*?)> /g, '').trim()}"`;// remove bot call @smth
  const indexData = getIndex(queryFrom, queryTo);

  return indexData
    .then((data)=> {
      const indexes = Object.keys(data.indices);
      log.v('indices:', indexes);
      return indexes;
    })
    // .then(indexes=> getData(userQuery, queryFrom, queryTo, indexes[0]))
    .then((indexes)=> {
      const promises = [];
      indexes.forEach((index)=> {
        promises.push(getData(userQuery, queryFrom, queryTo, index));
      });
      return Promise.all(promises)
        .then((dataArray)=> {
          let allData = [];
          dataArray.forEach((element)=> {
            let data;
            try {
              data = JSON.parse(element);
            } catch (e) {
              log.e('malformed json!', e, element);
              return;
            }
            try {
              data = data.responses[0].hits.hits;
            } catch (e) { // data has no... data
              log.e('No hits.hits:', data);
              return;
            }
            data = data.map(fixLogEntry);
            allData = allData.concat(data);
          });
          return allData;
        });
    })
    .then((data)=> {
      return {count: data.length, data: JSON.stringify(data, null, 3)};
    });
};
