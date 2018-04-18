'use strict'

/**
 * 屏蔽任务运行, 设置disabled属性为true
 * 
 * @returns {exports}   Istance of Job
 */
module.exports = function () {
  this.attrs.disabled = true
  return this
}
