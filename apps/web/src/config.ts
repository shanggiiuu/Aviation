// Static-site build (`npm run build:static`): no API server, so accounts, the shared community and live weather are left out.
// Progress, profiles and the shop stay in the visitor's browser (localStorage), like the classic site on its own.
export const STATIC = import.meta.env.VITE_STATIC === "1";
