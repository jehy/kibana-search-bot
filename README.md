# Kibana Search Slack Bot

[![Build Status](https://travis-ci.org/jehy/kibana-search-slack-bot.svg?branch=master)](https://travis-ci.org/jehy/kibana-search-slack-bot)
[![dependencies Status](https://david-dm.org/jehy/kibana-search-slack-bot/status.svg)](https://david-dm.org/jehy/kibana-search-slack-bot)
[![devDependencies Status](https://david-dm.org/jehy/kibana-search-slack-bot/dev-status.svg)](https://david-dm.org/jehy/kibana-search-slack-bot?type=dev)

## Installation
```bash
npm install git+ssh://git@github.com:jehy/kibana-search-slack-bot.git
```

## Usage
**config.json**
```json
{
  "slack": {
    "token": "YOUR_SLACK_BOT_TOKEN",
    "name": "Somebot",
    "id": "<@U5***5M7A>",
    "channel": "D5***SJ7Q"
  },
  "kibana": {
    "cookie": "_ym_uid=148******97461*961; _ga=GA1.2.6**3239.1484***77",
    "url": "https://kibana.someserver.ru",
    "searchFor": 21600000
  }
}
```