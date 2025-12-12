export const title = "Bunseki - Telemetry Dashboard";

interface LayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link href="/styles/styles.css" rel="stylesheet" />
      </head>
      <body>
        <div class="navbar bg-base-100 shadow-lg">
          <div class="flex-1">
            <a href="/" class="btn btn-ghost text-xl">📊 Bunseki</a>
          </div>
          <div class="flex-none">
            <ul class="menu menu-horizontal px-1">
              <li>
                <a href="/">Services</a>
              </li>
            </ul>
          </div>
        </div>
        <main class="container mx-auto p-4">
          {children}
        </main>
        <footer class="footer footer-center p-4 bg-base-300 text-base-content mt-16">
          <div>
            <p>Built with Bunseki - OTLP Telemetry Dashboard</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
