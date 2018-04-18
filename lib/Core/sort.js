'use strict'
const debug = require('debug')('timecloud:sort')

/**
 * 设置排序查询条件用来寻找下一个要执行的任务
 * 
 * default: { nextRunAt: 1, priority: -1 }
 * 
 * @param {Object} query
 * @returns {exports}
 */
module.exports = function (query) {
  debug('Timecloud.sort([Object])')
  this._sort = query
  return this
}
