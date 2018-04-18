'use strict'

/**
 * 设置任务重复执行的时间间隔
 * 
 * @param {String} interval 每interval执行一次任务
 * @param {Object} options  执行任务的选项
 * @returns {exports}       Instance of Job
 */
module.exports = function (interval, options) {
  options = options || {}
  this.attrs.repeatInterval = interval
  this.attrs.repeatTimezone = options.timezone ? options.timezone : null
  return this
}
