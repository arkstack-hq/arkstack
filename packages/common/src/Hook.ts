// `Hook` is a single process-wide registry owned by @arkstack/foundry. This
// package used to ship its own copy (a second, separate registry), so hooks
// registered through one import never reached code reading the other.
export { Hook } from '@arkstack/foundry'
