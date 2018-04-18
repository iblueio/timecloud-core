'use strict'
const debug = require('debug')('timecloud:job')

/**
 * 执行任务
 * 使用setImmediate来异步执行任务, 
 * 1. 更改lastRunAt字段为当前时间, 然后计算下次运行时间, 并同步到数据库
 * 2. 开始执行任务并设定回调函数
 * 3. 通过回调函数来判断任务运行是否出现了错误
 * 4. 如果没有出现错误, 则发动success事件
 * 5. 如果有出现错误, 则发动fail事件
 * 6. 最后统一更新lastFinishedAt字段并设lockedAt为null，发动complete事件
 * 
 * @param {Function} cb     Callback
 * @returns {undefined}
 */
module.exports = function (cb) {
  const self = this
  const core = self.core
  const definition = core._definitions[self.attrs.name]

  setImmediate(() => {
    self.attrs.lastRunAt = new Date()
    debug('[%s:%s] setting lastRunAt to: %s', self.attrs.name, self.attrs._id, self.attrs.lastRunAt.toISOString())
    self.computeNextRunAt()
    self.save(() => {
      // 设定任务执行完毕后的回调函数, 对外来说这里是done()函数
      const jobCallback = function (err) {
        if (err) {
          self.fail(err)
        }

        if (!err) {
          self.attrs.lastFinishedAt = new Date()
        }
        self.attrs.lockedAt = null
        debug('[%s:%s] job finished at [%s] and was unlocked', self.attrs.name, self.attrs._id, self.attrs.lastFinishedAt)

        self.save((saveErr, job) => {
          cb && cb(err || saveErr, job)  // eslint-disable-line no-unused-expressions
          if (err) {
            core.emit('fail', err, self)
            core.emit('fail:' + self.attrs.name, err, self)
            debug('[%s:%s] failed to be saved to MongoDB', self.attrs.name, self.attrs._id)
          } else {
            core.emit('success', self)
            core.emit('success:' + self.attrs.name, self)
            debug('[%s:%s] was saved successfully to MongoDB', self.attrs.name, self.attrs._id)
          }
          core.emit('complete', self)
          core.emit('complete:' + self.attrs.name, self)
          debug('[%s:%s] job has finished', self.attrs.name, self.attrs._id)
        })
      }

      try {
        core.emit('start', self)
        core.emit('start:' + self.attrs.name, self)
        debug('[%s:%s] starting job', self.attrs.name, self.attrs._id)
        if (!definition) {
          debug('[%s:%s] has no definition, can not run', self.attrs.name, self.attrs._id)
          throw new Error('Undefined job')
        }
        if (definition.fn.length === 2) {
          debug('[%s:%s] process function being called', self.attrs.name, self.attrs._id)
          definition.fn(self, jobCallback)
        } else {
          debug('[%s:%s] process function being called', self.attrs.name, self.attrs._id)
          definition.fn(self)
          jobCallback()
        }
      } catch (err) {
        debug('[%s:%s] unknown error occurred', self.attrs.name, self.attrs._id)
        jobCallback(err)
      }
    })
  })
}
