'use strict'

/**
 * 保证每个任务是被唯一创建的
 * 
 * @param {Object} unique MongoDB标记唯一的查询条件
 * @param {Object} opts   MongoDB标记唯一的查询选项
 * @returns {exports}     Instance of Job
 */
module.exports = function (unique, opts) {
  this.attrs.unique = unique
  this.attrs.uniqueOpts = opts
  return this
}
