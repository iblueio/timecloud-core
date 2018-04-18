'use strict'
const debug = require('debug')('timecloud:every')

/**
 * 运行define中定义好的任务, 并真正开始运行
 * 
 * @param {Number} interval 定时任务时间间隔
 * @param {*}      names    指定运行的任务名称(可以传入数组)
 * @param {Object} data     运行任务的入参
 * @param {Object} options  参数
 * @param {Function} cb     Callback
 * @returns {*}             Job or jobs created
 */
module.exports = function (interval, names, data, options, cb) {
  const self = this

  if (cb === undefined && typeof data === 'function') {
    cb = data
    data = undefined
  } else if (cb === undefined && typeof options === 'function') {
    cb = options
    options = undefined
  }

  /**
   * 内部方法: 创建任务并写入数据库并开始运行
   * 
   * @param {Number} interval 定时任务时间间隔
   * @param {*} name          指定运行的任务名称(可以传入数组)
   * @param {Object} data     运行任务的入参
   * @param {Object} options  参数
   * @param {Function} cb     Callback
   * @returns {module.Job}    Job or jobs created
   */
  const createJob = (interval, name, data, options, cb) => {
    const job = self.create(name, data)
    job.attrs.type = 'single'
    job.repeatEvery(interval, options)
    job.computeNextRunAt()
    job.save(cb)
    return job
  }

  /**
   * 内部方法: 将createJob变成批量接口
   * 
   * @param {Number} interval 定时任务时间间隔
   * @param {*} name          指定运行的任务名称(可以传入数组)
   * @param {Object} data     运行任务的入参
   * @param {Object} options  参数
   * @param {Function} cb     Callback
   * @returns {*}             Aarray of jobs created
   */
  const createJobs = (interval, names, data, options, cb) => {
    const results = []
    let pending = names.length
    let errored = false
    return names.map((name, i) => {
      return createJob(interval, name, data, options, (err, result) => {
        if (err) {
          if (!errored) {
            cb(err)
          }
          errored = true
          return
        }
        results[i] = result
        if (--pending === 0 && cb) {
          debug('every() -> all jobs created successfully')
          cb(null, results)
        } else {
          debug('every() -> error creating one or more of the jobs')
        }
      })
    })
  }

  if (typeof names === 'string' || names instanceof String) {
    debug('Timecloud.every(%s, %O, [Object], %O, cb)', interval, names, options)
    return createJob(interval, names, data, options, cb)
  } else if (Array.isArray(names)) {
    debug('Timecloud.every(%s, %s, [Object], %O, cb)', interval, names, options)
    return createJobs(interval, names, data, options, cb)
  }
}
