'use strict'
const debug = require('debug')('timecloud:create')
const Job = require('../Job')

/**
 * 创建新任务, 实例化Job类
 * 
 * @param {String} name name of job
 * @param {Object} data data to set for job
 * @access protected
 * @returns {Job} instance of new job
 */
module.exports = function (name, data) {
  debug('Timecloud.create(%s, [Object])', name)
  const priority = this._definitions[name] ? this._definitions[name].priority : 0
  const job = new Job({name, data, type: 'normal', priority, core: this})
  return job
}
