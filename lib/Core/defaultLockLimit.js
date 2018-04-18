'use strict'
const debug = require('debug')('timecloud:defaultLockLimit')

/**
 * 当任务运行时会进入lock状态，设置同一个任务在同一时间最多能被lock几个
 * 
 * @param {Number} num
 * @returns {exports}
 */
module.exports = function (num) {
  debug('Timecloud.defaultLockLimit(%d)', num)
  this._defaultLockLimit = num
  return this
}
