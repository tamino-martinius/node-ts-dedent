import {
  Dict,
  JiraConfig,
  RequestMethod,
  Issue,
  Response,
  Notifiable,
  EditIssueConfig,
} from './types';
import { URL } from 'url';
import https from 'https';

export class Jira {
  private url: URL;
  private apiBaseUrl: URL;
  private username: string;
  private password: string;
  private version: string;

  constructor(config: JiraConfig) {
    this.url = new URL(config.url);
    this.username = config.username;
    this.password = config.password;
    this.version = config.version || '2';
    this.apiBaseUrl = new URL(`rest/api/${this.version}/`, this.url);
  }

  static paramsToQuery(params: Dict<any> = {}): string {
    const paramKeys: string[] = Object.keys(params).sort();
    if (paramKeys.length > 0) {
      return '?' + paramKeys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    } else {
      return '';
    }
  }

  request(method: RequestMethod, rel: string, params: Dict<any> = {}, body: Dict<any> = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      const url = new URL(rel, this.apiBaseUrl);
      const paramKeys: string[] = Object.keys(params).sort();
      url.username = this.username;
      url.password = this.password;
      const auth = url.username && url.password ? `${url.username}:${url.password}` : undefined;
      const options: https.RequestOptions = {
        hostname: url.hostname,
        protocol: url.protocol,
        port: url.port,
        path: url.pathname + Jira.paramsToQuery(params),
        auth,
        method,
      };
      // console.log(options, url.toJSON());

      const req = https.request(options, res => {
        res.on('data', buffer => resolve({
          data: JSON.parse(buffer.toString()),
          status: res.statusCode || 902,
        }));
        res.on('error', buffer => reject(JSON.parse(buffer.toString())));
      });
      const bodyKeys: string[] = Object.keys(body);
      if ((method === RequestMethod.POST || method === RequestMethod.PUT) && bodyKeys.length > 0) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async createIssue(body: Dict<any>, updateHistory: boolean = false): Promise<Issue | undefined> {
    const res = await this.request(RequestMethod.POST, `issue`, { updateHistory }, body);
    return res.status === 201 ? res.data : undefined;
  }

  async getIssue(keyOrId: string): Promise<Issue | undefined>{
    const res = await this.request(RequestMethod.GET, `issue/${keyOrId}`);
    return res.status === 200 ? res.data : undefined;
  }

  async updateIssue(keyOrId: string, body: Dict<any>, config: EditIssueConfig): Promise<boolean> {
    const res = await this.request(RequestMethod.PUT, `issue/${keyOrId}`, config, body);
    return res.status === 204;
  }

  async editIssue(keyOrId: string, body: Dict<any>, config: EditIssueConfig = {}): Promise<Issue | undefined> {
    const success = await this.updateIssue(keyOrId, body, config);
    if (success) {
      return await this.getIssue(keyOrId);
    } else {
      return undefined;
    }
  }

  async deleteIssue(keyOrId: string, deleteSubtasks: boolean = true): Promise<boolean> {
    const res = await this.request(RequestMethod.DELETE, `issue/${keyOrId}`, { deleteSubtasks });
    return res.status === 204;
  }

  async assignIssue(keyOrId: string, body: Dict<any>): Promise<boolean> {
    const res = await this.request(RequestMethod.PUT, `issue/${keyOrId}/assignee`, {}, body);
    return res.status === 204;
  }

  async addIssueAttachment(keyOrId: string, body: Dict<any>): Promise<boolean> {
    const res = await this.request(RequestMethod.POST, `issue/${keyOrId}/assignee`, {}, body);
    return res.status === 204;
  }

  async getIssueChangeLogPage(keyOrId: string, limit: number = 100, skip: number = 0): Promise<any | undefined> {
    const res = await this.request(RequestMethod.GET, `issue/${keyOrId}/changelog`, {
      maxResults: limit,
      startAt: skip,
    });
    return res.status === 200 ? res.data : undefined;
  }

  async getIssueCommentPage(keyOrId: string, limit: number = 100, skip: number = 0): Promise<any | undefined> {
    const res = await this.request(RequestMethod.GET, `issue/${keyOrId}/comment`, {
      maxResults: limit,
      startAt: skip,
      // TODO orderBy, expand https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-comment-get
    });
    return res.status === 200 ? res.data : undefined;
  }

  // TODO Add Comment https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-comment-post

  // TODO Get Comment https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-comment-id-get

  // TODO Update Comment https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-comment-id-put

  // TODO
};

export default Jira;
