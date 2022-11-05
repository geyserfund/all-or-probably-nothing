import Vue from 'vue';

export interface IRouteNames {
  home: string;

  create: string;
}

const routesNames: Readonly<IRouteNames> = {
  home: 'home',

  create: 'create',
};

export default routesNames;
