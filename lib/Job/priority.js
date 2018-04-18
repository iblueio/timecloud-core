'use strict'

/**
 * 内部方法: 将优先级解析为数字
 * 
 * @param {String|Number} priority
 * @returns {Number} 优先级，(数字越高代表优先级越高)
 */
const parsePriority = priority => {
  const priorityMap = {
    lowest: -20,
    low: -10,
    normal: 0,
    high: 10,
    highest: 20
  }
  if (typeof priority === 'number' || priority instanceof Number) {
    return priority
  }
  return priorityMap[priority]
}

/**
 * 设置任务的优先级
 * 
 * @param {String} priority
 * @returns {exports}     Instance of Job
 */
module.exports = function (priority) {
  this.attrs.priority = parsePriority(priority)
  return this
}
