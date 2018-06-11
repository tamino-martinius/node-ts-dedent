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

describe('Jira', () => {
  let url = 'https://example.com';
  let username = 'foo';
  let password = 'bar';

  const getJira = () => new Jira({ url, username, password });

  describe('#getIssue', () => {
    let issueKey = 'JIRA-1234';
    const subject = () => getJira().getIssue(issueKey);
    context('when issue is found', {
      definitions() {
        responseStatus = 200;
        responseBody = { key: issueKey };
      },
      tests() {
        it('returns issue', async () => {
          const issue = await subject()
          expect(issue).toEqual(responseBody);
        });
      },
    });

    context('when issue is not found', {
      definitions() {
        responseStatus = 404;
      },
      tests() {
        it('returns undefined', async () => {
          const issue = await subject()
          expect(issue).toBeUndefined();
        });
      },
    });
  })
});

