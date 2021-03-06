import { throwError, Observable } from 'rxjs'
import { concatMap } from 'rxjs/operators'

import { initialRxRequestInit } from './config'
import { JsonType, ObbRetType, RxRequestInit } from './model'
import { _fetch } from './request'
import { handleResponseError, parseResponseType } from './response'
import { parseInitOpts, splitInitArgs } from './util'


/**
 * Observable fetch
 *
 * parameter init ignored during parameter input is typeof Request
 */
export function rxfetch<T extends ObbRetType = JsonType>(
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
  const dataType = <NonNullable<RxRequestInit['dataType']>> args.dataType
  const req$ = _fetch(input, args, requestInit)
  const ret$ = req$.pipe(
    concatMap(res => handleResponseError(res, dataType === 'bare')),
    concatMap(res => <Observable<T>> parseResponseType(res, dataType)),
  )

  return ret$
}


/** Observable GET method of fetch() */
export function get<T extends ObbRetType = JsonType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'GET'
  }
  else {
    init = { method: 'GET' }
  }
  return rxfetch<T>(input, init)
}


/** Observable POST method of fetch() */
export function post<T extends ObbRetType = JsonType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'POST'
  }
  else {
    init = { method: 'POST' }
  }
  return rxfetch<T>(input, init)
}


/** Observable PUT method of fetch() */
export function put<T extends ObbRetType = JsonType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'PUT'
  }
  else {
    init = { method: 'PUT' }
  }
  return rxfetch<T>(input, init)
}


/** Observable DELETE method of fetch() */
export function remove<T extends ObbRetType = JsonType>(input: string, init?: RxRequestInit): Observable<T> {
  /* istanbul ignore else */
  if (init) {
    init.method = 'DELETE'
  }
  else {
    init = { method: 'DELETE' }
  }
  return rxfetch<T>(input, init)
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

