module.exports = {
    describe: global.describe,
    it: global.it,
    test: global.test,
    expect: global.expect,
    beforeEach: global.beforeEach,
    afterEach: global.afterEach,
    beforeAll: global.beforeAll,
    afterAll: global.afterAll,
    jest: global.jest,
    mock: global.jest?.fn,
    spyOn: jest.spyOn,
};