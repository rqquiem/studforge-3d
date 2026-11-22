declare module 'fengari' {
  export const FENGARI_VERSION: string;
  export function to_luastring(str: string): Uint8Array;
  export function to_jsstring(luastring: Uint8Array | unknown): string;

  export type LuaState = Record<string, unknown>;

  export const lua: {
    LUA_OK: number;
    LUA_YIELD: number;
    LUA_ERRRUN: number;
    LUA_ERRSYNTAX: number;
    LUA_ERRMEM: number;
    LUA_ERRERR: number;
    LUA_MULTRET: number;
    LUA_TNIL: number;
    LUA_TBOOLEAN: number;
    LUA_TLIGHTUSERDATA: number;
    LUA_TNUMBER: number;
    LUA_TSTRING: number;
    LUA_TTABLE: number;
    LUA_TFUNCTION: number;
    LUA_TUSERDATA: number;
    LUA_TTHREAD: number;
    lua_type(L: LuaState, idx: number): number;
    lua_gettop(L: LuaState): number;
    lua_settop(L: LuaState, idx: number): void;
    lua_pop(L: LuaState, n: number): void;
    lua_pushvalue(L: LuaState, idx: number): void;
    lua_pushnil(L: LuaState): void;
    lua_pushboolean(L: LuaState, b: boolean | number): void;
    lua_pushnumber(L: LuaState, n: number): void;
    lua_pushinteger(L: LuaState, n: number): void;
    lua_pushstring(L: LuaState, s: Uint8Array): void;
    lua_pushjsfunction(L: LuaState, fn: (L: LuaState) => number): void;
    lua_pushjsclosure(L: LuaState, fn: (L: LuaState) => number, n: number): void;
    lua_newtable(L: LuaState): void;
    lua_createtable(L: LuaState, narr: number, nrec: number): void;
    lua_getfield(L: LuaState, idx: number, k: Uint8Array): number;
    lua_setfield(L: LuaState, idx: number, k: Uint8Array): void;
    lua_gettable(L: LuaState, idx: number): number;
    lua_settable(L: LuaState, idx: number): void;
    lua_rawgeti(L: LuaState, idx: number, n: number): number;
    lua_rawseti(L: LuaState, idx: number, n: number): void;
    lua_rawlen(L: LuaState, idx: number): number;
    lua_next(L: LuaState, idx: number): number;
    lua_setmetatable(L: LuaState, idx: number): number;
    lua_getmetatable(L: LuaState, idx: number): number;
    lua_getglobal(L: LuaState, name: Uint8Array): number;
    lua_setglobal(L: LuaState, name: Uint8Array): void;
    lua_toboolean(L: LuaState, idx: number): boolean;
    lua_tonumber(L: LuaState, idx: number): number;
    lua_tointeger(L: LuaState, idx: number): number;
    lua_tojsstring(L: LuaState, idx: number): string | null;
    lua_tostring(L: LuaState, idx: number): Uint8Array | null;
    lua_isfunction(L: LuaState, idx: number): boolean;
    lua_isnumber(L: LuaState, idx: number): boolean;
    lua_isstring(L: LuaState, idx: number): boolean;
    lua_istable(L: LuaState, idx: number): boolean;
    lua_isnil(L: LuaState, idx: number): boolean;
    lua_pcall(L: LuaState, nargs: number, nresults: number, errfunc: number): number;
    lua_call(L: LuaState, nargs: number, nresults: number): void;
    lua_newthread(L: LuaState): LuaState;
    lua_resume(L: LuaState, from: LuaState | null, nargs: number): number;
    lua_xmove(from: LuaState, to: LuaState, n: number): void;
    lua_upvalueindex(i: number): number;
    lua_seti(L: LuaState, idx: number, n: number): void;
    lua_geti(L: LuaState, idx: number, n: number): number;
    lua_newuserdata(L: LuaState, val: unknown): unknown;
    lua_touserdata(L: LuaState, idx: number): unknown;
  };

  export const lauxlib: {
    luaL_newstate(): LuaState;
    luaL_loadstring(L: LuaState, s: Uint8Array): number;
    luaL_loadbuffer(L: LuaState, s: Uint8Array, sz: number, name: Uint8Array): number;
    luaL_ref(L: LuaState, t: number): number;
    luaL_unref(L: LuaState, t: number, ref: number): void;
    luaL_error(L: LuaState, fmt: Uint8Array, ...args: unknown[]): number;
  };

  export const lualib: {
    luaL_openlibs(L: LuaState): void;
  };
}
