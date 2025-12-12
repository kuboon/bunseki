import lume from "lume/mod.ts";
import date from "lume/plugins/date.ts";
import jsx from "lume/plugins/jsx.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import pagefind from "lume/plugins/pagefind.ts";

const site = lume();

site.use(date());
site.use(jsx());
site.use(tailwindcss());
site.use(pagefind());

// Copy styles
site.add("styles");

export default site;
