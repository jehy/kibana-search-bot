# Kibana Search Slack Bot

[![Build Status](https://travis-ci.org/jehy/kibana-search-slack-bot.svg?branch=master)](https://travis-ci.org/jehy/kibana-search-slack-bot)
[![dependencies Status](https://david-dm.org/jehy/kibana-search-slack-bot/status.svg)](https://david-dm.org/jehy/kibana-search-slack-bot)
[![devDependencies Status](https://david-dm.org/jehy/kibana-search-slack-bot/dev-status.svg)](https://david-dm.org/jehy/kibana-search-slack-bot?type=dev)

If you have access to kibana but don't have access to elastic search, you can use this
bot for simple access to data via slack.

![Dashboard looks liek this](search.png?raw=true "Dashboard")

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
    "cookie": "some important cookie data",
    "url": "https://kibana.someserver.ru",
    "searchFor": 6,
    "preference": 1493389129744,
    "version": "4.5.0"
  }
}
```