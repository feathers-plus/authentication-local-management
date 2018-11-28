
const helpers = require('./helpers');
const hooks = require('./hooks');
const service = require('./service');

service.hooks = hooks;
service.helpers = helpers;

module.exports = service;
