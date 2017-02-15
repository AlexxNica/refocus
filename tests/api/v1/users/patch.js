/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/patch.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const jwtUtil = require('../../../../utils/jwtUtil');
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;

describe.only(`api: PATCH ${path}`, () => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  let profileOneId = '';
  let profileTwoId = '';
  const adminUser = require('../../../../config').db.adminUser;
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  const pname = `${tu.namePrefix}testProfile`;
  const normalUserToken = jwtUtil.createToken(
    uname, uname
  );
  const adminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );

  before((done) => {
    Profile.create({
      name: pname + ONE,
    })
    .then((profile) => {
      profileOneId = profile.id;
      return Profile.create({
        name: pname + TWO,
      })
    })
    .then((profile) => {
      profileTwoId = profile.id;
      return User.create({
        profileId: profile.id,
        name: uname,
        email: uname,
        password: 'user123password',
      })
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('admin user can change their profileId', (done) => {
    api.patch(path + '/' + adminUser.name)
    .set('Authorization', adminUserToken)
    .send({
      profileId: profileOneId,
      name: tname + uname, // TODO: should not be required
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.profileId).to.equal(profileOneId);
      done();
    });
  });

  it('user FORBIDDEN from changing their profileId', (done) => {
    api.patch(path + '/' + uname)
    .set('Authorization', normalUserToken)
    .send({
      profileId: profileOneId, // switching from profile one to two
      name: tname, // TODO: should not be required
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        expect(res.body.errors).to.have.length(ONE);
        // expect(res.body.errors[0].type).to.equal('ForbiddenError');
        done();
      }

      done(new Error('expected FORBIDDEN error'));
    });
  });
});
