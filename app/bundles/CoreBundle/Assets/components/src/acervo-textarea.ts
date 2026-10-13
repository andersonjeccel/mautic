import { register } from './lifecycle';
import { FieldControl } from './shared/field-control';

register('AcervoTextarea', '[data-component="acervo-textarea"]', (element) => new FieldControl(element as HTMLTextAreaElement));
