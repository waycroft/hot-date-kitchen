await Bun.build({
  entrypoints: ['./src/index.js'],
  outdir: 'dist',
  target: 'bun'
});
