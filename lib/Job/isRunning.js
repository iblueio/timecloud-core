'use strict'

/**
 * 判定一个任务是否正在执行
 * 判定条件: 
 * lastRunAt字段存在且lastFinishedAt字段不存在
 * lastRunAt字段存在且lastFinishedAt字段存在, 且lastRunAt字段比较新
 * 
 * @returns {boolean}
 */
module.exports = function () {
  if (!this.attrs.lastRunAt) {
    return false
  }
  if (!this.attrs.lastFinishedAt) {
    return true
  }
  if (this.attrs.lockedAt && this.attrs.lastRunAt.getTime() > this.attrs.lastFinishedAt.getTime()) {
    return true
  }
  return false
}
