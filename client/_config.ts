import lume from "lume/mod.ts";
import date from "lume/plugins/date.ts";
// import esbuild from "lume/plugins/esbuild.ts";
import jsx from "lume/plugins/jsx.ts";
import source_maps from "lume/plugins/source_maps.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import pagefind from "lume/plugins/pagefind.ts";
import { bundle } from "./_plugins/bundle.ts";

const site = lume();

site.use(date());
site.use(jsx());
site.use(bundle({ srcEntrypoints: ["client.ts"] }));
site.use(tailwindcss());
site.use(source_maps());
site.use(pagefind());

site.add("client.ts");
site.add("styles");

export default site;
