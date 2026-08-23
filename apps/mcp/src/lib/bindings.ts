// apps/mcpはD1を一切扱わず、コンテンツ操作はすべてapps/apiへの
// Service Binding経由HTTP呼び出しに委譲する（実装計画5章）。
export type Bindings = {
  API: Fetcher;
};
