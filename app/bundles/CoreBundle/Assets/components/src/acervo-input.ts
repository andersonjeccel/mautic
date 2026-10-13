import { register } from './lifecycle';
import { FieldControl } from './shared/field-control';

register('AcervoInput', '[data-component="acervo-input"]', (element) => new FieldControl(element as HTMLInputElement));
