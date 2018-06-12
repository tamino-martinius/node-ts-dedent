import { context } from './types';

import {
  Jira,
  Dict,
} from '../';
import https from 'https';
import dedent from '../dedent';

jest.mock('https');
let responseStatus: number = 902;
let responseBody: Dict<any> = {};
let requestString: string = '';
let curlString: string = '';

const requestMock = function (options, cb) {
  let url = `${options.protocol}//`;
  if (options.auth) url += `${options.auth}@`;
  url += options.hostname;
  if (options.port) url += `:${options.port}`;
  url += options.path;
  curlString += `curl --request ${options.method} --url '${url}' --header 'Content-Type: application/json' --header 'Accept: application/json'`;
  requestString = `${options.method} ${url}`
  const callbacks: Dict<any> = {};
  cb({
    on(event, cb) {
      callbacks[event] = cb;
    },
    statusCode: responseStatus,
  })
  this.write = (str) => {
    requestString += `\n${str}`;
    curlString += ` --data '${str}'`;
  };
  this.end = () => {
    if (callbacks.data) {
      callbacks.data(JSON.stringify(responseBody));
      callbacks.end();
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
  curlString = '';
});

describe('Jira', () => {
  let url = 'https://example.com';
  let username = 'foo';
  let password = 'bar';

  const getJira = () => new Jira({ url, username, password });

  describe('#editIssue', () => {
    let updateHistory = false;
    let fields = {};
    let historyMetadata = undefined;
    let issueList = undefined;
    let properties = undefined;
    let transition = undefined;
    let update = undefined;
    const subject = () => getJira().createIssue({
      fields,
      historyMetadata,
      issueList,
      properties,
      transition,
      update,
    }, updateHistory);

    it('makes call to jira API', async () => {
      await subject();
      expect(requestString).toEqual(dedent`
        POST https://foo:bar@example.com/rest/api/2/issue?updateHistory=false
        {"fields":{}}
      `);
    });

    context('when issue is created', {
      definitions() {
        responseStatus = 201;
        responseBody = { key: 'JIRA-1' };
      },
      tests() {
        it('returns issue', async () => {
          const issue = await subject();
          expect(issue).toEqual(responseBody);
        });
      },
    });

    context('when issue is not created', {
      definitions() {
        responseStatus = 400;
      },
      tests() {
        it('returns undefined', async () => {
          const issue = await subject();
          expect(issue).toBeUndefined();
        });
      },
    });
  })

  describe('#getIssue', () => {
    let issueKey = 'JIRA-1234';
    const subject = () => getJira().getIssue(issueKey);

    it('makes call to jira API', async () => {
      await subject();
      expect(requestString).toEqual(
        'GET https://foo:bar@example.com/rest/api/2/issue/JIRA-1234'
      );
    });

    context('when issue is found', {
      definitions() {
        responseStatus = 200;
        responseBody = { key: issueKey };
      },
      tests() {
        it('returns issue', async () => {
          const issue = await subject();
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
          const issue = await subject();
          expect(issue).toBeUndefined();
        });
      },
    });
  })

});

