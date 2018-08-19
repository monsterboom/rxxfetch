import { of, throwError, Observable } from 'rxjs'
import { concatMap, switchMap } from 'rxjs/operators'

import { initialRxRequestInit } from './config'
import { Args, ObbRetType, RxRequestInit } from './model'
import { createObbRequest, parseRequestStream } from './request'
import { handleResponseError, parseResponseType, parseRespCookie } from './response'
import { parseInitOpts, splitInitArgs } from './util'


/**
 * Observable fetch
 *
 * parameter init ignored during parameter input is typeof Request
 */
export function rxfetch<T extends ObbRetType = ObbRetType>(
  input: Request | string,
  init?: RxRequestInit,
): Observable<T> {

  /* istanbul ignore else */
  if (! input) {
    throwError(new TypeError('value of input invalid'))
  }
  const initOpts: RxRequestInit = init ? { ...initialRxRequestInit, ...init } : { ...initialRxRequestInit }
  const options = splitInitArgs(initOpts)
  const { args, requestInit } = parseInitOpts(options)
  const dataType: RxRequestInit['dataType'] = args.dataType
  const req$ = _fetch(input, args, requestInit)
  const ret$ = req$.pipe(
    concatMap(res => handleRedirect(res, args, requestInit)),
    concatMap(handleResponseError),
    switchMap<Response, T>(res => parseResponseType(res, dataType)),
  )

  return ret$
}


/** Observable GET method of fetch() */
export function get<T extends ObbRetType = ObbRetType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'GET'
  }
  else {
    init = { method: 'GET' }
  }
  return rxfetch(input, init)
}


/** Observable POST method of fetch() */
export function post<T extends ObbRetType = ObbRetType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'POST'
  }
  else {
    init = { method: 'POST' }
  }
  return rxfetch(input, init)
}


/** Observable PUT method of fetch() */
export function put<T extends ObbRetType = ObbRetType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'PUT'
  }
  else {
    init = { method: 'PUT' }
  }
  return rxfetch(input, init)
}


/** Observable DELETE method of fetch() */
export function remove<T extends ObbRetType = ObbRetType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'DELETE'
  }
  else {
    init = { method: 'DELETE' }
  }
  return rxfetch(input, init)
}


/** Update initialRxRequestInit */
export function setGloalRequestInit(config: Partial<RxRequestInit>): void {
  for (const [key, value] of Object.entries(config)) {
    Object.defineProperty(initialRxRequestInit, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    })
  }
}

/** Get copy of initialRxRequestInit */
export function getGloalRequestInit(): Readonly<RxRequestInit> {
  return { ...initialRxRequestInit }
}


/**
 * fetch wrapper
 *
 * parameter init ignored during parameter input is typeof Request
 */
function _fetch(
  input: Request | string,
  args: Args,
  requestInit: RequestInit,
): Observable<Response> {

  /* istanbul ignore else */
  if (! input) {
    throwError(new TypeError('value of input invalid'))
  }

  let req$ = createObbRequest(input, args, requestInit)
  req$ = parseRequestStream(req$, args)

  return req$
}


/**
 * Handle redirect case to retrieve cookies before jumping under Node.js.
 * There's no effect under Browser
 *
 * docs: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
function handleRedirect(resp: Response, args: Args, init: RequestInit): Observable<Response> {
  /* istanbul ignore else */
  if (args.keepRedirectCookies === true && resp.status >= 301 && resp.status <= 308) {
    const url = resp.headers.get('location')
    const cookie = resp.headers.get('Set-Cookie')

    /* istanbul ignore if */
    if (! url) {
      throwError('Redirect location is empty')
    }
    else {
      const cookieObj = parseRespCookie(cookie)
      if (cookieObj) {
        args.cookies = args.cookies
          ? { ...args.cookies, ...cookieObj }
          : { ...cookieObj }
      }
      const options = parseInitOpts({ args, requestInit: init })

      if (resp.status === 303) {
        const ps = <RxRequestInit> { ...options.requestInit, ...options.args }
        return get(url, ps)
      }
      else {
        return _fetch(url, options.args, options.requestInit)
      }
    }
  }
  return of(resp)
}
