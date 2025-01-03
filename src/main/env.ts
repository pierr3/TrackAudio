/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// env.ts
const _v = (i: string) => Buffer.from(i, 'base64').toString('utf8');

const _p = {
  _a: _v('VklURV9BRlZfVVJM'),
  _b: _v('VklURV9ERUJVR19DQUxMU0lHTg=='),
  _c: _v('VklURV9ERUJVR19DSUQ='),
  _d: _v('VklURV9ERUJVR19GUkVR'),
  _e: _v('VklURV9ERUJVR19MQVQ='),
  _f: _v('VklURV9ERUJVR19MT04='),
  _g: _v('VklURV9ERUJVR19JU19BVEM=')
};

const _n = (v: string | undefined) => (v ? Number(v) : undefined);
const _b = (v: string | undefined) => v?.toLowerCase() === 'true';

export const _getEnv = () => {
  const e = import.meta.env;
  return {
    [_p._a]: e[_p._a],
    [_p._b]: e[_p._b],
    [_p._c]: e[_p._c],
    [_p._d]: _n(e[_p._d]),
    [_p._e]: _n(e[_p._e]),
    [_p._f]: _n(e[_p._f]),
    [_p._g]: _b(e[_p._g])
  };
};

export const ENV = _getEnv();
