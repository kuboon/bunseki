let dateNow = () => Date.now();
export function _setNow(fn: () => number) {
  dateNow = fn;
}
export { dateNow };
