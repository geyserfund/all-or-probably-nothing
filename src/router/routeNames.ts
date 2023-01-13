import Vue from 'vue';

export interface IRouteNames {
  home: string;

  create: string;
  contribute: string;
}

const routesNames: Readonly<IRouteNames> = {
  home: 'home',

  create: 'create',
  contribute: 'contribute',
};

export default routesNames;
