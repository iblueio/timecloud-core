'use strict'
const debug = require('debug')('timecloud:locklimit')

/**
 * 当任务运行时会进入lock状态, 设置全局最多能有多少个任务处于lock状态
 * 
 * @param {Number} num
 * @returns {exports}
 */
module.exports = function (num) {
  debug('Timecloud.lockLimit(%d)', num)
  this._lockLimit = num
  return this
}
