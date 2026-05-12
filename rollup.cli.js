import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/cli/index.ts',
  output: {
    file: 'dist/cli/index.cjs',
    format: 'cjs'
  },
  onwarn(warning) {
    if (warning.code !== 'THIS_IS_UNDEFINED') {
      console.error(`(!) ${warning.message}`);
    }
  },
  plugins: [
    replace({preventAssignment: false, 'Reflect.decorate': 'undefined'}),
    typescript({
      declaration: false,
      declarationMap: false,
      outDir: 'dist/cli',
    }),
    commonjs(),
    resolve(),
  ],
};
