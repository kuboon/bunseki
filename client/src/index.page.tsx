export const title = "Services - Bunseki";

export default function Index() {
  return (
    <div>
      <h1 class="text-4xl font-bold mb-8">Services</h1>

      <div id="services-container">
        <div
          id="services-grid"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div class="col-span-full text-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        </div>

        <div class="mt-8 stats shadow w-full">
          <div class="stat">
            <div class="stat-title">Total Services</div>
            <div id="total-services" class="stat-value">-</div>
          </div>
          <div class="stat">
            <div class="stat-title">Active (Last Hour)</div>
            <div id="active-services" class="stat-value text-success">-</div>
          </div>
        </div>
      </div>

      <script type="module" src="/index.js"></script>
    </div>
  );
}
