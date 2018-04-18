'use strict'
const humanInterval = require('human-interval')
const CronTime = require('cron').CronTime
const moment = require('moment-timezone')
const date = require('date.js')
const debug = require('debug')('timecloud:job')

/**
 * 内部方法: 用于计算任务下次运行的时间以及定义相关值
 * 
 * @returns {exports} Job instance
 */
module.exports = function () {
  const interval = this.attrs.repeatInterval
  const timezone = this.attrs.repeatTimezone
  const repeatAt = this.attrs.repeatAt
  this.attrs.nextRunAt = undefined

  const dateForTimezone = date => {
    date = moment(date)
    if (timezone !== null) {
      date.tz(timezone)
    }
    return date
  }

  /**
   * 内部方法: 计算任务运行周期
   * 
   * @returns {undefined}
   */
  const computeFromInterval = () => {
    debug('[%s:%s] computing next run via interval [%s]', this.attrs.name, this.attrs._id, interval)
    let lastRun = this.attrs.lastRunAt || new Date()
    lastRun = dateForTimezone(lastRun)
    try {
      // 使用CronTime库来解析任务周期
      const cronTime = new CronTime(interval)
      let nextDate = cronTime._getNextDateFrom(lastRun)
      if (nextDate.valueOf() === lastRun.valueOf()) {
        nextDate = cronTime._getNextDateFrom(dateForTimezone(new Date(lastRun.valueOf() + 1000)))
      }
      this.attrs.nextRunAt = nextDate
      debug('[%s:%s] nextRunAt set to [%s]', this.attrs.name, this.attrs._id, this.attrs.nextRunAt.toISOString())
    } catch (e) {
      // 任务周期格式不符合CronTab的格式，尝试使用humanInterval解析
      try {
        if (!this.attrs.lastRunAt && humanInterval(interval)) {
          this.attrs.nextRunAt = lastRun.valueOf()
          debug('[%s:%s] nextRunAt set to [%s]', this.attrs.name, this.attrs._id, this.attrs.nextRunAt.toISOString())
        } else {
          this.attrs.nextRunAt = lastRun.valueOf() + humanInterval(interval)
          debug('[%s:%s] nextRunAt set to [%s]', this.attrs.name, this.attrs._id, this.attrs.nextRunAt.toISOString())
        }
      } catch (e) { }
    } finally {
      // 使用CronTime和humanInterval都无法解析周期字符串，任务报错
      if (isNaN(this.attrs.nextRunAt)) {
        this.attrs.nextRunAt = undefined
        debug('[%s:%s] failed to calculate nextRunAt due to invalid repeat interval', this.attrs.name, this.attrs._id)
        this.fail('failed to calculate nextRunAt due to invalid repeat interval')
      }
    }
  }

  /**
   * 内部方法: 计算任务下次运行的时间
   * 
   * @returns {undefined}
   */
  function computeFromRepeatAt() {
    const lastRun = this.attrs.lastRunAt || new Date()
    const nextDate = date(repeatAt).valueOf()

    const offset = Date.now()
    if (offset === date(repeatAt, offset).valueOf()) {
      this.attrs.nextRunAt = undefined
      debug('[%s:%s] failed to calculate repeatAt due to invalid format', this.attrs.name, this.attrs._id)
      this.fail('failed to calculate repeatAt time due to invalid format')
    } else if (nextDate.valueOf() === lastRun.valueOf()) {
      this.attrs.nextRunAt = date('tomorrow at ', repeatAt)
      debug('[%s:%s] nextRunAt set to [%s]', this.attrs.name, this.attrs._id, this.attrs.nextRunAt.toISOString())
    } else {
      this.attrs.nextRunAt = date(repeatAt)
      debug('[%s:%s] nextRunAt set to [%s]', this.attrs.name, this.attrs._id, this.attrs.nextRunAt.toISOString())
    }
  }

  if (interval) {
    computeFromInterval.call(this)
  } else if (repeatAt) {
    computeFromRepeatAt.call(this)
  }
  return this
}
