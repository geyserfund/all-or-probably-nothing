import { createRouter, createWebHashHistory } from 'vue-router';

import { routes } from './routes';
import RouteNames from './routeNames';

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  next();
});

export { RouteNames };
export default router;
