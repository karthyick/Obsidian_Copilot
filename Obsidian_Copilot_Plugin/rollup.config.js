import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

const isProduction = process.env.BUILD === 'production';

export default {
    input: 'main.ts',
    output: {
        dir: '.',
        sourcemap: isProduction ? false : true,
        format: 'cjs', // CommonJS format for Obsidian plugins
        exports: 'default',
    },
    plugins: [
        typescript(),
        nodeResolve({ browser: true }),
        commonjs(),
    ],
    external: ['obsidian'], // Mark obsidian as external to prevent bundling
};
