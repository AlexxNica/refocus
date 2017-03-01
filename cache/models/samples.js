/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/models/samples.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../../api/v1/helpers/nouns/samples');
const u = require('../../api/v1/helpers/verbs/utils');
const httpStatus = require('../../api/v1/constants').httpStatus;
const sampleStore = require('../sampleStore');
const redisClient = require('../redisCache').client.sampleStore;
const constants = sampleStore.constants;
const apiConstants = require('../../api/v1/constants');
const defaults = require('../../config').api.defaults;
const redisErrors = require('../redisErrors');
const ZERO = 0;
const ONE = 1;

function propComparator(prop) {
  return (a, b) => a[prop] - b[prop];
}

function getCustomAttrCommand(attrsToFilter, sampleKey) {
  const command = [
    'hmget',
    sampleKey,
  ];

  attrsToFilter.forEach((attr) => {
    command.push(attr);
  });
  return command;
}

/**
 * [getOptionsFromReq description]
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
function getOptionsFromReq(params) {
  // eg. ?fields=x,y,z. Adds as opts.attributes = [array of fields]
  // id is always included
  const opts = u.buildFieldList(params);

  // Specify the sort order. If defaultOrder is defined in props or sort value
  // then update sort order otherwise take value from model defination
  if ((params.sort && params.sort.value) || helper.defaultOrder) {
    opts.order = params.sort.value || helper.defaultOrder;
  }

  // handle limit
  if (params.limit && params.limit.value) {
    opts.limit = parseInt(params.limit.value, defaults.limit);
  }

  // handle offset
  if (params.offset && params.offset.value) {
    opts.offset = parseInt(params.offset.value, defaults.offset);
  }

  const filter = {};
  const keys = Object.keys(params);

  for (let i = ZERO; i < keys.length; i++) {
    const key = keys[i];
    const isFilterField = apiConstants.NOT_FILTER_FIELDS.indexOf(key) < ZERO;
    if (isFilterField && params[key].value !== undefined) {
      filter[key] = params[key].value;
    }
  }

  // in case of get by id, default param  key -> {name of sample} is present
  // hence, filter: { key: '___Subject1.___Subject3|___Aspect1' } }
  if (Object.keys(filter).length !== 0 && filter.constructor === Object) {
    opts.filter = filter;
  }

  console.log(opts);
  return opts;
}


/**
 * Convert array strings to Json for sample and aspect, then attach aspect to
 * sample.
 * @param  {Object} sampleObj - Sample object from redis
 * @param  {Object} aspectObj - Aspect object from redis
 * @param  {String} method - Request method
 * @returns {Object} - Sample object with aspect attached
 */
function cleanAddAspectToSample(sampleObj, aspectObj, method) {
  if (!sampleObj || !aspectObj) {
    throw new redisErrors.ResourceNotFoundError({
      explanation: 'Sample or Aspect not present in Redis',
    });
  }

  let sampleRes = {};
  sampleRes = sampleStore.arrayStringsToJson(
    sampleObj, constants.fieldsToStringify.sample
  );

  const aspect = sampleStore.arrayStringsToJson(
    aspectObj, constants.fieldsToStringify.aspect
  );

  sampleRes.aspect = aspect;

  // add api links
  sampleRes.apiLinks = u.getApiLinks(
    sampleRes.name, helper, method
  );

  return sampleRes;
}

function applyLimitAndOffset(opts, sampArr) {
  let startIndex = 0;
  let endIndex = sampArr.length;
  if (opts.offset) {
    startIndex = opts.offset;
  }

  if (opts.limit) {
    endIndex = startIndex + opts.limit;
  }

  // apply limit and offset, default 0 to length
  return sampArr.slice(startIndex, endIndex);
}

/**
 * [filterByFieldWildCardExpr description]
 * @param  {[type]}  sampArr - Array of sample keys or sample objects
 * @param  {[type]}  propVal   [description]
 * @param  {Boolean} isArrObjs [description]
 * @return {[type]}            [description]
 */
function filterByFieldWildCardExpr(sampArr, propVal) {
  const re = new RegExp(propVal.toLowerCase(), 'g');
  return sampArr.filter((samp) => {
    let sampName;

    // array of sample objects
    if (samp.name) {
      sampName = samp.name;
    } else { // array of sample keys
      sampName = sampleStore.getNameFromKey(samp);
    }

    return re.test(sampName);
  });
}

