export interface Dict<T> {
  [key: string]: T;
}

export interface Response {
  data: Dict<any>;
  status: number;
}

