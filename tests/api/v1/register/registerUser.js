/**
 * tests/api/v1/register/registerUser.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/register';

describe(`api: registerUser`, () => {
  after(u.forceDelete);

  it('register user successfully', (done) => {
    api.post(path)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => expect(res.body.email).to.be.equal(u.toCreate.email))
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('user already exists', (done) => {
    api.post(path)
    .send(u.toCreate)
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/UniqueConstraintError/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('invalid email id', (done) => {
    api.post(path)
    .send({
      email: 'wrongEmailFormat',
      password: 'fakePasswd',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/ValidationError/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

