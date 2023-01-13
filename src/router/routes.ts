import { RouteRecordRaw } from 'vue-router';

import RouteNames from './routeNames';

export const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: RouteNames.home,
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/create',
    name: RouteNames.create,
    component: () => import('@/views/Create.vue'),
  },
  {
    path: '/contribute/:id',
    name: RouteNames.contribute,
    component: () => import('@/views/Contribute.vue'),
  },
  // {
  //   path: '*',
  //   redirect: { name: RouteNames.home },
  // },
];
