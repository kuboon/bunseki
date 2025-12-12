import lume from "lume/mod.ts";
import date from "lume/plugins/date.ts";
import jsx from "lume/plugins/jsx.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";

const site = lume();

site.use(date());
site.use(jsx());
site.use(tailwindcss());

export default site;
