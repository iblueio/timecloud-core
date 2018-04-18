'use strict'

/**
 * 解除任务屏蔽状态
 * 
 * @returns {exports}   Instance of Job
 */
module.exports = function () {
  this.attrs.disabled = false
  return this
}
