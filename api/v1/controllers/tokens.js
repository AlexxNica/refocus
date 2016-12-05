/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/tokens.js
 */
'use strict';

const helper = require('../helpers/nouns/tokens');
const apiErrors = require('../apiErrors');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;

module.exports = {

  /**
   * DELETE /tokens/{key}
   *
   * Deletes the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // deleteToken(req, res, next) {
  //   doDelete(req, res, next, helper);
  // },

  /**
   * GET /tokens
   *
   * Finds zero or more token metadata records and sends them back in the
   * response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // findTokens(req, res, next) {
  //   doFind(req, res, next, helper);
  // },

  /**
   * GET /tokens/{key}
   *
   * Retrieves the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getTokenByKey(req, res, next) {
    /*
     * Not using the doGet helper function here because for this endpoint we
     * only want to find by id (no fallback to find by name).
     */
    const key = req.swagger.params.key.value;
    helper.model.findById(key)
    .then((o) => {
      if (o) {
        res.status(httpStatus.OK).json(u.responsify(o, helper, req.method));
      } else {
        const err = new apiErrors.ResourceNotFoundError();
        err.resource = helper.modelName;
        err.key = key;
        throw err;
      }
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * PATCH /aspects/{key}
   *
   * Updates the aspect and sends it back in the response. PATCH will only
   * update the attributes of the aspect provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // patchAspect(req, res, next) {
  //   doPatch(req, res, next, helper);
  // },

  /**
   * POST /aspects
   *
   * Creates a new aspect and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // postAspect(req, res, next) {
  //   doPost(req, res, next, helper);
  // },

  /**
   * PUT /aspects/{key}
   *
   * Updates an aspect and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // putAspect(req, res, next) {
  //   doPut(req, res, next, helper);
  // },

  /**
   * DELETE /v1/aspects/{key}/tags/
   * DELETE /v1/aspects/{key}/tags/{tagName}
   *
   * Deletes specified/all tags from the aspect and sends updated aspect in the
   * response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // deleteAspectTags(req, res, next) {
  //   const params = req.swagger.params;
  //   u.findByKey(helper, params)
  //   .then((o) => {
  //     let updatedTagArray = [];
  //     if (params.tagName) {
  //       updatedTagArray =
  //         u.deleteArrayElement(o.tags, params.tagName.value);
  //     }

  //     return o.update({ tags: updatedTagArray });
  //   })
  //   .then((o) => {
  //     const retval = u.responsify(o, helper, req.method);
  //     res.status(httpStatus.OK).json(retval);
  //   })
  //   .catch((err) => u.handleError(next, err, helper.modelName));
  // },

  /**
   * DELETE /v1/aspects/{key}/relatedLinks/
   * DELETE /v1/aspects/{key}/relatedLinks/{relName}
   *
   * Deletes specified/all related Links from the aspect and sends updated
   * aspect in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  // deleteAspectRelatedLinks(req, res, next) {
  //   const params = req.swagger.params;
  //   u.findByKey(helper, params)
  //   .then((o) => {
  //     let jsonData = [];
  //     if (params.relName) {
  //       jsonData =
  //         u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
  //     }

  //     return o.update({ relatedLinks: jsonData });
  //   })
  //   .then((o) => {
  //     const retval = u.responsify(o, helper, req.method);
  //     res.status(httpStatus.OK).json(retval);
  //   })
  //   .catch((err) => u.handleError(next, err, helper.modelName));
  // },

}; // exports