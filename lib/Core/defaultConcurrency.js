'use strict'
const debug = require('debug')('timecloud:defaultConcurrency')

/**
 * 设置每个任务的并发量数量
 * 
 * @param {Number} num
 * @returns {exports}
 */
module.exports = function (num) {
  debug('Timecloud.defaultConcurrency(%d)', num)
  this._defaultConcurrency = num
  return this
}
