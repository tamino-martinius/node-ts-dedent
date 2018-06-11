export interface Dict<T> {
  [key: string]: T;
}

export interface Response {
  data: Dict<any>;
  status: number;
}

export interface JiraConfig {
  url: string;
  username: string;
  password: string;
  version?: string;
}

