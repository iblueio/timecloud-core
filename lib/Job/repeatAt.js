'use strict'

/**
 * 指定任务在指定的时刻运行
 * 
 * @param {String} time 指定时刻
 * @returns {exports}   Instance of Job
 */
module.exports = function (time) {
  this.attrs.repeatAt = time
  return this
}
