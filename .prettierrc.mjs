import base from '@homer0/prettier-config' with { type: 'json' };

export default {
  ...base,
  plugins: ['@homer0/prettier-plugin-jsdoc'],
};
