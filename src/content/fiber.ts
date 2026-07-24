/**
 * React Fiber prop spelunking.
 *
 * Instagram renders posts with React; the DOM carries no stable id, but the
 * attached Fiber props (`__reactProps$…` keys) expose the media's pk / id /
 * shortcode. We read those props and walk up the DOM to resolve the post a
 * given element belongs to, cross-referencing the capture store's indexes.
 */
import { store } from './mediaStore';
import type { InstagramMediaItem } from '../shared/types/instagram';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Return the React props object attached to a DOM node, if any. */
export function getReactProps(node: Element): Raw | null {
  for (const key in node) {
    if (key.startsWith('__reactProps$')) return (node as Raw)[key];
  }
  return null;
}

/** Extract the shortcode (last path segment) from an Instagram href. */
export function shortcodeFromHref(href: string): InstagramMediaItem | null {
  const code = href.split('/').filter(Boolean).pop();
  return code ? store.getByCode(code) ?? null : null;
}

/** Climb ancestors (up to `maxHops`) until one matches `selector`. */
export function closest(
  element: Element | null,
  selector: string,
  maxHops = 15,
): Element | null {
  let el: Element | null = element;
  let hops = maxHops;
  while (el && !el.matches(selector)) {
    el = el.parentElement;
    if (!el || (el as Node) === document) return null;
    if (hops-- < 0) return null;
  }
  return el;
}

/** Nearest ancestor anchor that is a role=link with an href. */
export function closestLink(element: Element): Element | null {
  return closest(element, "a[role='link'][href]");
}

/**
 * Resolve the post an element belongs to by walking up the Fiber tree.
 * Checks the same prop shapes the original relied on, in priority order.
 */
export function resolveViaFiber(
  startNode: Element | null,
  maxDepth: number,
): InstagramMediaItem | null {
  let node: Element | null = startNode;
  for (let depth = 0; depth <= maxDepth && node; depth++) {
    const props = getReactProps(node);
    if (!props) {
      node = node.parentElement;
      continue;
    }

    const child = props.children?.props;
    if (child) {
      if (child?.coreVideoPlayerMetaData?.videoFBID) {
        return store.getByPk(child.coreVideoPlayerMetaData.videoFBID) ?? null;
      }
      if (child?.videoFBID) return store.getByPk(child.videoFBID) ?? null;
      if (child?.media$key?.id) return store.getById(child.media$key.id) ?? null;
      if (child?.post?.id) return store.getByPk(child.post.id) ?? null;
      if (child?.href) return shortcodeFromHref(child.href);
      if (child?.postId) return store.getByPk(child.postId) ?? null;
      if (child?.mediaId) return store.getByPk(child.mediaId) ?? null;
      if (child?.post?.code) return store.getByCode(child.post.code) ?? null;
    }
    node = node.parentElement;
  }
  return null;
}
