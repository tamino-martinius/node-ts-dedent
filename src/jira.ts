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

};

export default Jira;
