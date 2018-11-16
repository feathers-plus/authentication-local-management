
const assert = require('chai').assert;
const { conversionSql } = require('../src/index').hooks;
const { timeoutEachTest } = require('./helpers/config');

const convertDatetime = {
  before: dateNow => new Date(dateNow).toISOString(),
  after: sqlDate => new Date(sqlDate).valueOf(),
};

describe('conversion-sql.test.js', function () {
  this.timeout(timeoutEachTest);
  let context;

  describe('as before hook', () => {
    let context;
    let contextArray;

    beforeEach(() => {
      context = {
        type: 'before',
        method: 'create',
        data: {
          isVerified: true,
          verifyExpires: 11111,
          verifyToken: '00000',
          verifyShortToken: '00',
          verifyChanges: { foo: 'bar', baz: 'bas' },
          resetExpires: 22222,
          resetToken: '99999',
          resetShortToken: '99',
        }
      };

      contextArray = {
        type: 'before',
        method: 'create',
        data: [
          {
            isVerified: true,
            verifyExpires: 11111,
            verifyToken: '00000',
            verifyShortToken: '00',
            verifyChanges: { foo: 'bar', baz: 'bas' },
            resetExpires: 22222,
            resetToken: '99999',
            resetShortToken: '99',
          }, {
            isVerified: false,
            verifyExpires: 11111,
            verifyToken: '00000',
            verifyShortToken: '00',
            verifyChanges: { foo: 'bar', baz: 'bas' },
            resetExpires: 22222,
            resetToken: '99999',
            resetShortToken: '99',
          }
        ],
      };
    });

    it('converts single object', () => {
      const newContext = conversionSql()(context);

      assert.deepEqual(newContext.data, {
        isVerified: 1,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: '{"foo":"bar","baz":"bas"}',
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      });
    });

    it('converts array of objects', () => {
      const newContext = conversionSql()(contextArray);

      assert.deepEqual(newContext.data, [{
        isVerified: 1,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: '{"foo":"bar","baz":"bas"}',
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }, {
        isVerified: 0,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: '{"foo":"bar","baz":"bas"}',
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }]);
    });

    it('uses datetime converter', () => {
      const newContext = conversionSql(convertDatetime)(context);

      assert.deepEqual(newContext.data, {
        isVerified: 1,
        verifyExpires: '1970-01-01T00:00:11.111Z',
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: '{"foo":"bar","baz":"bas"}',
        resetExpires: '1970-01-01T00:00:22.222Z',
        resetToken: '99999',
        resetShortToken: '99'
      });
    });

    it('respects fields to ignore', () => {
      const newContext = conversionSql(null, null, ['isVerified', 'verifyChanges'])(context);

      assert.deepEqual(newContext.data, {
        isVerified: true,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      });
    });
  });

  describe('as after hook', () => {
    let context;
    let contextISO;
    let contextArray;
    let contextPaginated;

    beforeEach(() => {
      context = {
        type: 'after',
        method: 'create',
        result: {
          isVerified: 1,
          verifyExpires: 11111,
          verifyToken: '00000',
          verifyShortToken: '00',
          verifyChanges: '{"foo":"bar","baz":"bas"}',
          resetExpires: 22222,
          resetToken: '99999',
          resetShortToken: '99',
        }
      };

      contextISO = {
        type: 'after',
        method: 'create',
        result: {
          isVerified: 1,
          verifyExpires: '1970-01-01T00:00:11.111Z',
          verifyToken: '00000',
          verifyShortToken: '00',
          verifyChanges: '{"foo":"bar","baz":"bas"}',
          resetExpires: '1970-01-01T00:00:22.222Z',
          resetToken: '99999',
          resetShortToken: '99',
        }
      };

      contextArray = {
        type: 'after',
        method: 'create',
        result: [
          {
            isVerified: 1,
            verifyExpires: 11111,
            verifyToken: '00000',
            verifyShortToken: '00',
            verifyChanges: '{"foo":"bar","baz":"bas"}',
            resetExpires: 22222,
            resetToken: '99999',
            resetShortToken: '99',
          }, {
            isVerified: 0,
            verifyExpires: 11111,
            verifyToken: '00000',
            verifyShortToken: '00',
            verifyChanges: '{"foo":"bar","baz":"bas"}',
            resetExpires: 22222,
            resetToken: '99999',
            resetShortToken: '99',
          }
        ],
      };

      contextPaginated = {
        type: 'after',
        method: 'find',
        result: {
          data: [{
              isVerified: 1,
              verifyExpires: 11111,
              verifyToken: '00000',
              verifyShortToken: '00',
              verifyChanges: '{"foo":"bar","baz":"bas"}',
              resetExpires: 22222,
              resetToken: '99999',
              resetShortToken: '99',
            }, {
              isVerified: 0,
              verifyExpires: 11111,
              verifyToken: '00000',
              verifyShortToken: '00',
              verifyChanges: '{"foo":"bar","baz":"bas"}',
              resetExpires: 22222,
              resetToken: '99999',
              resetShortToken: '99',
            }
          ],
        }
      };
    });

    it('converts single object', () => {
      const newContext = conversionSql()(context);

      assert.deepEqual(newContext.result, {
        isVerified: true,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99',
      });
    });

    it('uses datetime converter', () => {
      const newContext = conversionSql(convertDatetime)(contextISO);

      assert.deepEqual(newContext.result, {
        isVerified: true,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      });
    });

    it('converts array of objects, not paginated', () => {
      const newContext = conversionSql()(contextArray);

      assert.deepEqual(newContext.result, [{
        isVerified: true,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }, {
        isVerified: false,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }]);
    });

    it('converts array of objects, paginated', () => {
      const newContext = conversionSql()(contextPaginated);

      assert.deepEqual(newContext.result.data, [{
        isVerified: true,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }, {
        isVerified: false,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: { foo: 'bar', baz: 'bas' },
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99'
      }]);
    });

    it('respects fields to ignore', () => {
      const newContext = conversionSql(null, null, ['isVerified', 'verifyChanges'])(context);

      assert.deepEqual(newContext.result, {
        isVerified: 1,
        verifyExpires: 11111,
        verifyToken: '00000',
        verifyShortToken: '00',
        verifyChanges: '{"foo":"bar","baz":"bas"}',
        resetExpires: 22222,
        resetToken: '99999',
        resetShortToken: '99',
      });
    });
  });
});
