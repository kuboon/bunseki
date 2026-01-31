export const title = "Services - Bunseki";

interface IndexProps {
  services: Array<{
    name: string;
    firstSeen: number;
    lastSeen: number;
  }>;
}

export default function Index({ services }: IndexProps) {
  return (
    <div>
      <h1 class="text-4xl font-bold mb-8">Services</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          return (
            <div
              key={service}
              class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div class="card-body">
                <h2 class="card-title">
                  {service}
                </h2>
                <div class="card-actions justify-end mt-4">
                  <a
                    href={`/dashboard/${service}/`}
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
