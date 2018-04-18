'use strict'
const date = require('date.js')

/**
 * 设定任务的执行周期在指定时刻
 * 
 * @param {String} time   标记任务重复执行的时刻
 * @returns {exports}     Instance of Job
 */
module.exports = function (time) {
  this.attrs.nextRunAt = (time instanceof Date) ? time : date(time)
  return this
}
