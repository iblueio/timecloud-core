'use strict'
const Job = require('../Job')

/**
 * 创建一个job实例
 * 
 * @param {Object} core instance of Core
 * @param {Object} jobData job data
 * @returns {module.Job} returns created job
 */
module.exports = (core, jobData) => {
  jobData.core = core
  return new Job(jobData)
}
