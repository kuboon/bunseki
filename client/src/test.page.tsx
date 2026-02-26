export const layout = false;

export default () =>
  <html>
    <head>
      <script async type="module" crossorigin="anonymous" src="https://esm.sh/jsr/@kuboon/otlp/exporter/browser"></script>
    </head>
    <body>
      <h1>Test</h1>
      <script type="module">
        hoge();
      </script>
    </body>
  </html>
