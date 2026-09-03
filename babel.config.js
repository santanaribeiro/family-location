module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Transforma `import.meta` (ex.: build ESM da zustand) para não quebrar o bundle web.
    plugins: ['babel-plugin-transform-import-meta'],
  };
};
