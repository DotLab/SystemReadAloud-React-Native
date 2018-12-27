// @flow

export function startAsync/*:: <T> */(handler /*: (resolve: (T) => any, reject?: Function) => any */) /*: Promise<T> */ {
    return new Promise((resolve, reject) => {
        setTimeout(() => handler(resolve, reject), 0);
    });
}