
const assert = require('chai').assert;
const createService = require('feathers-sequelize');
const feathers = require('@feathersjs/feathers');
const Sequelize = require('sequelize')
const { conversionSql } = require('../src/hooks');
const { timeoutEachTest } = require('./helpers/config');

const DataTypes = Sequelize.DataTypes;
let sequelizeClient;
let trace;

const time1 = 1541878856535;
const time1Str = '2018-11-10T19:40:56.535Z';
const time2 = 1541878856545;
const time2Str = '2018-11-10T19:40:56.545Z';

const internalRecs = [
  { email: 'a', password: 'aa', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: true,  isVerified: false, verifyExpires: time1, verifyChanges: { foo: 'bar' },
    resetExpires: time2, mfaExpires: time1, passwordHistory: [] },
  { email: 'b', password: 'bb', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: false, isVerified: true,  verifyExpires: time1, verifyChanges: { foo: 'bar' },
    resetExpires: time2, mfaExpires: null, passwordHistory: [] },
];

const sequelizeRecsIn = [
  { email: 'a', password: 'aa', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: 1, isVerified: 0, verifyExpires: time1, verifyChanges: '{"foo":"bar"}',
    resetExpires: time2, mfaExpires: time1, passwordHistory: '[]' },
  { email: 'b', password: 'bb', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: 0, isVerified: 1, verifyExpires: time1, verifyChanges: '{"foo":"bar"}',
    resetExpires: time2, mfaExpires: null, passwordHistory: '[]' },
];

const sequelizeRecsOut = [
  { email: 'a', password: 'aa', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: 1, isVerified: 0, verifyExpires: time1Str, verifyChanges: '{"foo":"bar"}',
    resetExpires: time2Str, mfaExpires: time1Str, passwordHistory: '[]' },
  { email: 'b', password: 'bb', phone: '+123', dialablePhone: '123', preferredComm: 'sms',
    verifyToken: 'abc', verifyShortToken: '123', resetToken: 'abc', resetShortToken: '123',
    mfaShortToken: '123', mfaType: 'email',
    isInvitation: 0, isVerified: 1, verifyExpires: time1Str, verifyChanges: '{"foo":"bar"}',
    resetExpires: time2Str, mfaExpires: null, passwordHistory: '[]' },
];

function tracer(name) {
  return context => {
    if (context.type === 'before') {
      trace[name] = context.data ? clone(context.data) : context.data;
    } else {
      trace[name] = context.data ? clone(context.result) : context.data;
    }
  };
}

// Tests
describe('sequelize.test.js', function () {
  this.timeout(timeoutEachTest);

  describe('converts', () => {
    let app;
    let usersService;

    beforeEach(async () => {
      app = feathers();
      app.configure(makeUsersService());
      app.setup();

      trace = {};

      usersService = app.service('users');
      await usersService.remove(null);
      await usersService.create(clone(internalRecs));
    });

    it('can create records', async () => {
      try {
        const userRecs = cleanup(await usersService.create(clone(internalRecs)));

        assert.deepEqual(cleanup(trace.beforeIn), internalRecs, 'beforeIn');
        assert.deepEqual(cleanup(trace.beforeOut), sequelizeRecsIn, 'beforeOut');
        assert.deepEqual(cleanup(trace.afterIn), sequelizeRecsOut, 'afterIn');
        assert.deepEqual(cleanup(trace.afterOut), internalRecs, 'afterOut');

        assert.deepEqual(userRecs, internalRecs, 'service call');
      } catch (err) {
        console.log(err);
        assert.strictEqual(err, null, 'err code set');
      }
    });
  });
});

// Helpers

const makeUsersService = () => function (app) {
  let Model = createUsersModel(app);

  let options = {
    name: 'users',
    Model,
    paginate:false,
  };

  app.use('/users', createService(options));

  app.service('users').hooks({
    before: {
      all: [tracer('beforeIn'), conversionSql(), tracer('beforeOut')],
    },
    after: {
      all: [tracer('afterIn'), conversionSql(), tracer('afterOut')],
    }
  });
};

function createUsersModel(app) {
  sequelize(app);

  return sequelizeClient.define('users',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      dialablePhone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      preferredComm: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isInvitation: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      isVerified: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      verifyExpires: {
        type: DataTypes.DATE
      },
      verifyToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      verifyShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      verifyChanges: {
        type: DataTypes.STRING
      },
      resetExpires: {
        type: DataTypes.DATE
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resetShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mfaExpires: {
        type: DataTypes.DATE
      },
      mfaShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mfaType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      passwordHistory: {
        type: DataTypes.STRING
      },
    },
    {
      hooks: {
        beforeCount(options) {
          options.raw = true;
        },
      },
    },
  );
}

function sequelize(app) {
  let connectionString = 'sqlite://test-data/users.sqlite';
  let sequelize = new Sequelize(connectionString, {
    dialect: 'sqlite',
    logging: false,
    define: {
      freezeTableName: true
    }
  });

  let oldSetup = app.setup;
  sequelizeClient = sequelize;

  app.setup = async function (...args) {
    let result = oldSetup.apply(this, args);

    // Set up data relationships
    const models = sequelize.models;
    Object.keys(models).forEach(name => {
      if ('associate' in models[name]) {
        models[name].associate(models);
      }
    });

    // Sync to the database
    await sequelize.sync(/* { alter: true } */);

    return result;
  };
}

function cleanup(recs) {
  return recs.map(rec => {
    delete rec.id;
    delete rec.createdAt;
    delete rec.updatedAt;

    return rec;
  });
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
