import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  it('should return "Trekko API ready"', () => {
    const appController = new AppController(new AppService());
    expect(appController.getHello()).toBe('Trekko API ready');
  });
});
