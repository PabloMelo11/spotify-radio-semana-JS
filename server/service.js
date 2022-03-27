import fs from 'fs';
import fsPromise from 'fs/promises';
import path, { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { PassThrough, Writable } from 'stream';
import streamPromises from 'stream/promises';
import childProcess from 'child_process';
import { once } from 'events';

import Throttle from 'throttle';

import config from './config.js';
import { logger } from './util.js';

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = config.constants.englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();

    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream,
    };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return childProcess.spawn('sox', args);
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          // se o client desconectou, nao devemos enviar os dados
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk);
        }

        cb();
      },
    });
  }

  async startStreaming() {
    logger.info(`starting with ${this.currentSong}`);

    const bitRate = (this.currentBitRate =
      (await this.getBitRate(this.currentSong)) /
      config.constants.bitRateDivisor);

    const throttleTransform = (this.throttleTransform = new Throttle(bitRate));

    const songReadable = (this.currentReadable = this.createFileStream(
      this.currentSong
    ));

    return streamPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadCast()
    );
  }

  async stopStreaming() {
    this.throttleTransform?.end?.();
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i', // info
        '-B', // bitrate
        song,
      ];

      const {
        stderr, // tudo que e erro (stream)
        stdout, // tudo que e log (stream)
        // stdin, // envia dados (stream)
      } = this._executeSoxCommand(args);

      await Promise.all([once(stdout, 'readable'), once(stderr, 'readable')]);

      const [success, error] = [stdout, stderr].map((stream) => stream.read());

      if (error) {
        return await Promise.reject(error);
      }

      return success.toString().trim().replace(/k/, '000');
    } catch (err) {
      logger.error(`Deu ruim no bitrate: ${error}`);
      return config.constants.fallbackBitRate;
    }
  }

  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    const fullFilePath = join(config.dir.publicDirectory, file);

    await fsPromise.access(fullFilePath);

    const fileType = extname(fullFilePath);

    return { type: fileType, name: fullFilePath };
  }

  async getFileStream(file) {
    const { name, type } = await this.getFileInfo(file);

    return {
      stream: this.createFileStream(name),
      type,
    };
  }

  async readFxByName(fxName) {
    const songs = await fsPromise.readdir(config.dir.fxDirectory);

    const chosenSong = songs.find((filename) =>
      filename.toLowerCase().includes(fxName)
    );

    if (!chosenSong) {
      return Promise.reject(`the song ${fxName} wasn't found!`);
    }

    return path.join(config.dir.fxDirectory, chosenSong);
  }

  appendFxStream(fx) {
    const throttleTransformable = new Throttle(this.currentBitRate);

    streamPromises.pipeline(throttleTransformable, this.broadCast());

    const unpipe = () => {
      const transformStream = this.mergeAudioStream(fx, this.currentReadable);
      this.throttleTransform = throttleTransformable;
      this.currentReadable = transformStream;
      this.currentReadable.removeListener('unpipe', unpipe);

      streamPromises.pipeline(transformStream, throttleTransformable);
    };

    this.throttleTransform.on('unpipe', unpipe);

    this.throttleTransform.pause();
    this.currentReadable.unpipe(this.throttleTransform);
  }

  mergeAudioStream(song, readable) {
    const transformStream = PassThrough();

    const args = [
      '-t',
      config.constants.audioMediaType,
      '-v',
      config.constants.songVolume,
      '-m',
      '-',
      '-t',
      config.constants.audioMediaType,
      '-v',
      config.constants.fxVolume,
      song,
      '-t',
      config.constants.audioMediaType,
      '-',
    ];

    const { stdout, stdin } = this._executeSoxCommand(args);

    streamPromises.pipeline(readable, stdin);

    streamPromises.pipeline(stdout, transformStream);

    return transformStream;
  }
}
