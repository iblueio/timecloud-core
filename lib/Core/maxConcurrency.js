'use strict'
const debug = require('debug')('timecloud:maxConcurrency')

/**
 * 设置 Timecloud 全局并发处理的最大任务数量
 * 
 * @param {Number} num
 * @returns {exports}
 */
module.exports = function (num) {
  debug('Timecloud.maxConcurrency(%d)', num)
  this._maxConcurrency = num
  return this
}
