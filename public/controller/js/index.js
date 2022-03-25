import Controller from './controller.js';
import View from './view.js';
import Service from './service.js';

Controller.initialize({
  view: new View(),
  service: new Service(),
});
