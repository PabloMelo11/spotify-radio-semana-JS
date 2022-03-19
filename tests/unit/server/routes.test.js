import { jest, describe, test, expect, beforeEach } from '@jest/globals';

import { handler } from '../../../server/routes.js';
import config from '../../../server/config.js';
import TestUtil from '../_util/testUtil.js';

describe('Suite Routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('GET / - should redirect to home page', async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/';

    await handler(...params.values());

    expect(params.response.end).toHaveBeenCalled();

    expect(params.response.writeHead).toBeCalledWith(302, {
      Location: config.location.home,
    });
  });

  test.todo(
    `GET /home - should response with ${config.pages.homeHTML} file stream`
  );

  test.todo(
    `GET /controller - should response ${config.pages.controllerHTML} file stream`
  );

  test.todo('GET /file.ext - should response with file stream');

  test.todo(
    'GET /unknown - given an inexistent route it should response with 404'
  );

  describe('exceptions', () => {
    test.todo('given inexistent file it should respond with 404');
    test.todo('given an error it should respond with 500');
  });
});
