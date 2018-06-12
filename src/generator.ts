import Jira from './jira';

import {
  GeneratorConfig,
} from './types';

export class Generator {
  public crawling: boolean = true;
  public page: number = 0;
  public data: any[] = [];
  public index: number = 0;
  public args: any[];
  public fn: (...args: any[]) => Promise<any>;
  public key: string;
  public pageSize: number;

  constructor(public jira: Jira, config: GeneratorConfig) {
    Object.apply(this, config);
  }

  async *iterator(): AsyncIterableIterator<any> {
    while (this.crawling) {
      const page = await this.fn.call(this.jira, ...this.args, { startsAt: this.page * this.pageSize });
      this.page += 1;
      this.crawling = this.crawling && page.total > this.page * this.pageSize;
      this.data.push(...page[this.key]);
      while (this.index < this.data.length) {
        yield this.data[this.index++];
      }
    }
    return false;
  }
}

export default Generator;
