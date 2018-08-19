import * as QueryString from 'qs'
import { defer, throwError, Observable } from 'rxjs'
import { catchError, timeout } from 'rxjs/operators'

import { Args } from './model'
import { buildQueryString, selectFecthModule } from './util'


/**
 * fetch wrapper
 *
 * parameter init ignored during parameter input is typeof Request
 */
export function _fetch(
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


/** Create Observable Request */
export function createObbRequest(
  input: Request | string,
  args: Args,
  requestInit: RequestInit,
): Observable<Response> {

  const fetchModule = selectFecthModule(args.fetchModule)

  if (typeof input === 'string') {
    /* istanbul ignore else */
    if (typeof args.data !== 'undefined') {
      if (args.processData) {
        if (['GET', 'DELETE'].includes(<string> requestInit.method)) {
          input = buildQueryString(input, args.data)
        }
        else {
          requestInit.body = QueryString.stringify(args.data)
        }
      }
      else {
        requestInit.body = <any> args.data
      }
    }

    return defer(() => fetchModule(input, requestInit))
  }
  else {
    return defer(() => fetchModule(<Request> input))
  }
}


export function parseRequestStream(
  request$: Observable<Response>,
  args: Args,
): Observable<Response> {

  const req$ = parseTimeout(request$, args.timeout, args.abortController)
  return req$
}


function parseTimeout(
  request$: Observable<Response>,
  timeoutValue: Args['timeout'],
  abortController: Args['abortController'],
): Observable<Response> {

  /* istanbul ignore else */
  if (typeof timeoutValue === 'number' && timeoutValue >= 0) {
    request$ = request$.pipe(
      timeout(timeoutValue),
      catchError(err => {
        // test by test_browser/30_request.test.ts
        /* istanbul ignore next */
        if (abortController && ! abortController.signal.aborted) {
          abortController.abort()
        }
        throw err
      }),
    )
  }

  return request$
}