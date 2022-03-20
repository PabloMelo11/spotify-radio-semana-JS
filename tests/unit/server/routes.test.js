import { jest, describe, test, expect, beforeEach } from '@jest/globals';

import { handler } from '../../../server/routes.js';
import config from '../../../server/config.js';
import TestUtil from '../_util/testUtil.js';

import { Controller } from '../../../server/controller.js';

describe('Suite Routes', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

  test(`GET /home - should response with ${config.pages.homeHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/home';

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    await handler(...params.values());

    expect(Controller.prototype.getFileStream).toBeCalledWith(
      config.pages.homeHTML
    );

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });

  test(`GET /controller - should response ${config.pages.controllerHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'GET';
    params.request.url = '/controller';

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValueOnce({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    await handler(...params.values());

    expect(Controller.prototype.getFileStream).toBeCalledWith(
      config.pages.controllerHTML
    );

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });

  test('GET /index.html - should response with file stream', async () => {
    const params = TestUtil.defaultHandleParams();

    const fileName = '/index.html';
    const expectedType = '.html';

    params.request.method = 'GET';
    params.request.url = fileName;

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValueOnce({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    await handler(...params.values());

    expect(Controller.prototype.getFileStream).toBeCalledWith(fileName);

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);

    expect(params.response.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': config.constants.CONTENT_TYPE[expectedType],
    });
  });

  test('GET /file.ext - should response with file stream', async () => {
    const params = TestUtil.defaultHandleParams();

    const fileName = '/file.ext';
    const expectedType = '.ext';

    params.request.method = 'GET';
    params.request.url = fileName;

    const mockFileStream = TestUtil.generateReadableStream(['data']);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValueOnce({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

    await handler(...params.values());

    expect(Controller.prototype.getFileStream).toBeCalledWith(fileName);

    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);

    expect(params.response.writeHead).not.toHaveBeenCalled();
  });

  test('POST /unknown - given an inexistent route it should response with 404', async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = 'POST';
    params.request.url = '/unknown';

    await handler(...params.values());

    expect(params.response.writeHead).toHaveBeenCalledWith(404);
    expect(params.response.end).toHaveBeenCalled();
  });

  describe('exceptions', () => {
    test('given inexistent file it should respond with 404', async () => {
      const params = TestUtil.defaultHandleParams();

      params.request.method = 'GET';
      params.request.url = '/index.png';

      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(
          new Error('Error: ENOENT no such file or directory')
        );

      await handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(404);
      expect(params.response.end).toHaveBeenCalled();
    });

    test('given an error it should respond with 500', async () => {
      const params = TestUtil.defaultHandleParams();

      params.request.method = 'GET';
      params.request.url = '/index.png';

      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(new Error('Error'));

      await handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(500);
      expect(params.response.end).toHaveBeenCalled();
    });
  });
});
