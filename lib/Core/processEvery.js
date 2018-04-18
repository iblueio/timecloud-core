'use strict'
const humanInterval = require('human-interval')
const debug = require('debug')('timecloud:processEvery')

/**
 * 设置 Timecloud 轮询 MongoDB 的间隔时间
 * 
 * @param {Number} time
 * @returns {exports}
 */
module.exports = function (time) {
  debug('Timecloud.processEvery(%d)', time)
  this._processEvery = humanInterval(time)
  return this
}