module.exports = {

  /**
   * Retrieves the sample from redis and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSampleFromRedis(req, res, next) {
    const opts = getOptionsFromReq(req.swagger.params);
    const resultObj = { reqStartTime: new Date() }; // for logging
    const sampleName = req.swagger.params.key.value.toLowerCase();
    const aspectName = sampleName.split('|')[ONE];
    const commands = [];

    // get sample
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.sample, sampleName),
    ]);

    // get aspect
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.aspect, aspectName),
    ]);

    redisClient.batch(commands).execAsync()
    .then((responses) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime; // log db time
      const sample = responses[ZERO];

      // apply field list filter
      if (opts.attributes) {
        Object.keys(sample).forEach((sampField) => {
          if (!opts.attributes[sampField]) {
            delete sample[sampField];
          }
        });
      }

      const aspect = responses[ONE];

      // clean and attach aspect to sample
      const sampleRes = cleanAddAspectToSample(
        sample, aspect, res.method
      );

      u.logAPI(req, resultObj, sampleRes); // audit log
      res.status(httpStatus.OK).json(sampleRes);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * Finds zero or more samples from redis and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findSamplesFromRedis(req, res, next) {
    const opts = getOptionsFromReq(req.swagger.params);
    const resultObj = { reqStartTime: new Date() }; // for logging
    const sampleCmds = [];
    const aspectCmds = [];
    const response = [];

    // get all Samples sorted lexicographically
    redisClient.sortAsync(constants.indexKey.sample, 'alpha')
    .then((allSampKeys) => {
      let sampKeys;

      // apply limit and offset if no sort order defined
      if (!opts.order) {
        sampKeys = applyLimitAndOffset(opts, allSampKeys);
      }
     
      // apply wildcard expr on name, if specified
      if (opts.filter && opts.filter.name) {
        const filteredKeys = filterByFieldWildCardExpr(
          sampKeys, opts.filter.name
        );
        sampKeys = filteredKeys;
      }

      // add to commands
      sampKeys.forEach((sampKey) => {
        sampleCmds.push(['hgetall', sampKey]); // get sample
      });

      // get all aspect names
      return redisClient.smembersAsync(constants.indexKey.aspect);
    })
    .then((allAspectKeys) => {
      // add to commands to get aspect
      allAspectKeys.forEach((aspectName) => {
        aspectCmds.push(
          ['hgetall', aspectName]
        );
      });

      // get all samples and aspects
      return Promise.all([
        redisClient.batch(sampleCmds).execAsync(),
        redisClient.batch(aspectCmds).execAsync(),
      ]);
    })
    .then((sampleAndAspects) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime; // log db time
      const samples = sampleAndAspects[ZERO];
      const aspects = sampleAndAspects[ONE];
      let filteredSamples;

      // apply wildcard expr if other than name because
      // name filter was applied before redis call
      if (opts.filter) {
        const filterOptions = opts.filter;
        Object.keys(filterOptions).forEach((field) => {
          if (field !== 'name') {
            const filteredKeys = filterByFieldWildCardExpr(
              samples, filterOptions[field]
            );
            filteredSamples = filteredKeys;
          }
        });
      }

      // sort and apply limits to samples
      if (opts.order) {
        // sort by first value in sort query param
        const compare = propComparator(opts.order[ZERO]);
        filteredSamples.sort(compare);

        const slicedSampObjs = applyLimitAndOffset(opts, filteredSamples);
        filteredSamples = slicedSampObjs;
      }

      // apply field list filter
      if (opts.attributes) {
        filteredSamples.forEach((sample) => {
          Object.keys(sample).forEach((sampField) => {
            if (!opts.attributes[sampField]) {
              delete sample[sampField];
            }
          });

          // find aspect in aspect response
          const sampleAspect = aspects.find((aspect) =>
            aspect.name === sample.split('|')[ONE]
          );

          // attach aspect to sample
          const resSampAsp = cleanAddAspectToSample(
            sample, sampleAspect, res.method
          );
          response.push(resSampAsp); // add sample to response
        });
      }
    })
    .then(() => {
      u.logAPI(req, resultObj, response); // audit log
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
};
