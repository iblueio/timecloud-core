'use strict'
const debug = require('debug')('timecloud:defaultLockLifetime')

/**
 * 设置每个任务最多能被lock多长时间，单位是ms
 * 
 * @param {Number} ms
 * @returns {exports}
 */
module.exports = function (ms) {
  debug('Timecloud.defaultLockLifetime(%d)', ms)
  this._defaultLockLifetime = ms
  return this
}
