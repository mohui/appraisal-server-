import * as Handlebars from 'handlebars';
import * as Helpers from 'handlebars-helpers';
import {helpers as customHelpers} from './helpers';

const instance = Handlebars.create();

instance.registerHelper({
  ...Helpers(),
  ...customHelpers
});

export const engine = instance;
