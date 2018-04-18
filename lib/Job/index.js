'use strict'

/**
 * 内部方法: 将任务优先级解析为数字
 * 
 * @param {String|Number} priority  优先级字符串或数字
 * @returns {Number}                优先级(越高代表优先级越高)
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

class Job {
  constructor(args) {
    args = args || {}

    // 传入core
    this.core = args.core
    delete args.core

    // 设定任务优先级
    args.priority = parsePriority(args.priority) || 0

    // 设定参数
    const attrs = {}
    for (const key in args) {
      if ({}.hasOwnProperty.call(args, key)) {
        attrs[key] = args[key]
      }
    }

    // 设置任务默认值
    attrs.nextRunAt = attrs.nextRunAt || new Date()
    attrs.type = attrs.type || 'once'
    this.attrs = attrs
  }
}

Job.prototype.toJSON = require('./toJson')
Job.prototype.computeNextRunAt = require('./computeNextRunAt')
Job.prototype.repeatEvery = require('./repeatEvery')
Job.prototype.repeatAt = require('./repeatAt')
Job.prototype.disable = require('./disable')
Job.prototype.enable = require('./enable')
Job.prototype.unique = require('./unique')
Job.prototype.schedule = require('./schedule')
Job.prototype.priority = require('./priority')
Job.prototype.fail = require('./fail')
Job.prototype.run = require('./run')
Job.prototype.isRunning = require('./isRunning')
Job.prototype.save = require('./save')
Job.prototype.remove = require('./remove')
Job.prototype.touch = require('./touch')

module.exports = Job
