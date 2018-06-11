import { context } from './types';

import {
  Jira,
  Dict,
} from '../';
import https from 'https';

jest.mock('https');
let responseStatus: number = 902;
let responseBody: Dict<any> = {};
let requestString: string = '';

const requestMock = function (options, cb) {
  requestString += `${options.method} ${options.protocol}//`;
  if (options.auth) requestString += `${options.auth}@`;
  requestString += options.hostname;
  if (options.port) requestString += `:${options.port}`;
  requestString += options.path;
  const callbacks: Dict<any> = {};
  cb({
    on(event, cb) {
      callbacks[event] = cb;
    },
    statusCode: responseStatus,
  })
  this.write = (str) => {
    requestString += `\n${str}`;
  };
  this.end = () => {
    if (callbacks.data) {
      callbacks.data(JSON.stringify(responseBody));
    }
  }
  return this;
};

/// @ts-ignore
https.request.mockImplementation(requestMock);

beforeEach(() => {
  responseStatus = 902;
  responseBody = {};
  requestString = '';
});

