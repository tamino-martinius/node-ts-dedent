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

};

export default Jira;
