export const title = "Services - Bunseki";

interface IndexProps {
  services: Array<{
    name: string;
    firstSeen: number;
    lastSeen: number;
  }>;
}

export default function Index({ services }: IndexProps) {
  if (!services || services.length === 0) {
    return (
      <div class="hero min-h-[60vh]">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <h1 class="text-5xl font-bold">Welcome to Bunseki</h1>
            <p class="py-6">
              No services detected yet. Start sending telemetry data to see your
              dashboards here.
            </p>
            <div class="mockup-code">
              <pre data-prefix=">"><code>import {"{"} OtlpExporter {"}"} from 'https://bunseki.kbn.one/client.js';</code></pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 class="text-4xl font-bold mb-8">Services</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const lastSeenDate = new Date(service.lastSeen);
          const firstSeenDate = new Date(service.firstSeen);
          const now = Date.now();
          const hoursSinceLastSeen = Math.floor(
            (now - service.lastSeen) / (1000 * 60 * 60),
          );

          return (
            <div
              key={service.name}
              class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div class="card-body">
                <h2 class="card-title">
                  {service.name}
                  {hoursSinceLastSeen < 1 && (
                    <div class="badge badge-success">Active</div>
                  )}
                </h2>
                <div class="text-sm opacity-70">
                  <p>First seen: {firstSeenDate.toLocaleDateString()}</p>
                  <p>Last seen: {lastSeenDate.toLocaleString()}</p>
                  {hoursSinceLastSeen >= 1 && (
                    <p class="text-warning">{hoursSinceLastSeen}h ago</p>
                  )}
                </div>
                <div class="card-actions justify-end mt-4">
                  <a
                    href={`/dashboard/${service.name}/`}
                    class="btn btn-primary btn-sm"
                  >
                    View Dashboard →
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div class="mt-8 stats shadow w-full">
        <div class="stat">
          <div class="stat-title">Total Services</div>
          <div class="stat-value">{services.length}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Active (Last Hour)</div>
          <div class="stat-value text-success">
            {services.filter((s) => (Date.now() - s.lastSeen) < 3600000).length}
          </div>
        </div>
      </div>
    </div>
  );
}
