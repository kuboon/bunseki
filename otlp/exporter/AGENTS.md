otel-standard SKILL を参考に、標準仕様に可能な限り準拠する。

# collector

OTLP/HTTP/JSON の Collector 実装。
trace では span と event を保存する。特に、Error trace がメイン。

- [ ] source-map を展開する
- [ ] https://github.com/csnover/TraceKit

# exporter

勝手に instrument はしない。ユーザが明示的に span を作成して、exporter に渡す形を想定。
browser 用と server 用を分ける。
