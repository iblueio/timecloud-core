'use strict'
const debug = require('debug')('timecloud:job')

/**
 * 任务失败, 记录错误信息
 * 
 * @param {Error|String} reason 任务失败信息
 * @returns {exports}           Instance of Job
 */
module.exports = function (reason) {
  if (reason instanceof Error) {
    reason = reason.message
  }
  this.attrs.failReason = reason
  this.attrs.failCount = (this.attrs.failCount || 0) + 1
  const now = new Date()
  this.attrs.failedAt = now
  this.attrs.lastFinishedAt = now
  debug('[%s:%s] fail() called [%d] times so far', this.attrs.name, this.attrs._id, this.attrs.failCount)
  return this
}
