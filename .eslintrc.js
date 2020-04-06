module.exports = {
  root: true,
  globals: {
    _DEV_: 'readonly',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      plugins: ['@typescript-eslint', 'prettier'],
      rules: {
        'prettier/prettier': 'error',
      },
    },
    {
      files: ['*.js'],
      parser: 'babel-eslint',
      extends: ['eslint:recommended', 'plugin:prettier/recommended'],
      plugins: ['prettier'],
    },
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module',
      },
      extends: [
        'eslint:recommended',
        'plugin:vue/recommended',
        'plugin:prettier/recommended',
        'prettier/vue',
      ],
      plugins: ['vue', 'prettier'],
    },
  ],
};
